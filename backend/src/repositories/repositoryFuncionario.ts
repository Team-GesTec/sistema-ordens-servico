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
            const criado = await prisma.funcionarios.create({ data: dados, omit: SEM_SENHA });
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

    /** Inativação lógica, com proteção atômica contra remoção do último Gestor ativo. */
    async inativar(id: number): Promise<Funcionario> {
        try {
            const resultado = await prisma.$transaction(async (tx) => {
                await bloquearAlteracoesDeGestores(tx);
                const atual = await tx.funcionarios.findUnique({ where: { id }, omit: SEM_SENHA });
                if (!atual) throw AppError.naoEncontrado('Funcionário não encontrado');
                if (!atual.ativo) return atual;

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

    /** Reativação lógica: as relações históricas permanecem intactas. */
    async reativar(id: number): Promise<Funcionario> {
        try {
            const reativado = await prisma.$transaction(async (tx) => {
                // Usa o mesmo lock das alterações de perfil/inativação para serializar estados.
                await bloquearAlteracoesDeGestores(tx);
                const atual = await tx.funcionarios.findUnique({ where: { id }, omit: SEM_SENHA });
                if (!atual) throw AppError.naoEncontrado('Funcionário não encontrado');
                if (atual.ativo) return atual;
                return tx.funcionarios.update({
                    where: { id },
                    data: { ativo: true },
                    omit: SEM_SENHA,
                });
            });
            funcionarioCache.invalidarTudo();
            return reativado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { registroNaoEncontrado: 'Funcionário não encontrado' });
        }
    }
}

export const repositoryFuncionario = new RepositoryFuncionario();
