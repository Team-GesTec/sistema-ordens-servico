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
    /** Lista departamentos (cache → banco), filtrando pelo estado quando informado. */
    async listar(ativo?: boolean): Promise<Departamento[]> {
        const todos = await departamentoCache.obterTodos(() =>
            prisma.departamentos.findMany({ orderBy: { id: 'asc' } })
        );

        if (ativo === undefined) return todos;

        return todos.filter((departamento) => departamento.ativo === ativo);
    }

    /** Busca um departamento pelo id (cache → banco). Devolve `null` se não existir. */
    async buscarPorId(id: number): Promise<Departamento | null> {
        return departamentoCache.obterPorId(id, () => prisma.departamentos.findUnique({ where: { id } }));
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
    /** Altera o estado ativo/inativo sem remover o departamento ou seus vínculos. */
    async alterarAtivo(id: number, ativo: boolean): Promise<Departamento> {
        try {
            const atualizado = await prisma.$transaction(async (tx) => {
                const departamento = await tx.departamentos.findUnique({
                    where: { id },
                    select: { id: true, ativo: true },
                });

                if (!departamento) {
                    throw AppError.naoEncontrado('Departamento não encontrado');
                }

                if (departamento.ativo === ativo) {
                    throw AppError.requisicaoInvalida(
                        `Departamento já está ${ativo ? 'ativo' : 'inativo'}`
                    );
                }

                return tx.departamentos.update({
                    where: { id },
                    data: { ativo },
                });
            });

            departamentoCache.definir(atualizado);
            return atualizado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Departamento não encontrado',
            });
        }
    }
}

/** Instância única usada pelos services. */
export const repositoryDepartamento = new RepositoryDepartamento();