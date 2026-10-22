/** Acesso persistente a projetos e à auditoria própria da AJ-02. */
import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { AppError } from '../errors/AppError';
import { repositoryAuditoriaProjeto } from './repositoryAuditoriaProjeto';
import { bloquearProjetosRelacionados } from '../utils/projetoOsInvariant';
import type { CampoAuditoriaProjeto } from '../models/modelAuditoriaProjeto';
import type { DadosAtualizacaoProjeto, DadosCriacaoProjeto, Projeto, ProjetoDetalhe } from '../models/modelProjeto';

const INCLUIR_PROJETO_BASE = {
    clientes: { select: { id: true, nome: true, razao_social: true } },
    projetos_departamentos: {
        select: {
            departamento_id: true,
            departamentos: { select: { id: true, nome: true } },
        },
        orderBy: { departamento_id: 'asc' },
    },
} as const;

const SELECIONAR_OS_DETALHE = {
    id: true,
    titulo: true,
    status: true,
    ativo: true,
    data_criacao: true,
    data_fim: true,
    data_limite_sla: true,
} as const;

function consultarProjetoBasePorId(id: number) {
    return prisma.projetos.findUnique({ where: { id }, include: INCLUIR_PROJETO_BASE });
}

type RegistroProjetoBase = NonNullable<Awaited<ReturnType<typeof consultarProjetoBasePorId>>>;
type ContagensOS = {
    total_os_elegiveis: number;
    os_concluidas: number;
    percentual_conclusao: number | null;
};

function textoAuditoria(valor: unknown): string | null {
    if (valor === null || valor === undefined) return null;
    if (valor instanceof Date) return valor.toISOString();
    if (Array.isArray(valor)) return JSON.stringify(valor) ?? String(valor);
    if (typeof valor === 'object') return JSON.stringify(valor) ?? String(valor);
    return String(valor);
}

/** Agrega apenas as O.S. ativas e os campos de agrupamento, sem carregar O.S. completas. */
async function obterContagensOS(projetoIds: number[]): Promise<Map<number, ContagensOS>> {
    const contagens = new Map<number, ContagensOS>();
    for (const id of projetoIds) {
        contagens.set(id, {
            total_os_elegiveis: 0,
            os_concluidas: 0,
            percentual_conclusao: null,
        });
    }
    if (projetoIds.length === 0) return contagens;

    const grupos = await prisma.ordens_servico.groupBy({
        by: ['projeto_id', 'status'],
        where: { projeto_id: { in: projetoIds }, ativo: true },
        _count: { _all: true },
    });

    for (const grupo of grupos) {
        if (grupo.projeto_id === null) continue;
        const atual = contagens.get(grupo.projeto_id);
        if (!atual) continue;
        const quantidade = grupo._count._all;
        atual.total_os_elegiveis += quantidade;
        if (grupo.status === 'concluido') atual.os_concluidas += quantidade;
    }

    for (const atual of contagens.values()) {
        atual.percentual_conclusao = atual.total_os_elegiveis === 0
            ? null
            : Number(((atual.os_concluidas / atual.total_os_elegiveis) * 100).toFixed(2));
    }
    return contagens;
}

function paraProjetoResumo(registro: RegistroProjetoBase, contagens: ContagensOS): Projeto {
    const { clientes, projetos_departamentos, ...campos } = registro;
    return {
        ...campos,
        cliente: clientes,
        departamentos: projetos_departamentos.map((ligacao) => ligacao.departamento_id),
        departamentos_detalhes: projetos_departamentos.map((ligacao) => ({
            id: ligacao.departamentos.id,
            nome: ligacao.departamentos.nome,
        })),
        ...contagens,
    };
}

async function paraListaResumo(registros: RegistroProjetoBase[]): Promise<Projeto[]> {
    const contagens = await obterContagensOS(registros.map((registro) => registro.id));
    return registros.map((registro) => paraProjetoResumo(registro, contagens.get(registro.id)!));
}

function dadosParaAuditoria(dados: DadosCriacaoProjeto): CampoAuditoriaProjeto[] {
    return [
        { campo: 'nome', antigo: null, novo: dados.nome },
        { campo: 'cliente_id', antigo: null, novo: String(dados.cliente_id) },
        { campo: 'data_inicio', antigo: null, novo: textoAuditoria(dados.data_inicio) },
        { campo: 'data_fim', antigo: null, novo: textoAuditoria(dados.data_fim) },
        { campo: 'status', antigo: null, novo: dados.status },
        { campo: 'ativo', antigo: null, novo: 'true' },
        { campo: 'departamentos', antigo: null, novo: textoAuditoria(dados.departamentos) },
    ];
}

export class RepositoryProjeto {
    /** A listagem retorna resumo e agregações; nunca inclui as linhas das O.S. */
    async listar(ativo?: boolean): Promise<Projeto[]> {
        const registros = await prisma.projetos.findMany({
            ...(ativo === undefined ? {} : { where: { ativo } }),
            include: INCLUIR_PROJETO_BASE,
            orderBy: [{ nome: 'asc' }, { id: 'asc' }],
        });
        return paraListaResumo(registros);
    }

    /** Detalhes permitem históricos somente dentro do recorte de departamento do chamador. */
    async buscarPorId(
        id: number,
        incluirOSInativas = false,
        departamentoId?: number,
        tecnicoId?: number,
    ): Promise<ProjetoDetalhe | null> {
        const whereOS: Prisma.ordens_servicoWhereInput = {
            ...(incluirOSInativas ? {} : { ativo: true }),
            ...(departamentoId !== undefined ? { departamento_id: departamentoId } : {}),
            ...(tecnicoId !== undefined ? {
                OR: [
                    { responsavel_id: null },
                    { responsavel_id: tecnicoId },
                    { solicitante_id: tecnicoId },
                ],
            } : {}),
        };
        const registro = await prisma.projetos.findUnique({
            where: { id },
            include: {
                ...INCLUIR_PROJETO_BASE,
                ordens_servico: {
                    where: whereOS,
                    select: SELECIONAR_OS_DETALHE,
                    orderBy: { id: 'desc' },
                },
            },
        });
        if (!registro) return null;

        const { ordens_servico, ...base } = registro;
        const contagens = (await obterContagensOS([registro.id])).get(registro.id)!;
        const resumo = paraProjetoResumo(base, contagens);
        return {
            ...resumo,
            ordens_servico: ordens_servico.map((ordem) => ({
                id: ordem.id,
                titulo: ordem.titulo,
                status: ordem.status,
                ativo: ordem.ativo,
                data_criacao: ordem.data_criacao,
                data_fim: ordem.data_fim,
                data_limite_sla: ordem.data_limite_sla,
            })),
        };
    }

    async criar(dados: DadosCriacaoProjeto, funcionarioId: number): Promise<Projeto> {
        const criado = await prisma.$transaction(async (tx) => {
            const registro = await tx.projetos.create({
                data: {
                    nome: dados.nome,
                    cliente_id: dados.cliente_id,
                    data_inicio: dados.data_inicio,
                    data_fim: dados.data_fim,
                    status: dados.status,
                    projetos_departamentos: {
                        create: dados.departamentos.map((departamento_id) => ({ departamento_id })),
                    },
                },
                include: INCLUIR_PROJETO_BASE,
            });
            await repositoryAuditoriaProjeto.registrarCampos(tx, registro.id, funcionarioId, 'insercao', dadosParaAuditoria(dados));
            return registro;
        });
        const contagens = (await obterContagensOS([criado.id])).get(criado.id)!;
        return paraProjetoResumo(criado, contagens);
    }

    async atualizar(id: number, dados: DadosAtualizacaoProjeto, funcionarioId: number): Promise<Projeto> {
        const atualizado = await prisma.$transaction(async (tx) => {
            // Serializa edição com inativação e operações de O.S. que dependem do projeto.
            const estados = await bloquearProjetosRelacionados(tx, [id]);
            if (!estados.has(id)) return null;
            const anterior = await tx.projetos.findUnique({ where: { id }, include: INCLUIR_PROJETO_BASE });
            if (!anterior) return null;
            if (!anterior.ativo) throw AppError.conflito('Projeto inativo é somente histórico e não pode ser editado.');

            const { departamentos, ...campos } = dados;
            if (departamentos !== undefined) {
                await tx.projetos_departamentos.deleteMany({ where: { projeto_id: id } });
            }
            const registro = await tx.projetos.update({
                where: { id },
                data: {
                    ...campos,
                    ...(departamentos !== undefined
                        ? { projetos_departamentos: { create: departamentos.map((departamento_id) => ({ departamento_id })) } }
                        : {}),
                },
                include: INCLUIR_PROJETO_BASE,
            });

            const antigos: Record<string, unknown> = {
                nome: anterior.nome,
                cliente_id: anterior.cliente_id,
                data_inicio: anterior.data_inicio,
                data_fim: anterior.data_fim,
                status: anterior.status,
                departamentos: anterior.projetos_departamentos.map((item) => item.departamento_id),
            };
            const novos: Record<string, unknown> = {
                nome: registro.nome,
                cliente_id: registro.cliente_id,
                data_inicio: registro.data_inicio,
                data_fim: registro.data_fim,
                status: registro.status,
                departamentos: registro.projetos_departamentos.map((item) => item.departamento_id),
            };
            const camposAuditoria = Object.keys(novos)
                .filter((campo) => campo in dados)
                .filter((campo) => textoAuditoria(antigos[campo]) !== textoAuditoria(novos[campo]))
                .map((campo) => ({ campo, antigo: textoAuditoria(antigos[campo]), novo: textoAuditoria(novos[campo]) }));
            await repositoryAuditoriaProjeto.registrarCampos(tx, id, funcionarioId, 'atualizacao', camposAuditoria);
            return registro;
        });
        if (!atualizado) throw AppError.naoEncontrado('Projeto não encontrado');
        const contagens = (await obterContagensOS([atualizado.id])).get(atualizado.id)!;
        return paraProjetoResumo(atualizado, contagens);
    }

    async inativar(id: number, funcionarioId: number): Promise<Projeto> {
        const atualizado = await prisma.$transaction(async (tx) => {
            // O mesmo bloqueio usado nas operações de O.S. impede um novo vínculo
            // enquanto o projeto é inativado; O.S. já vinculadas permanecem operacionais.
            const projetosBloqueados = await bloquearProjetosRelacionados(tx, [id]);
            if (!projetosBloqueados.has(id)) return null;

            const anterior = await tx.projetos.findUnique({ where: { id }, include: INCLUIR_PROJETO_BASE });
            if (!anterior) return null;
            if (!anterior.ativo) {
                throw AppError.requisicaoInvalida('O projeto já está inativo; a inativação é permanente.');
            }
            const registro = await tx.projetos.update({
                where: { id },
                data: { ativo: false },
                include: INCLUIR_PROJETO_BASE,
            });
            await repositoryAuditoriaProjeto.registrarCampos(tx, id, funcionarioId, 'atualizacao', [{
                campo: 'ativo',
                antigo: String(anterior.ativo),
                novo: 'false',
                justificativa: 'Inativação permanente do projeto',
            }]);
            return registro;
        });
        if (!atualizado) throw AppError.naoEncontrado('Projeto não encontrado');
        const contagens = (await obterContagensOS([atualizado.id])).get(atualizado.id)!;
        return paraProjetoResumo(atualizado, contagens);
    }
}

export const repositoryProjeto = new RepositoryProjeto();
