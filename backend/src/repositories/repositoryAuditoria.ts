/**
 * repositories/repositoryAuditoria.ts
 *
 * Responsável por gravar e ler a tabela auditoria.
 * Não possui função de editar ou excluir, conforme critério de que o registro deve ser imutável
 * (o banco também recusa UPDATE e DELETE — trigger `auditoria_imutavel`).
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE01: `registrar` preenche a `descricao` quando ela não é informada; novo `registrarVarios`
 *    (mesma regra), usado por quem grava vários campos de uma vez na transação.
 *  - 2.10-BE02: `listarPorOrdemServico` paginado, ordenado por data e id (desc), com o responsável
 *    e a O.S. de cada registro.
 *  - 2.10-BE03: `listarLogs` e `calcularIndicadores` para a tela "Logs de auditoria".
 *
 * ALTERAÇÕES (06/11/2026):
 *  - filtro por período (`dataInicio`/`dataFim`) nos logs e nos indicadores.
 */
import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { descreverAuditoria } from '../utils/descricaoAuditoria';
import type {
    Auditoria,
    AuditoriaComRelacoes,
    DadosRegistroAuditoria,
    FiltroLogsAuditoria,
    PedidoPagina,
} from '../models/modelAuditoria';

/** Critérios dos logs que valem para a listagem e para os indicadores (tudo menos a paginação). */
type CriteriosLogs = Omit<FiltroLogsAuditoria, 'pagina' | 'limite'>;

/** Somente a auditoria de O.S. (a de projetos fica em `auditoria_projetos`). */
const ENTIDADE_ORDEM_SERVICO = 'ordem_servico';

/** Mais recente primeiro; registros no mesmo instante saem pelo id decrescente. */
const ORDEM_MAIS_RECENTE: Prisma.auditoriaOrderByWithRelationInput[] = [
    { data_modificacao: 'desc' },
    { id: 'desc' },
];

/** Relações devolvidas junto de cada registro. */
const RELACOES = {
    funcionarios: { select: { id: true, nome: true, usuario: true } },
    ordens_servico: { select: { id: true, titulo: true } },
} satisfies Prisma.auditoriaInclude;

/** Completa a descrição antes de gravar. */
function comDescricao(dados: DadosRegistroAuditoria): DadosRegistroAuditoria {
    return { ...dados, descricao: dados.descricao ?? descreverAuditoria(dados) };
}

/**
 * Monta o `where` dos logs globais.
 * A busca é livre e sem diferenciar maiúsculas; "12", "#12" ou "OS #12" também buscam pela O.S. 12.
 */
function filtroLogs(filtro: CriteriosLogs): Prisma.auditoriaWhereInput {
    const where: Prisma.auditoriaWhereInput = { tipo_entidade: ENTIDADE_ORDEM_SERVICO };

    if (filtro.tipo !== null) {
        where.tipo_evento = filtro.tipo;
    }

    if (filtro.dataInicio !== null || filtro.dataFim !== null) {
        where.data_modificacao = {
            ...(filtro.dataInicio !== null ? { gte: filtro.dataInicio } : {}),
            ...(filtro.dataFim !== null ? { lte: filtro.dataFim } : {}),
        };
    }

    if (filtro.busca !== null) {
        const contem = { contains: filtro.busca, mode: 'insensitive' } as const;
        const alternativas: Prisma.auditoriaWhereInput[] = [
            { descricao: contem },
            { campo_alterado: contem },
            { dado_antigo: contem },
            { dado_novo: contem },
            { justificativa: contem },
            { parecer: contem },
            { funcionarios: { nome: contem } },
            { ordens_servico: { titulo: contem } },
        ];
        const numeroOS = /^(?:o\.?s\.?\s*)?#?\s*(\d{1,9})$/i.exec(filtro.busca)?.[1];
        if (numeroOS !== undefined) {
            alternativas.push({ os_id: Number(numeroOS) });
        }
        where.OR = alternativas;
    }

    return where;
}

export class RepositoryAuditoria {
    /** Grava um registro. Deve receber a conexão da transação da operação auditada. */
    async registrar(
        dados: DadosRegistroAuditoria,
        conexao: Prisma.TransactionClient = prisma,
    ): Promise<Auditoria> {
        const registro = await conexao.auditoria.create({ data: comDescricao(dados) });
        return registro
    }

    /** Grava vários registros de uma vez. Deve receber a conexão da transação da operação auditada. */
    async registrarVarios(
        dados: DadosRegistroAuditoria[],
        conexao: Prisma.TransactionClient = prisma,
    ): Promise<void> {
        await conexao.auditoria.createMany({ data: dados.map(comDescricao) });
    }

    /** Uma página do histórico de uma O.S., com o total de registros dela. */
    async listarPorOrdemServico(
        osId: number,
        pedido: PedidoPagina,
    ): Promise<{ registros: AuditoriaComRelacoes[]; total: number }> {
        const where: Prisma.auditoriaWhereInput = { os_id: osId, tipo_entidade: ENTIDADE_ORDEM_SERVICO };

        const [total, registros] = await prisma.$transaction([
            prisma.auditoria.count({ where }),
            prisma.auditoria.findMany({
                where,
                include: RELACOES,
                orderBy: ORDEM_MAIS_RECENTE,
                skip: (pedido.pagina - 1) * pedido.limite,
                take: pedido.limite,
            }),
        ]);

        return { registros, total };
    }

    /** Uma página dos logs globais, com o total de registros que atendem ao filtro. */
    async listarLogs(filtro: FiltroLogsAuditoria): Promise<{ registros: AuditoriaComRelacoes[]; total: number }> {
        const where = filtroLogs(filtro);

        const [total, registros] = await prisma.$transaction([
            prisma.auditoria.count({ where }),
            prisma.auditoria.findMany({
                where,
                include: RELACOES,
                orderBy: ORDEM_MAIS_RECENTE,
                skip: (filtro.pagina - 1) * filtro.limite,
                take: filtro.limite,
            }),
        ]);

        return { registros, total };
    }

    /**
     * Números dos cartões da tela, calculados sobre o mesmo filtro da listagem (sem paginação).
     * @param inicioHoje Primeiro instante do dia atual (no fuso de exibição).
     */
    async calcularIndicadores(
        filtro: CriteriosLogs,
        inicioHoje: Date,
    ): Promise<{ total: number; hoje: number; ordens: number; ultimo: Date | null }> {
        const where = filtroLogs(filtro);

        const [total, hoje, ordens, ultimo] = await prisma.$transaction([
            prisma.auditoria.count({ where }),
            prisma.auditoria.count({ where: { AND: [where, { data_modificacao: { gte: inicioHoje } }] } }),
            prisma.auditoria.findMany({ where, distinct: ['os_id'], select: { os_id: true } }),
            prisma.auditoria.findFirst({ where, orderBy: ORDEM_MAIS_RECENTE, select: { data_modificacao: true } }),
        ]);

        return { total, hoje, ordens: ordens.length, ultimo: ultimo?.data_modificacao ?? null };
    }
}

export const repositoryAuditoria = new RepositoryAuditoria()
