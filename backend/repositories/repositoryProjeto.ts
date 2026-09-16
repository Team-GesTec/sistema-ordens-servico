/**
 * repositories/repositoryProjeto.ts
 *
 * Acesso a dados de Projeto: ÚNICO lugar que fala com `prisma.projetos` e com a tabela de
 * ligação `prisma.projetos_departamentos`.
 *
 * No banco, os departamentos de um projeto ficam em `projetos_departamentos`. Para a API (e para
 * o cache), o projeto é "achatado" num único objeto com `departamentos: number[]`.
 */
import { prisma } from '../prisma/client';
import { projetoCache } from '../cache/projetoCache';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type { projetos } from '../prisma/generated/client';
import type { DadosAtualizacaoProjeto, DadosCriacaoProjeto, Projeto } from '../models/modelProjeto';

/** O que o Prisma deve trazer junto com o projeto: só os ids dos departamentos ligados. */
const INCLUIR_DEPARTAMENTOS = {
    projetos_departamentos: {
        select: { departamento_id: true },
        orderBy: { departamento_id: 'asc' },
    },
} as const;

/** Formato em que o Prisma devolve o projeto com o `include` acima. */
type ProjetoDoBanco = projetos & { projetos_departamentos: { departamento_id: number }[] };

/** Mensagem para quando `cliente_id` ou algum departamento não existe. */
const REFERENCIA_INVALIDA = 'cliente_id ou algum id em departamentos não existe';

/**
 * Converte o registro do Prisma (com a tabela de ligação) no formato da API.
 * @param registro Projeto vindo do Prisma com `projetos_departamentos`.
 */
function paraProjeto(registro: ProjetoDoBanco): Projeto {
    const { projetos_departamentos: ligacoes, ...dados } = registro;
    return { ...dados, departamentos: ligacoes.map((ligacao) => ligacao.departamento_id) };
}

/**
 * Monta os registros da tabela de ligação para um `create` aninhado.
 * @param departamentos Ids dos departamentos envolvidos.
 */
function ligacoesDepartamentos(departamentos: number[]): { departamento_id: number }[] {
    return departamentos.map((departamento_id) => ({ departamento_id }));
}

export class RepositoryProjeto {
    /** Lista todos os projetos com seus departamentos (cache → banco). */
    async listar(): Promise<Projeto[]> {
        return projetoCache.obterTodos(async () => {
            const registros = await prisma.projetos.findMany({
                include: INCLUIR_DEPARTAMENTOS,
                orderBy: { id: 'asc' },
            });
            return registros.map(paraProjeto);
        });
    }

    /** Busca um projeto pelo id (cache → banco). Devolve `null` se não existir. */
    async buscarPorId(id: number): Promise<Projeto | null> {
        return projetoCache.obterPorId(id, async () => {
            const registro = await prisma.projetos.findUnique({ where: { id }, include: INCLUIR_DEPARTAMENTOS });
            return registro ? paraProjeto(registro) : null;
        });
    }

    /**
     * Cria o projeto e as ligações com os departamentos numa única operação
     * (o Prisma executa o create aninhado dentro de uma transação).
     */
    async criar(dados: DadosCriacaoProjeto): Promise<Projeto> {
        const { departamentos, ...campos } = dados;
        try {
            const criado = await prisma.projetos.create({
                data: { ...campos, projetos_departamentos: { create: ligacoesDepartamentos(departamentos) } },
                include: INCLUIR_DEPARTAMENTOS,
            });
            const projeto = paraProjeto(criado);
            projetoCache.definir(projeto);
            return projeto;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { referenciaInvalida: REFERENCIA_INVALIDA });
        }
    }

    /**
     * Atualiza os campos informados. Se `departamentos` vier, a lista antiga é substituída pela nova
     * dentro de uma transação (apaga as ligações antigas e cria as novas — tudo ou nada).
     */
    async atualizar(id: number, dados: DadosAtualizacaoProjeto): Promise<Projeto> {
        const { departamentos, ...campos } = dados;
        try {
            let registro: ProjetoDoBanco;
            if (departamentos === undefined) {
                registro = await prisma.projetos.update({ where: { id }, data: campos, include: INCLUIR_DEPARTAMENTOS });
            } else {
                const [, atualizado] = await prisma.$transaction([
                    prisma.projetos_departamentos.deleteMany({ where: { projeto_id: id } }),
                    prisma.projetos.update({
                        where: { id },
                        data: { ...campos, projetos_departamentos: { create: ligacoesDepartamentos(departamentos) } },
                        include: INCLUIR_DEPARTAMENTOS,
                    }),
                ]);
                registro = atualizado;
            }
            const projeto = paraProjeto(registro);
            projetoCache.definir(projeto);
            return projeto;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Projeto não encontrado',
                referenciaInvalida: REFERENCIA_INVALIDA,
            });
        }
    }

    /**
     * Remove o projeto e suas ligações com departamentos numa transação.
     * Bloqueado (409) se ainda houver O.S. ligadas ao projeto.
     */
    async remover(id: number): Promise<void> {
        try {
            await prisma.$transaction([
                prisma.projetos_departamentos.deleteMany({ where: { projeto_id: id } }),
                prisma.projetos.delete({ where: { id }, select: { id: true } }),
            ]);
            projetoCache.remover(id);
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Projeto não encontrado',
                referenciaEmUso: 'Não é possível excluir: o projeto ainda tem O.S. vinculadas',
            });
        }
    }
}

/** Instância única usada pelos services. */
export const repositoryProjeto = new RepositoryProjeto();
