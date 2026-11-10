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

    async buscarEquipe(id: number, incluirHistorico = false) {
        const departamento = await this.buscarPorId(id);
        if (!departamento) return null;

        const filtroAtivo = incluirHistorico ? {} : { ativo: true };
        const [projetos, ordens_servico, funcionarios] = await Promise.all([
            prisma.projetos.findMany({
                where: {
                    ...filtroAtivo,
                    projetos_departamentos: { some: { departamento_id: id } },
                },
                select: { id: true, nome: true, ativo: true, status: true, cliente_id: true },
                orderBy: [{ nome: 'asc' }, { id: 'asc' }],
            }),
            prisma.ordens_servico.findMany({
                where: { departamento_id: id, ...filtroAtivo },
                select: {
                    id: true,
                    titulo: true,
                    status: true,
                    ativo: true,
                    data_criacao: true,
                    data_limite_sla: true,
                    responsavel_id: true,
                    solicitante_id: true,
                },
                orderBy: { id: 'desc' },
            }),
            prisma.funcionarios.findMany({
                where: { departamento_id: id, ...filtroAtivo },
                select: { id: true, nome: true, usuario: true, tipo: true, ativo: true, departamento_id: true },
                orderBy: [{ nome: 'asc' }, { id: 'asc' }],
            }),
        ]);

        return { departamento, projetos, ordens_servico, funcionarios };
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

    /** Remove um departamento. Bloqueado (409) se ainda houver funcionários, O.S. ou projetos ligados a ele. */
    async remover(id: number): Promise<void> {
        try {
            await prisma.departamentos.delete({ where: { id }, select: { id: true } });
            departamentoCache.remover(id);
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Departamento não encontrado',
                referenciaEmUso: 'Não é possível excluir: o departamento ainda tem funcionários, O.S. ou projetos vinculados',
            });
        }
    }
}

/** Instância única usada pelos services. */
export const repositoryDepartamento = new RepositoryDepartamento();
