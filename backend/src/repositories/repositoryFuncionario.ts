/**
 * repositories/repositoryFuncionario.ts
 *
 * Único lugar de acesso ao Prisma para funcionários. As leituras comuns omitem senha_hash;
 * o cache guarda apenas o contrato público. Alterações críticas de perfil/estado são serializadas
 * com advisory lock transacional para impedir corridas na regra do último Gestor ativo.
 */
import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { funcionarioCache } from '../cache/funcionarioCache';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import { AppError } from '../errors/AppError';
import type {
    DadosAtualizacaoFuncionario,
    DadosCriacaoFuncionario,
    Funcionario,
    FuncionarioComSenha,
} from '../models/modelFuncionario';

const SEM_SENHA = { senha_hash: true } as const;
const MENSAGENS_ESCRITA = {
    valorDuplicado: 'Nome de usuário já está em uso',
    referenciaInvalida: 'departamento_id não corresponde a um departamento existente',
} as const;

/** Lock PostgreSQL global para serializar alterações que afetam o conjunto de Gestores ativos. */
async function bloquearAlteracoesDeGestores(tx: Prisma.TransactionClient): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(734031, 3)`;
}

export class RepositoryFuncionario {
    /** Lista somente funcionários ativos para telas/opções de seleção comuns. */
    async listar(): Promise<Funcionario[]> {
        return (await this.listarTodosPersistidos()).filter((funcionario) => funcionario.ativo);
    }

    /** Lista somente inativos; a rota que a consome é protegida por autorizar('gestor'). */
    async listarInativos(): Promise<Funcionario[]> {
        return (await this.listarTodosPersistidos()).filter((funcionario) => !funcionario.ativo);
    }

    /** Lista interna/cache de todos os registros; não é exposta diretamente pela API comum. */
    private listarTodosPersistidos(): Promise<Funcionario[]> {
        return funcionarioCache.obterTodos(() =>
            prisma.funcionarios.findMany({ omit: SEM_SENHA, orderBy: { id: 'asc' } }),
        );
    }

    /** Busca por ID sem filtrar inativos, para preservar associações e histórico. */
    async buscarPorId(id: number): Promise<Funcionario | null> {
        return funcionarioCache.obterPorId(id, () =>
            prisma.funcionarios.findUnique({ where: { id }, omit: SEM_SENHA }),
        );
    }

    /** Hash só é devolvido ao serviço de autenticação; esta consulta nunca usa cache. */
    async buscarCredenciaisPorUsuario(usuario: string): Promise<FuncionarioComSenha | null> {
        return prisma.funcionarios.findUnique({ where: { usuario } });
    }

    async criar(dados: DadosCriacaoFuncionario): Promise<Funcionario> {
        try {
            const criado = await prisma.$transaction(async (tx) => {
                if (dados.tipo === 'tecnico') {
                    await bloquearAlteracoesDeGestores(tx);
                    await this.validarDepartamentoTecnicoNaTransacao(tx, dados.departamento_id);
                }
                return tx.funcionarios.create({ data: dados, omit: SEM_SENHA });
            });
            funcionarioCache.definir(criado);
            return criado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, MENSAGENS_ESCRITA);
        }
    }

    /**
     * Atualiza os campos informados. Mudanças de perfil são protegidas por lock + contagem fresca
     * dentro da mesma transação. O cache é invalidado depois do commit para evitar que duas
     * operações concorrentes publiquem snapshots fora de ordem.
     */
    async atualizar(id: number, dados: DadosAtualizacaoFuncionario): Promise<Funcionario> {
        try {
            const atualizado = await prisma.$transaction(async (tx) => {
                await bloquearAlteracoesDeGestores(tx);
                const atual = await tx.funcionarios.findUnique({ where: { id }, omit: SEM_SENHA });
                if (!atual) throw AppError.naoEncontrado('Funcionário não encontrado');
                if (!atual.ativo) throw AppError.conflito('Funcionário inativo é somente histórico e não pode ser editado.');

                const tipoFinal = dados.tipo ?? atual.tipo;
                const departamentoFinal = dados.departamento_id ?? atual.departamento_id;
                if (tipoFinal === 'tecnico') {
                    await this.validarDepartamentoTecnicoNaTransacao(tx, departamentoFinal);
                }

                if (dados.departamento_id !== undefined && departamentoFinal !== atual.departamento_id) {
                    // Compartilha a trava da atribuição/inativação para não transferir o Técnico
                    // enquanto uma nova O.S. ainda possa ser atribuída a ele.
                    await tx.$queryRaw`
                        WITH advisory_lock AS (
                            SELECT pg_advisory_xact_lock(734031, 3)
                        )
                        SELECT 1::int AS lock_acquired FROM advisory_lock
                    `;
                    const ordensAbertas = await tx.$queryRaw<Array<{ id: number }>>`
                        SELECT "id"
                        FROM "ordens_servico"
                        WHERE "responsavel_id" = ${id}
                          AND "ativo" = true
                          AND "status" <> 'concluido'
                        ORDER BY "id" ASC
                        FOR UPDATE
                    `;
                    if (ordensAbertas.length > 0) {
                        const ids = ordensAbertas.map((ordem) => `#${ordem.id}`).join(', ');
                        throw AppError.conflito(
                            `Não é possível transferir o funcionário enquanto houver O.S. abertas atribuídas a ele: ${ids}. Conclua ou redistribua essas O.S. antes da transferência.`,
                        );
                    }
                }

                if (
                    atual.ativo &&
                    atual.tipo === 'gestor' &&
                    dados.tipo !== undefined &&
                    dados.tipo !== 'gestor'
                ) {
                    const gestoresAtivos = await tx.funcionarios.count({
                        where: { tipo: 'gestor', ativo: true },
                    });
                    if (gestoresAtivos <= 1) {
                        throw AppError.conflito('Operação bloqueada: o último Gestor ativo não pode ser rebaixado.');
                    }
                }

                return tx.funcionarios.update({ where: { id }, data: dados, omit: SEM_SENHA });
            });
            funcionarioCache.invalidarTudo();
            return atualizado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                ...MENSAGENS_ESCRITA,
                registroNaoEncontrado: 'Funcionário não encontrado',
            });
        }
    }


    /** Revalida a elegibilidade do departamento dentro do lock compartilhado com alterações de vínculo. */
    private async validarDepartamentoTecnicoNaTransacao(
        tx: Prisma.TransactionClient,
        departamentoId: number,
    ): Promise<void> {
        const departamento = await tx.departamentos.findUnique({
            where: { id: departamentoId },
            select: { id: true, responsavel_id: true },
        });
        if (!departamento) {
            throw AppError.requisicaoInvalida('departamento_id não corresponde a um departamento existente');
        }
        if (departamento.responsavel_id === null) {
            throw AppError.requisicaoInvalida('Não é possível vincular Técnico: o departamento não possui Analista/Líder responsável.');
        }
        const responsavel = await tx.funcionarios.findUnique({
            where: { id: departamento.responsavel_id },
            select: { id: true, ativo: true, tipo: true, departamento_id: true },
        });
        if (!responsavel || !responsavel.ativo || responsavel.tipo !== 'analista' || responsavel.departamento_id !== departamentoId) {
            throw AppError.requisicaoInvalida('Não é possível vincular Técnico: o Analista/Líder responsável precisa estar ativo e pertencer ao departamento.');
        }
    }

    /** Inativação lógica, com proteção atômica contra remoção do último Gestor ativo. */
    async inativar(id: number): Promise<Funcionario> {
        try {
            const resultado = await prisma.$transaction(async (tx) => {
                await bloquearAlteracoesDeGestores(tx);
                // Mesma trava usada ao atribuir O.S.; impede uma nova atribuição entre a
                // verificação das ordens abertas e a inativação do funcionário.
                await tx.$queryRaw`
                    WITH advisory_lock AS (
                        SELECT pg_advisory_xact_lock(734031, 3)
                    )
                    SELECT 1::int AS lock_acquired FROM advisory_lock
                `;
                const atual = await tx.funcionarios.findUnique({ where: { id }, omit: SEM_SENHA });
                if (!atual) throw AppError.naoEncontrado('Funcionário não encontrado');
                if (!atual.ativo) return atual;

                const ordensAbertas = await tx.$queryRaw<Array<{ id: number }>>`
                    SELECT "id"
                    FROM "ordens_servico"
                    WHERE "responsavel_id" = ${id}
                      AND "ativo" = true
                      AND "status" <> 'concluido'
                    ORDER BY "id" ASC
                    FOR UPDATE
                `;
                if (ordensAbertas.length > 0) {
                    const ids = ordensAbertas.map((ordem) => `#${ordem.id}`).join(', ');
                    throw AppError.conflito(
                        `Não é possível inativar o funcionário enquanto houver O.S. abertas atribuídas a ele: ${ids}. Conclua ou redistribua essas O.S. antes da inativação.`,
                    );
                }

                if (atual.tipo === 'gestor') {
                    const gestoresAtivos = await tx.funcionarios.count({
                        where: { tipo: 'gestor', ativo: true },
                    });
                    if (gestoresAtivos <= 1) {
                        throw AppError.conflito('Operação bloqueada: o sistema precisa manter pelo menos um Gestor ativo.');
                    }
                }

                return tx.funcionarios.update({
                    where: { id },
                    data: { ativo: false },
                    omit: SEM_SENHA,
                });
            });
            funcionarioCache.invalidarTudo();
            return resultado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { registroNaoEncontrado: 'Funcionário não encontrado' });
        }
    }


}

export const repositoryFuncionario = new RepositoryFuncionario();
