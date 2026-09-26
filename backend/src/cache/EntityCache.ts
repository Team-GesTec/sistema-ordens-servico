/**
 * cache/EntityCache.ts
 *
 * Cache genérico e reutilizável, em memória, para qualquer entidade ligada ao Prisma.
 *
 * ESTRATÉGIA: write-through (decisão do time — ver CLAUDE.md).
 *   - Escrita: o repository grava no Postgres primeiro; só depois que o Prisma confirma é que chama
 *     `definir`/`remover`. O cache nunca guarda um valor que o banco não confirmou.
 *   - Leitura: `obterTodos`/`obterPorId` respondem da memória quando possível e só vão ao banco
 *     em caso de ausência (cache miss) ou expiração.
 *
 * ALTERAÇÕES em 16/09/2026 (em relação à primeira versão):
 *   1. TTL (tempo de vida): cada entrada expira depois de `ttlMs`. Isso limita por quanto tempo o
 *      cache pode ficar desatualizado quando alguém altera o banco por fora da API (painel do
 *      Supabase, outra instância da API...).
 *   2. Correção de condição de corrida: antes, se uma leitura estivesse aguardando o banco e uma
 *      escrita terminasse nesse meio-tempo, a leitura podia gravar no cache um dado já velho
 *      (ex.: um registro recém-excluído "voltava"). Agora cada escrita incrementa `versao`; uma
 *      leitura só popula o cache se a versão não mudou enquanto ela esperava o banco.
 *   3. Ordenação opcional (`comparar`), para as listagens saírem sempre na mesma ordem.
 *
 * CUIDADO: os objetos devolvidos são os mesmos guardados no cache. Não altere esses objetos
 * diretamente — crie uma cópia (`{ ...item }`) se precisar modificar algo antes de responder.
 *
 * LIMITAÇÃO CONHECIDA: o cache vive na memória de UM processo. Com várias instâncias da API, cada
 * uma tem o seu, e elas só convergem pelo TTL. Se isso virar problema, o caminho é um cache
 * compartilhado (ex.: Redis) — não remendar esta classe.
 */

/** Um item guardado no cache e o instante (ms) em que ele deixa de valer. */
interface EntradaCache<T> {
    valor: T;
    expiraEm: number;
}

/** Opções de configuração do cache. */
export interface OpcoesEntityCache<T> {
    /** Tempo de vida de cada entrada, em ms. `0` (padrão) = não expira por tempo. */
    ttlMs?: number;
    /** Função de ordenação aplicada em `obterTodos` (ex.: `(a, b) => a.id - b.id`). */
    comparar?: (a: T, b: T) => number;
    /** Relógio usado para calcular expiração — pode ser trocado nos testes. Padrão: `Date.now`. */
    agora?: () => number;
}

export class EntityCache<T, ID = number> {
    private readonly obterId: (item: T) => ID;
    private readonly ttlMs: number;
    private readonly comparar: ((a: T, b: T) => number) | undefined;
    private readonly agora: () => number;
    private readonly itens = new Map<ID, EntradaCache<T>>();
    /** Até quando a lista completa em memória é confiável. `0` = lista completa nunca carregada. */
    private listaCompletaValidaAte = 0;
    /** Contador de escritas; usado para descartar leituras que ficaram desatualizadas no caminho. */
    private versao = 0;

    /**
     * Cria um cache.
     * @param obterId Função que extrai a chave (id) de um item. Ex.: `(cliente) => cliente.id`.
     * @param opcoes TTL, ordenação e relógio (ver `OpcoesEntityCache`).
     */
    constructor(obterId: (item: T) => ID, opcoes: OpcoesEntityCache<T> = {}) {
        this.obterId = obterId;
        this.ttlMs = opcoes.ttlMs ?? 0;
        this.comparar = opcoes.comparar;
        this.agora = opcoes.agora ?? Date.now;
    }

    /** Quantidade de itens guardados no momento (útil em testes e diagnóstico). */
    get tamanho(): number {
        return this.itens.size;
    }

    /**
     * Devolve todos os itens.
     * Usa a memória se a lista completa já foi carregada e ainda é válida; senão, chama
     * `buscarTodos` (normalmente um `prisma.<tabela>.findMany()`) e repovoa o cache.
     * @param buscarTodos Função que busca todos os registros no banco.
     */
    async obterTodos(buscarTodos: () => Promise<T[]>): Promise<T[]> {
        if (this.agora() < this.listaCompletaValidaAte) {
            return this.ordenar([...this.itens.values()].map((entrada) => entrada.valor));
        }

        const versaoAntesDaConsulta = this.versao;
        const itens = await buscarTodos();

        // Só substitui o cache se nenhuma escrita aconteceu enquanto o banco respondia.
        // Se aconteceu, devolve o resultado mesmo assim, e a próxima leitura recarrega.
        if (versaoAntesDaConsulta === this.versao) {
            this.itens.clear();
            const expiraEm = this.calcularExpiracao();
            for (const item of itens) {
                this.itens.set(this.obterId(item), { valor: item, expiraEm });
            }
            this.listaCompletaValidaAte = expiraEm;
        }
        return this.ordenar(itens);
    }

    /**
     * Devolve um item pelo id.
     * Usa a memória se o item estiver guardado e válido; senão, chama `buscarUm` (normalmente um
     * `prisma.<tabela>.findUnique(...)`) e guarda o resultado.
     * @param id Chave do item.
     * @param buscarUm Função que busca o registro no banco (devolve `null` se não existir).
     */
    async obterPorId(id: ID, buscarUm: () => Promise<T | null>): Promise<T | null> {
        const entrada = this.itens.get(id);
        if (entrada !== undefined && this.agora() < entrada.expiraEm) {
            return entrada.valor;
        }
        // Se a lista completa está carregada e válida, um id ausente do cache não existe no banco:
        // responde `null` sem consultar (evita ida ao banco para validar ids inexistentes).
        if (entrada === undefined && this.agora() < this.listaCompletaValidaAte) {
            return null;
        }

        const versaoAntesDaConsulta = this.versao;
        const item = await buscarUm();

        if (versaoAntesDaConsulta === this.versao) {
            if (item === null) {
                this.itens.delete(id);
            } else {
                this.itens.set(id, { valor: item, expiraEm: this.calcularExpiracao() });
            }
        }
        return item;
    }

    /**
     * Grava/substitui um item no cache.
     * Write-through: chame SÓ depois que o Prisma confirmou o create/update.
     */
    definir(item: T): void {
        this.versao += 1;
        this.itens.set(this.obterId(item), { valor: item, expiraEm: this.calcularExpiracao() });
    }

    /**
     * Remove um item do cache.
     * Write-through: chame SÓ depois que o Prisma confirmou o delete.
     */
    remover(id: ID): void {
        this.versao += 1;
        this.itens.delete(id);
    }

    /** Esvazia o cache: a próxima leitura vai ao banco. Útil após operações em lote ou em testes. */
    invalidarTudo(): void {
        this.versao += 1;
        this.itens.clear();
        this.listaCompletaValidaAte = 0;
    }

    /** Calcula o instante de expiração de uma entrada gravada agora. */
    private calcularExpiracao(): number {
        return this.ttlMs > 0 ? this.agora() + this.ttlMs : Number.POSITIVE_INFINITY;
    }

    /** Aplica a ordenação configurada (se houver) sem alterar o array original. */
    private ordenar(itens: T[]): T[] {
        return this.comparar ? [...itens].sort(this.comparar) : itens;
    }
}
