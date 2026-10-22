/**
 * repositories/repositoryDepartamento.ts
 *
 * Acesso a dados de Departamento: ÚNICO lugar que fala com `prisma.departamentos`.
 * Leituras passam pelo cache; escritas vão ao banco e, confirmadas, atualizam o cache.
 */
import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { AppError } from '../errors/AppError';
import { departamentoCache } from '../cache/departamentoCache';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type {
    DadosAtualizacaoDepartamento,
    DadosCriacaoDepartamento,
    Departamento,
} from '../models/modelDepartamento';

/** Mensagem para quando `responsavel_id` aponta para um funcionário que não existe. */
const RESPONSAVEL_INVALIDO = 'responsavel_id não corresponde a um funcionário existente';

export class RepositoryDepartamento {
    /** Lista todos os departamentos (cache → banco). */
    async listar(): Promise<Departamento[]> {
        return departamentoCache.obterTodos(() => prisma.departamentos.findMany({ orderBy: { id: 'asc' } }));
    }

    /** Busca um departamento pelo id (cache → banco). Devolve `null` se não existir. */
    async buscarPorId(id: number): Promise<Departamento | null> {
        return departamentoCache.obterPorId(id, () => prisma.departamentos.findUnique({ where: { id } }));
    }

    /**
     * Consulta as relações reais de um departamento. O escopo das O.S. é aplicado no banco;
     * para Técnico, a lista de funcionários é reduzida aos usuários que aparecem nas O.S.
     * efetivamente visíveis (além do próprio Técnico), evitando acesso lateral ao histórico.
     */
    async buscarVisaoEquipe(id: number, incluirHistorico = false, funcionarioTecnicoId?: number) {
        const departamento = await prisma.departamentos.findUnique({
            where: { id },
            select: { id: true, nome: true, responsavel_id: true },
        });
        if (!departamento) return null;

        const whereOrdens: Prisma.ordens_servicoWhereInput = {
            departamento_id: id,
            ...(incluirHistorico ? {} : { ativo: true }),
            ...(funcionarioTecnicoId !== undefined ? {
                OR: [
                    { responsavel_id: null },
                    { responsavel_id: funcionarioTecnicoId },
                    { solicitante_id: funcionarioTecnicoId },
                ],
            } : {}),
        };

        const [ligacoesProjetos, ordens_servico] = await Promise.all([
            prisma.projetos_departamentos.findMany({
                where: { departamento_id: id },
                select: {
                    projetos: {
                        select: { id: true, nome: true, ativo: true, status: true, cliente_id: true },
                    },
                },
            }),
            prisma.ordens_servico.findMany({
                where: whereOrdens,
                orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
                select: {
                    id: true, titulo: true, status: true, ativo: true, data_criacao: true,
                    data_limite_sla: true, responsavel_id: true, solicitante_id: true,
                },
            }),
        ]);

        const funcionariosVisiveisNasOrdens = funcionarioTecnicoId === undefined
            ? undefined
            : [...new Set([
                funcionarioTecnicoId,
                ...ordens_servico.flatMap((ordem) => [ordem.responsavel_id, ordem.solicitante_id]),
            ].filter((idFuncionario): idFuncionario is number => idFuncionario !== null))];

        const funcionarios_funcionarios_departamento_idTodepartamentos = await prisma.funcionarios.findMany({
            where: {
                departamento_id: id,
                ...(incluirHistorico ? {} : { ativo: true }),
                tipo: { not: 'gestor' },
                ...(funcionariosVisiveisNasOrdens ? { id: { in: funcionariosVisiveisNasOrdens } } : {}),
            },
            orderBy: [{ nome: 'asc' }, { id: 'asc' }],
            select: { id: true, nome: true, usuario: true, tipo: true, ativo: true, departamento_id: true },
        });

        return {
            ...departamento,
            projetos_departamentos: ligacoesProjetos,
            ordens_servico,
            funcionarios_funcionarios_departamento_idTodepartamentos,
        };
    }

    /** Cria um departamento; um novo responsável deve continuar ativo até o commit. */
    async criar(dados: DadosCriacaoDepartamento): Promise<Departamento> {
        try {
            const criado = dados.responsavel_id === null
                ? await prisma.departamentos.create({ data: dados })
                : await prisma.$transaction(async (tx) => {
                    await tx.$executeRaw`SELECT pg_advisory_xact_lock(734031, 3)`;
                    await this.validarResponsavelAtivoNaTransacao(tx, dados.responsavel_id!);
                    return tx.departamentos.create({ data: dados });
                });
            departamentoCache.definir(criado);
            return criado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { referenciaInvalida: RESPONSAVEL_INVALIDO });
        }
    }

    /** Atualiza campos do departamento. Novos vínculos de responsável usam o mesmo lock da inativação. */
    async atualizar(id: number, dados: DadosAtualizacaoDepartamento): Promise<Departamento> {
        try {
            const atualizado = dados.responsavel_id === undefined || dados.responsavel_id === null
                ? await prisma.departamentos.update({ where: { id }, data: dados })
                : await prisma.$transaction(async (tx) => {
                    await tx.$executeRaw`SELECT pg_advisory_xact_lock(734031, 3)`;
                    await this.validarResponsavelAtivoNaTransacao(tx, dados.responsavel_id!);
                    return tx.departamentos.update({ where: { id }, data: dados });
                });
            departamentoCache.definir(atualizado);
            return atualizado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Departamento não encontrado',
                referenciaInvalida: RESPONSAVEL_INVALIDO,
            });
        }
    }

    /** Revalida o novo vínculo no banco dentro do lock compartilhado com a inativação de funcionários. */
    private async validarResponsavelAtivoNaTransacao(
        tx: Prisma.TransactionClient,
        responsavelId: number,
    ): Promise<void> {
        const responsavel = await tx.funcionarios.findUnique({
            where: { id: responsavelId },
            select: { id: true, ativo: true },
        });
        if (!responsavel) throw AppError.requisicaoInvalida(RESPONSAVEL_INVALIDO);
        if (!responsavel.ativo) {
            throw AppError.requisicaoInvalida('responsavel_id não pode corresponder a um funcionário inativo');
        }
    }

}

/** Instância única usada pelos services. */
export const repositoryDepartamento = new RepositoryDepartamento();
