/**
 * repositories/repositoryOrdemServico.ts
 *
 * Acesso a dados de OS: ÚNICO lugar que fala com `prisma.ordens_servico`.
 * Leituras passam pelo cache; escritas vão ao banco e, confirmadas, atualizam o cache.
 */


import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { ordemServicoCache } from '../cache/ordemServicoCache';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type {
    OrdemServico,
    DadosCriacaoOrdemServico,
    DadosAtualizacaoOrdemServico,
    DadosAlteracaoStatus,
} from '../models/modelOrdemServico';
import { AppError } from '../errors/AppError';

/** Mensagem para quando algum registro aponta para um id inexistente. */
const REFERENCIA_INVALIDA = 'cliente_id, departamento_id, solicitante_id, projeto_id ou anterior_id não corresponde a um registro existente';

interface DadosAtribuicaoResponsavel {
    osId: number;
    responsavelId: number;
    solicitanteId: number;
    permitirTroca: boolean;
}

interface DadosSlaManual {
    osId: number;
    dataLimiteSla: Date;
    justificativa: string;
    funcionarioId: number;
}

export class RepositoryOrdemServico {
    /** Lista todas as OS (cache → banco), mais recentes primeiro. */
    async listar(): Promise<OrdemServico[]> {
        return ordemServicoCache.obterTodos(() => prisma.ordens_servico.findMany({ orderBy: { data_criacao: 'desc' } }));
    }

    /** Busca uma ordem de serviço pelo id (cache → banco). Devolve `null` se não existir. */
    async buscarPorId(id: number): Promise<OrdemServico | null> {
        return ordemServicoCache.obterPorId(id, () => prisma.ordens_servico.findUnique({ where: { id } }));
    }

    /** Cria uma OS no banco e coloca no cache. */
    async criar(dados: DadosCriacaoOrdemServico): Promise<OrdemServico> {
        try {
            const criada = await prisma.ordens_servico.create({ data: dados });
            ordemServicoCache.definir(criada);
            return criada;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { referenciaInvalida: REFERENCIA_INVALIDA });
        }
    }

    /**
     * Cria uma OS dentro de uma transação (usado no cadastro de O.S. antiga — AJ-06).
     * Não mexe no cache: quem chama deve chamar `atualizarCache` depois que a transação terminar.
     */
    async criarNaTransacao(
        dados: DadosCriacaoOrdemServico,
        conexao: Prisma.TransactionClient,
    ): Promise<OrdemServico> {
        try {
            return await conexao.ordens_servico.create({ data: dados });
        } catch (erro) {
            throw traduzirErroPrisma(erro, { referenciaInvalida: REFERENCIA_INVALIDA });
        }
    }

    /** Atualiza os campos informados de uma OS e atualiza o cache. */
    async atualizar(id: number, dados: DadosAtualizacaoOrdemServico): Promise<OrdemServico> {
        try {
            const atualizada = await prisma.ordens_servico.update({ where: { id }, data: dados });
            ordemServicoCache.definir(atualizada);
            return atualizada;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Ordem de Serviço não encontrada',
                referenciaInvalida: REFERENCIA_INVALIDA
            });
        }
    }

    /** Remove uma O.S. e invalida o cache após a exclusão. */
    async remover(id: number): Promise<void> {
        try {
            await prisma.ordens_servico.delete({ where: { id }, select: { id: true } });
            ordemServicoCache.remover(id);
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Ordem de Serviço não encontrada',
                referenciaEmUso: 'Não é possível excluir: a OS ainda tem anexos ou funcionários vinculados.',
            });
        }
    }

    /**
     * Atualiza os campos informados de uma OS dentro de uma transação.
     * Não mexe no cache: quem chama deve chamar `atualizarCache` depois que a transação terminar.
     */
    async atualizarNaTransacao(
        id: number,
        dados: DadosAtualizacaoOrdemServico,
        conexao: Prisma.TransactionClient,
    ): Promise<OrdemServico> {
        try {
            return await conexao.ordens_servico.update({ where: { id }, data: dados });
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Ordem de Serviço não encontrada',
                referenciaInvalida: REFERENCIA_INVALIDA,
            });
        }
    }

    /** Coloca no cache a versão já gravada de uma OS. Chamar depois que a transação terminar. */
    atualizarCache(ordem: OrdemServico): void {
        ordemServicoCache.definir(ordem);
    }


    /**
     * Atribui ou substitui o responsável e registra a auditoria na mesma transação.
     * 
     * A atualização condicional impede que duas requisições sobrescrevam uma à outra.
    */
    async atribuirResponsavel(dados: DadosAtribuicaoResponsavel): Promise<OrdemServico> {
        const {
            osId,
            responsavelId,
            solicitanteId,
            permitirTroca
        } = dados;

        const atualizada = await prisma.$transaction(async (tx) => {
            // Mesmo lock usado na inativação de funcionários e na abertura de O.S. atribuída.
            // Assim a validação não corre em paralelo com a mudança ativo=true -> false.
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(734031, 3)`;
            const responsavel = await tx.funcionarios.findUnique({
                where: { id: responsavelId },
                select: { id: true, ativo: true },
            });
            if (!responsavel) {
                throw AppError.requisicaoInvalida('responsavel_id não corresponde a um funcionário existente');
            }
            if (!responsavel.ativo) {
                throw AppError.conflito('Não é possível atribuir uma O.S. a um funcionário inativo');
            }

            const ordemAtual = await tx.ordens_servico.findUnique({ where: { id: osId } });

            if (!ordemAtual) {
                throw AppError.naoEncontrado('OS não encontrada');
            }

            if (ordemAtual.status === 'concluido') {
                throw AppError.requisicaoInvalida('OS já concluída');
            }

            if (ordemAtual.responsavel_id !== null && !permitirTroca) {
                throw AppError.acessoNegado('OS já possui responsável');
            }

            const resultado = await tx.ordens_servico.updateMany({
                where: {
                    id: osId,
                    status: { not: 'concluido' },
                    responsavel_id: ordemAtual.responsavel_id
                },
                data: {
                    responsavel_id: responsavelId
                }
            });

            if (resultado.count !== 1) {
                throw AppError.conflito('Dados duplicados para atribuição de responsável');
            }

            await tx.auditoria.create({
                data: {
                    os_id: osId,
                    funcionario_id: solicitanteId,
                    acao: 'atualizacao',
                    campo_alterado: 'responsavel_id',
                    dado_antigo: ordemAtual.responsavel_id?.toString() ?? null,
                    dado_novo: responsavelId.toString()
                }
            });

            return tx.ordens_servico.findUniqueOrThrow({
                where: { id: osId }
            });
        });

        // A transação já foi confirmada, invalida o cache para que a próxima leitura busque o estado persistido.
        ordemServicoCache.remover(osId);

        return atualizada;
    }

    /** Altera manualmente o SLA e registra a auditoria na mesma transação. */
    async alterarSlaManual(dados: DadosSlaManual): Promise<OrdemServico> {
        const { osId, dataLimiteSla, justificativa, funcionarioId } = dados;

        const atualizada = await prisma.$transaction(async (tx) => {
            const ordemAtual = await tx.ordens_servico.findUnique({ where: { id: osId } });
            if (!ordemAtual) {
                throw AppError.naoEncontrado('OS não encontrada');
            }

            const resultado = await tx.ordens_servico.updateMany({
                where: {
                    id: osId,
                    data_limite_sla: ordemAtual.data_limite_sla,
                    sla_manual: ordemAtual.sla_manual,
                    justificativa_sla_manual: ordemAtual.justificativa_sla_manual,
                },
                data: {
                    data_limite_sla: dataLimiteSla,
                    sla_manual: true,
                    justificativa_sla_manual: justificativa,
                },
            });

            if (resultado.count !== 1) {
                throw AppError.conflito('O SLA foi alterado por outra operação. Tente novamente.');
            }

            const auditorias = [
                {
                    campo_alterado: 'data_limite_sla',
                    dado_antigo: ordemAtual.data_limite_sla?.toISOString() ?? null,
                    dado_novo: dataLimiteSla.toISOString(),
                },
                {
                    campo_alterado: 'sla_manual',
                    dado_antigo: String(ordemAtual.sla_manual),
                    dado_novo: 'true',
                },
                {
                    campo_alterado: 'justificativa_sla_manual',
                    dado_antigo: ordemAtual.justificativa_sla_manual,
                    dado_novo: justificativa,
                },
            ];

            await tx.auditoria.createMany({
                data: auditorias.map((auditoria) => ({
                    os_id: osId,
                    funcionario_id: funcionarioId,
                    acao: 'atualizacao',
                    ...auditoria,
                    justificativa,
                })),
            });

            return tx.ordens_servico.findUniqueOrThrow({ where: { id: osId } });
        });

        // O estado em cache só muda depois do commit da atualização e da auditoria.
        ordemServicoCache.definir(atualizada);
        return atualizada;
    }

    /** Grava o novo status e o parecer técnico de uma O.S. que já existe. */
    async atualizarStatus(
        id: number,
        dados: DadosAlteracaoStatus,
        conexao: Prisma.TransactionClient = prisma,
    ): Promise<OrdemServico> {
        const atualizada = await conexao.ordens_servico.update({
            where: { id },
            data: dados,
        });
        return atualizada;
    }
}

/** Instância única usada pelos services. */
export const repositoryOrdemServico = new RepositoryOrdemServico();
