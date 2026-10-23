/**
 * services/serviceAnexo.ts
 *
 * Regras de negócio dos anexos de O.S. (US#2.6).
 *
 * Inclusão (2.6-BE01):
 *  - Gestor e Técnico anexam só nas O.S. que podem ver (serviceEscopoOrdemServico): fora do
 *    alcance → 403; O.S. inexistente → 404. Anexo é sempre opcional: nenhum status exige anexo;
 *  - tamanho máximo de 50 × 1024 × 1024 = 52.428.800 bytes → acima disso, 413;
 *  - tipos aceitos e quantidade máxima por O.S. vêm da configuração (env.anexos — PE-12) → 422;
 *  - a extensão e os primeiros bytes do arquivo precisam combinar com o tipo declarado → 422;
 *  - o arquivo vai para uma chave única e sanitizada do bucket (`os_{id}/{uuid}_{nome}`);
 *    o nome original fica só nos metadados;
 *  - atomicidade: valida tudo → envia ao Storage → grava metadados + auditoria numa transação.
 *    Se a transação falhar, o arquivo recém-enviado é removido do Storage (compensação).
 *    Assim, nada fica gravado quando o anexo é rejeitado.
 *
 * Consulta e download (2.6-BE02):
 *  - mesma regra de alcance: quem não pode ver a O.S. recebe 403 na listagem e no download;
 *  - a listagem devolve exatamente os anexos gravados da O.S. (nome, tamanho, autor e data);
 *  - o download só busca o arquivo no Storage depois de conferir a permissão, e confere se o
 *    tamanho entregue pelo Storage bate com o gravado (arquivo íntegro);
 *  - leitura não gera auditoria; não há exclusão de anexo.
 *
 * ALTERAÇÕES (23/10/2026):
 *  - integração com o frontend (SCRUM-118): `anexar` aceita o `relato` opcional (até 2.000
 *    caracteres), gravado no anexo e como justificativa da auditoria; `configuracaoPublica`
 *    expõe as regras do PE-12 para a tela.
 */
import type { Readable } from 'node:stream';
import { prisma } from '../prisma/client';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';
import { repositoryAnexo, type RepositoryAnexo } from '../repositories/repositoryAnexo';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import { repositoryStorageAnexo, type ArmazenamentoAnexos } from '../repositories/repositoryStorageAnexo';
import { serviceAuditoria } from './serviceAuditoria';
import {
    serviceEscopoOrdemServico,
    type ServiceEscopoOrdemServico,
    type UsuarioEscopo,
} from './serviceEscopoOrdemServico';
import {
    type AnexoResposta,
    type ArquivoRecebido,
    CAMPO_ARQUIVO_ANEXO,
    CAMPO_AUDITORIA_ANEXO,
    type ConfiguracaoAnexosResposta,
    paraAnexoResposta,
    TAMANHO_MAXIMO_ANEXO_BYTES,
    TAMANHO_MAXIMO_RELATO,
} from '../models/modelAnexo';
import type { OrdemServico } from '../models/modelOrdemServico';
import {
    assinaturaConfere,
    extensaoConfere,
    extensoesDoTipo,
    gerarCaminhoAnexo,
    limparNomeOriginal,
    normalizarTipoMime,
} from '../utils/arquivo';
import { exigirInteiroPositivo, textoOpcional } from '../utils/validacao';

/** Regras configuráveis (PE-12). */
export interface ConfiguracaoAnexos {
    tiposPermitidos: readonly string[];
    quantidadeMaximaPorOS: number;
}

/** Status HTTP para arquivo recusado por regra (tipo, conteúdo ou quantidade). */
const STATUS_NAO_PROCESSAVEL = 422;

export class ServiceAnexo {
    private readonly anexos: RepositoryAnexo;
    private readonly ordens: RepositoryOrdemServico;
    private readonly armazenamento: ArmazenamentoAnexos;
    private readonly escopo: ServiceEscopoOrdemServico;
    private readonly configuracao: ConfiguracaoAnexos;

    constructor(
        anexos: RepositoryAnexo = repositoryAnexo,
        ordens: RepositoryOrdemServico = repositoryOrdemServico,
        armazenamento: ArmazenamentoAnexos = repositoryStorageAnexo,
        escopo: ServiceEscopoOrdemServico = serviceEscopoOrdemServico,
        configuracao: ConfiguracaoAnexos = env.anexos,
    ) {
        this.anexos = anexos;
        this.ordens = ordens;
        this.armazenamento = armazenamento;
        this.escopo = escopo;
        this.configuracao = configuracao;
    }

    /**
     * Checagem feita ANTES de receber o arquivo (evita transferir até 50MB para depois responder 403/404).
     * As mesmas regras são conferidas de novo em `anexar`.
     * @throws AppError 404 se a O.S. não existir; 403 fora do alcance; 422 se a O.S. já atingiu o limite.
     */
    async verificarPermissaoParaAnexar(osId: number, usuario: UsuarioEscopo): Promise<void> {
        await this.buscarOrdemVisivel(osId, usuario);
        const quantidade = await this.anexos.contarPorOrdem(osId);
        this.exigirVaga(quantidade);
    }

    /**
     * Valida e grava um anexo na O.S.
     * @param osId Id da O.S. (vem da URL).
     * @param arquivo Arquivo recebido no campo `arquivo` do multipart (undefined se não veio).
     * @param usuario Funcionário logado (vem do token, nunca do corpo).
     * @param relato Texto opcional enviado junto com o arquivo (campo `relato` do multipart).
     * @returns Os metadados gravados (nome, tamanho, tipo, autor, data e relato).
     * @throws AppError 400 sem arquivo/arquivo vazio; 403 fora do alcance; 404 O.S. inexistente;
     *                  413 acima de 50MB; 422 tipo/conteúdo não aceito ou limite de quantidade;
     *                  503 armazenamento indisponível.
     */
    async anexar(
        osId: number,
        arquivo: ArquivoRecebido | undefined,
        usuario: UsuarioEscopo,
        relato?: unknown,
    ): Promise<AnexoResposta> {
        // 1. Valida permissão e existência da O.S.
        await this.buscarOrdemVisivel(osId, usuario);

        // 2. Valida o arquivo (tamanho, tipo e conteúdo) e o relato
        const { nome, tipo, conteudo } = this.validarArquivo(arquivo);
        const relatoValidado = textoOpcional(relato, 'relato', { maximo: TAMANHO_MAXIMO_RELATO });

        // 3. Valida a quantidade (conferida de novo, com lock, dentro da transação)
        this.exigirVaga(await this.anexos.contarPorOrdem(osId));

        // 4. Envia ao Storage numa chave única e sanitizada
        const caminho = gerarCaminhoAnexo(osId, nome);
        await this.armazenamento.enviar(caminho, conteudo, tipo);

        // 5. Metadados + auditoria na mesma transação; se falhar, remove o arquivo do Storage
        try {
            const anexo = await prisma.$transaction(async (conexao) => {
                await this.anexos.travarOrdem(osId, conexao);
                this.exigirVaga(await this.anexos.contarPorOrdem(osId, conexao));

                const criado = await this.anexos.criar(
                    {
                        os_id: osId,
                        funcionario_id: usuario.id,
                        nome,
                        tipo,
                        tamanho_bytes: BigInt(conteudo.length),
                        caminho,
                        relato: relatoValidado,
                    },
                    conexao,
                );

                await serviceAuditoria.registrar(
                    {
                        os_id: osId,
                        funcionario_id: usuario.id,
                        acao: 'insercao',
                        campo_alterado: CAMPO_AUDITORIA_ANEXO,
                        dado_antigo: null,
                        dado_novo: JSON.stringify({
                            anexo_id: criado.id,
                            nome: criado.nome,
                            tipo: criado.tipo,
                            tamanho_bytes: conteudo.length,
                        }),
                        justificativa: relatoValidado ?? 'Inclusão de anexo na O.S.',
                    },
                    conexao,
                );

                return criado;
            });
            return paraAnexoResposta(anexo);
        } catch (erro) {
            await this.compensarUpload(caminho);
            throw erro;
        }
    }

    /**
     * Regras dos anexos para a tela validar antes do envio (o backend continua validando tudo).
     * Se algum tipo configurado não tiver extensão conhecida, a lista de extensões vai vazia para a
     * tela não recusar por engano um arquivo que o backend aceitaria.
     */
    configuracaoPublica(): ConfiguracaoAnexosResposta {
        const tipos = [...this.configuracao.tiposPermitidos];
        const extensoesPorTipo = tipos.map(extensoesDoTipo);
        const todasConhecidas = extensoesPorTipo.every((extensoes) => extensoes.length > 0);

        return {
            tipos_permitidos: tipos,
            extensoes_permitidas: todasConhecidas ? [...new Set(extensoesPorTipo.flat())] : [],
            tamanho_maximo_bytes: TAMANHO_MAXIMO_ANEXO_BYTES,
            quantidade_maxima_por_os: this.configuracao.quantidadeMaximaPorOS,
            tamanho_maximo_relato: TAMANHO_MAXIMO_RELATO,
        };
    }

    /**
     * Lista os anexos de uma O.S. (somente leitura, sem auditoria).
     * @throws AppError 404 se a O.S. não existir; 403 se estiver fora do alcance do usuário.
     */
    async listar(osId: number, usuario: UsuarioEscopo): Promise<AnexoResposta[]> {
        const ordem = await this.buscarOrdemVisivel(osId, usuario);
        const anexos = await this.anexos.listarPorOrdem(ordem.id);
        return anexos.map(paraAnexoResposta);
    }

    /**
     * Abre um anexo para download (somente leitura, sem auditoria).
     * A permissão é conferida ANTES de qualquer acesso ao Storage.
     * @returns Os metadados (para os cabeçalhos da resposta) e o conteúdo como stream.
     * @throws AppError 404 se a O.S. ou o anexo não existirem; 403 fora do alcance;
     *                  503 se o Storage estiver indisponível ou entregar um arquivo diferente do gravado.
     */
    async baixar(
        osId: number,
        anexoId: number,
        usuario: UsuarioEscopo,
    ): Promise<{ anexo: AnexoResposta; conteudo: Readable }> {
        const ordem = await this.buscarOrdemVisivel(osId, usuario);
        const id = exigirInteiroPositivo(anexoId, 'anexoId');
        const anexo = await this.anexos.buscarNaOrdem(id, ordem.id);
        if (!anexo) {
            throw AppError.naoEncontrado(`Anexo ${id} não encontrado na O.S. ${ordem.id}`);
        }

        const arquivo = await this.armazenamento.baixar(anexo.caminho);
        const tamanhoGravado = Number(anexo.tamanho_bytes);
        if (arquivo.tamanho !== null && arquivo.tamanho !== tamanhoGravado) {
            arquivo.conteudo.destroy();
            console.error(
                `[anexos] tamanho divergente no Storage para o anexo ${anexo.id}: ` +
                    `gravado ${tamanhoGravado} bytes, Storage ${arquivo.tamanho} bytes (${anexo.caminho})`,
            );
            throw new AppError('Não foi possível obter o arquivo deste anexo no momento. Tente novamente.', 503);
        }

        return { anexo: paraAnexoResposta(anexo), conteudo: arquivo.conteudo };
    }

    /**
     * Busca a O.S. e confere se o usuário pode vê-la.
     * @throws AppError 404 se não existir; 403 se estiver fora do alcance do usuário.
     */
    protected async buscarOrdemVisivel(osId: number, usuario: UsuarioEscopo): Promise<OrdemServico> {
        const id = exigirInteiroPositivo(osId, 'id');
        const ordem = await this.ordens.buscarPorId(id);
        if (!ordem) {
            throw AppError.naoEncontrado(`O.S. ${id} não encontrada`);
        }
        this.escopo.exigirVisibilidade(usuario, ordem, 'Você não tem permissão para acessar os anexos desta O.S.');
        return ordem;
    }

    /** @throws AppError 422 se a O.S. já tiver a quantidade máxima de anexos. */
    private exigirVaga(quantidadeAtual: number): void {
        const maximo = this.configuracao.quantidadeMaximaPorOS;
        if (quantidadeAtual >= maximo) {
            throw new AppError(`Esta O.S. já atingiu o limite de ${maximo} anexo(s)`, STATUS_NAO_PROCESSAVEL);
        }
    }

    /** Valida o arquivo recebido e devolve nome limpo, tipo normalizado e conteúdo. */
    private validarArquivo(arquivo: ArquivoRecebido | undefined): { nome: string; tipo: string; conteudo: Buffer } {
        if (!arquivo) {
            throw AppError.requisicaoInvalida(
                `Nenhum arquivo enviado. Envie o arquivo no campo "${CAMPO_ARQUIVO_ANEXO}" de um formulário multipart/form-data`,
            );
        }

        const conteudo = arquivo.conteudo;
        if (conteudo.length === 0) {
            throw AppError.requisicaoInvalida('O arquivo enviado está vazio');
        }
        // O multer já barra antes; conferido de novo para a regra não depender só do middleware
        if (conteudo.length > TAMANHO_MAXIMO_ANEXO_BYTES) {
            throw new AppError(
                `O arquivo excede o limite de 50MB (${TAMANHO_MAXIMO_ANEXO_BYTES} bytes) por anexo`,
                413,
            );
        }

        const nome = limparNomeOriginal(arquivo.nomeOriginal);
        const tipo = normalizarTipoMime(arquivo.tipo);
        if (!this.configuracao.tiposPermitidos.includes(tipo)) {
            throw new AppError(
                `Tipo de arquivo não aceito (${tipo || 'não informado'}). Tipos aceitos: ${this.configuracao.tiposPermitidos.join(', ')}`,
                STATUS_NAO_PROCESSAVEL,
            );
        }
        if (extensaoConfere(tipo, nome) === false) {
            throw new AppError(
                `A extensão do arquivo "${nome}" não corresponde ao tipo informado (${tipo})`,
                STATUS_NAO_PROCESSAVEL,
            );
        }
        if (assinaturaConfere(tipo, conteudo) === false) {
            throw new AppError(
                `O conteúdo do arquivo não corresponde ao tipo informado (${tipo})`,
                STATUS_NAO_PROCESSAVEL,
            );
        }

        return { nome, tipo, conteudo };
    }

    /** Remove do Storage um arquivo cujo registro no banco não foi gravado (evita arquivo órfão). */
    private async compensarUpload(caminho: string): Promise<void> {
        try {
            await this.armazenamento.remover(caminho);
        } catch (erro) {
            // Não esconde o erro original: só registra para limpeza manual do bucket
            console.error(`[anexos] arquivo órfão no Storage, remova manualmente: ${caminho}`, erro);
        }
    }
}

/** Instância única usada pelo controller. */
export const serviceAnexo = new ServiceAnexo();
