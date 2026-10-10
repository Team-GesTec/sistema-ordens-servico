/**
 * repositories/repositoryOrdemServico.ts
 *
 * Acesso a dados de OS: ÚNICO lugar que fala com `prisma.ordens_servico`.
 * Leituras passam pelo cache; escritas vão ao banco e, confirmadas, atualizam o cache.
 */

import { prisma } from '../prisma/client';
import { ordemServicoCache } from '../cache/ordemServicoCache';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type {
    OrdemServico,
    DadosCriacaoOrdemServico,
    DadosAtualizacaoOrdemServico
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

    /** Remove uma OS. Bloqueado (409) se ainda houver anexos ou funcionários ligados a ela. */
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
}

/** Instância única usada pelos services. */
export const repositoryOrdemServico = new RepositoryOrdemServico();