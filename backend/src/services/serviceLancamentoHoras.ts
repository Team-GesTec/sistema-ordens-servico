/**
 * services/serviceLancamentoHoras.ts
 * Registro de horas gastas na O.S. (US#2.7): valida, grava o lançamento e a auditoria na mesma transação.
 * Também lista os lançamentos com o total calculado no banco (reaproveitado pelas US#2.8 e 2.10).
 */
import { prisma } from '../prisma/client';
import type { ordens_servico, Prisma } from '../prisma/generated/client';
import { AppError } from '../errors/AppError';
import { bloquearOrdemServico } from '../utils/projetoOsInvariant';
import { duracaoParaMinutos, minutosParaDuracao } from '../utils/duracao';
import { lerCorpo, type CorpoRequisicao } from '../utils/validacao';
import { serviceAuditoria } from './serviceAuditoria';

/** Data de hoje (AAAA-MM-DD) no horário do Brasil. */
function hojeNoBrasil(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function lerDataTrabalho(valor: unknown): Date {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        throw new AppError('data_trabalho é obrigatória no formato AAAA-MM-DD', 422);
    }
    const data = new Date(`${valor}T00:00:00.000Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) {
        throw new AppError('data_trabalho não é uma data válida', 422);
    }
    if (valor > hojeNoBrasil()) {
        throw new AppError('data_trabalho não pode estar no futuro', 422);
    }
    return data;
}

export class ServiceLancamentoHoras {
    /** Grava o lançamento e a auditoria. Precisa ser chamado dentro de uma transação. */
    async gravarNaTransacao(
        ordem: Pick<ordens_servico, 'id' | 'ativo' | 'status'>,
        funcionarioId: number,
        corpo: CorpoRequisicao,
        conexao: Prisma.TransactionClient,
    ) {
        if (!ordem.ativo) {
            throw AppError.requisicaoInvalida(`A O.S. ${ordem.id} está inativa e não aceita registro de horas`);
        }

        const minutos = duracaoParaMinutos(corpo.duracao);
        const dataTrabalho = lerDataTrabalho(corpo.data_trabalho);

        const lancamento = await conexao.lancamentos_horas.create({
            data: {
                os_id: ordem.id,
                funcionario_id: funcionarioId,
                minutos,
                data_trabalho: dataTrabalho,
                status_os: ordem.status,
            },
        });

        await serviceAuditoria.registrar(
            {
                os_id: ordem.id,
                funcionario_id: funcionarioId,
                acao: 'insercao',
                campo_alterado: 'horas',
                dado_antigo: null,
                dado_novo: String(minutos),
                justificativa: `Registro de horas do trabalho em ${dataTrabalho.toISOString().slice(0, 10)}`,
            },
            conexao,
        );

        return lancamento;
    }

    /** Registro de horas pela rota própria: só o responsável pela O.S. */
    async registrar(osId: number, corpo: unknown, usuarioId: number) {
        return prisma.$transaction(async (conexao) => {
            await bloquearOrdemServico(conexao, osId);
            const ordem = await conexao.ordens_servico.findUnique({ where: { id: osId } });

            if (!ordem) {
                throw AppError.naoEncontrado(`O.S. ${osId} não encontrada`);
            }
            if (ordem.responsavel_id !== usuarioId) {
                throw AppError.acessoNegado('Apenas o responsável pela O.S. pode registrar horas');
            }

            return this.gravarNaTransacao(ordem, usuarioId, lerCorpo(corpo), conexao);
        });
    }

    /** Lista os lançamentos da O.S. com o total, do mais recente ao mais antigo. */
    async listarPorOrdem(osId: number) {
        const ordem = await prisma.ordens_servico.findUnique({
            where: { id: osId },
            select: { id: true },
        });
        if (!ordem) {
            throw AppError.naoEncontrado(`O.S. ${osId} não encontrada`);
        }

        const [lancamentos, soma] = await prisma.$transaction([
            prisma.lancamentos_horas.findMany({
                where: { os_id: osId },
                orderBy: [{ data_trabalho: 'desc' }, { id: 'desc' }],
                include: { funcionarios: { select: { id: true, nome: true } } },
            }),
            prisma.lancamentos_horas.aggregate({
                where: { os_id: osId },
                _sum: { minutos: true },
            }),
        ]);

        const totalMinutos = soma._sum.minutos ?? 0;

        return {
            total_minutos: totalMinutos,
            total_duracao: minutosParaDuracao(totalMinutos),
            lancamentos: lancamentos.map((lancamento) => ({
                id: lancamento.id,
                data_trabalho: lancamento.data_trabalho.toISOString().slice(0, 10),
                minutos: lancamento.minutos,
                duracao: minutosParaDuracao(lancamento.minutos),
                status_os: lancamento.status_os,
                autor: lancamento.funcionarios,
                registrado_em: lancamento.criado_em,
            })),
        };
    }
}

export const serviceLancamentoHoras = new ServiceLancamentoHoras();
