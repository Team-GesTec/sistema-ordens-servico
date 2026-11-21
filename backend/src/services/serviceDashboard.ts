/**
 * Consolida os registros de horas do dashboard.
 * Inclui também os registros históricos da tabela antiga `apontamento_horas`;
 * a partir da migração de horas, novos lançamentos usam `lancamentos_horas`.
 * Nenhuma migração ou alteração de dados é necessária para consultar as duas fontes.
 */
import { prisma } from '../prisma/client';
import type { Funcionario } from '../models/modelFuncionario';
import type { Prisma } from '../prisma/generated/client';
import { minutosParaDuracao } from '../utils/duracao';

type UsuarioDashboard = Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>;
type AgregadoHoras = {
    id: number | null;
    nome: string;
    total_minutos: number;
};
type LancamentoRecente = {
    id: string;
    os_id: number;
    ordem_titulo: string;
    data_trabalho: string;
    minutos: number;
    duracao: string;
    funcionario: { id: number; nome: string };
    registrado_em: string;
};

function formatarAgregados(agregados: Map<number | null, AgregadoHoras>) {
    return [...agregados.values()]
        .sort((a, b) => b.total_minutos - a.total_minutos || a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((item) => ({
            ...item,
            total_horas: Number((item.total_minutos / 60).toFixed(2)),
            total_duracao: minutosParaDuracao(item.total_minutos),
        }));
}

export class ServiceDashboard {
    async listarHoras(usuario: UsuarioDashboard) {
        const where: Prisma.lancamentos_horasWhereInput = usuario.tipo === 'gestor'
            ? {}
            : usuario.tipo === 'tecnico'
                ? { funcionario_id: usuario.id }
                : { ordens_servico: { is: { departamento_id: usuario.departamento_id } } };
        const whereHistorico: Prisma.apontamento_horasWhereInput = usuario.tipo === 'gestor'
            ? {}
            : usuario.tipo === 'tecnico'
                ? { funcionario_id: usuario.id }
                : { ordens_servico: { is: { departamento_id: usuario.departamento_id } } };

        const [atuaisPorOrdem, somaAtuais, atuaisRecentes, historicosPorOrdem, somaHistoricos, historicosRecentes] = await Promise.all([
            prisma.lancamentos_horas.groupBy({
                by: ['os_id'],
                where,
                _sum: { minutos: true },
            }),
            prisma.lancamentos_horas.aggregate({
                where,
                _sum: { minutos: true },
                _count: { _all: true },
            }),
            prisma.lancamentos_horas.findMany({
                where,
                orderBy: [{ data_trabalho: 'desc' }, { criado_em: 'desc' }, { id: 'desc' }],
                take: 5,
                select: {
                    id: true,
                    os_id: true,
                    minutos: true,
                    data_trabalho: true,
                    criado_em: true,
                    funcionarios: { select: { id: true, nome: true } },
                    ordens_servico: { select: { id: true, titulo: true } },
                },
            }),
            prisma.apontamento_horas.groupBy({
                by: ['os_id'],
                where: whereHistorico,
                _sum: { duracao_minutos: true },
            }),
            prisma.apontamento_horas.aggregate({
                where: whereHistorico,
                _sum: { duracao_minutos: true },
                _count: { _all: true },
            }),
            prisma.apontamento_horas.findMany({
                where: whereHistorico,
                orderBy: [{ data_trabalho: 'desc' }, { data_criacao: 'desc' }, { id: 'desc' }],
                take: 5,
                select: {
                    id: true,
                    os_id: true,
                    duracao_minutos: true,
                    data_trabalho: true,
                    data_criacao: true,
                    funcionarios: { select: { id: true, nome: true } },
                    ordens_servico: { select: { id: true, titulo: true } },
                },
            }),
        ]);

        const minutosPorOrdem = new Map<number, number>();
        for (const item of atuaisPorOrdem) {
            minutosPorOrdem.set(item.os_id, (minutosPorOrdem.get(item.os_id) ?? 0) + (item._sum.minutos ?? 0));
        }
        for (const item of historicosPorOrdem) {
            minutosPorOrdem.set(item.os_id, (minutosPorOrdem.get(item.os_id) ?? 0) + (item._sum.duracao_minutos ?? 0));
        }

        const lancamentosRecentes: LancamentoRecente[] = [
            ...atuaisRecentes.map((item) => ({
                id: `atual-${item.id}`,
                os_id: item.os_id,
                ordem_titulo: item.ordens_servico.titulo,
                data_trabalho: item.data_trabalho.toISOString().slice(0, 10),
                minutos: item.minutos,
                duracao: minutosParaDuracao(item.minutos),
                funcionario: item.funcionarios,
                registrado_em: item.criado_em.toISOString(),
            })),
            ...historicosRecentes.map((item) => ({
                id: `historico-${item.id}`,
                os_id: item.os_id,
                ordem_titulo: item.ordens_servico.titulo,
                data_trabalho: item.data_trabalho.toISOString().slice(0, 10),
                minutos: item.duracao_minutos,
                duracao: minutosParaDuracao(item.duracao_minutos),
                funcionario: item.funcionarios,
                registrado_em: item.data_criacao.toISOString(),
            })),
        ]
            .sort((a, b) => b.data_trabalho.localeCompare(a.data_trabalho)
                || b.registrado_em.localeCompare(a.registrado_em))
            .slice(0, 5);

        const totalMinutos = (somaAtuais._sum.minutos ?? 0) + (somaHistoricos._sum.duracao_minutos ?? 0);
        const quantidadeLancamentos = somaAtuais._count._all + somaHistoricos._count._all;

        if (minutosPorOrdem.size === 0) {
            return {
                total_minutos: 0,
                total_horas: 0,
                total_duracao: '0m',
                quantidade_lancamentos: 0,
                ultimos_lancamentos: [],
                por_departamento: [],
                por_projeto: [],
            };
        }

        const ordens = await prisma.ordens_servico.findMany({
            where: { id: { in: [...minutosPorOrdem.keys()] } },
            select: {
                id: true,
                departamentos: { select: { id: true, nome: true } },
                projetos: { select: { id: true, nome: true } },
            },
        });
        const departamentos = new Map<number | null, AgregadoHoras>();
        const projetos = new Map<number | null, AgregadoHoras>();

        for (const ordem of ordens) {
            const minutos = minutosPorOrdem.get(ordem.id) ?? 0;
            const departamentoAtual = departamentos.get(ordem.departamentos.id) ?? {
                id: ordem.departamentos.id,
                nome: ordem.departamentos.nome,
                total_minutos: 0,
            };
            departamentoAtual.total_minutos += minutos;
            departamentos.set(departamentoAtual.id, departamentoAtual);

            const projetoId = ordem.projetos?.id ?? null;
            const projetoAtual = projetos.get(projetoId) ?? {
                id: projetoId,
                nome: ordem.projetos?.nome ?? 'Sem projeto vinculado',
                total_minutos: 0,
            };
            projetoAtual.total_minutos += minutos;
            projetos.set(projetoId, projetoAtual);
        }

        return {
            total_minutos: totalMinutos,
            total_horas: Number((totalMinutos / 60).toFixed(2)),
            total_duracao: minutosParaDuracao(totalMinutos),
            quantidade_lancamentos: quantidadeLancamentos,
            ultimos_lancamentos: lancamentosRecentes,
            por_departamento: formatarAgregados(departamentos),
            por_projeto: formatarAgregados(projetos),
        };
    }
}

export const serviceDashboard = new ServiceDashboard();
