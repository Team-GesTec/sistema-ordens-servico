/**
 * repositories/repositoryFuncionario.ts
 *
 * Acesso a dados de Funcionário: ÚNICO lugar que fala com `prisma.funcionarios`.
 *
 * Segurança: todas as consultas usam `omit: { senha_hash: true }`, então o hash da senha nunca
 * chega ao cache nem às respostas. A única exceção é `buscarCredenciaisPorUsuario`, usada só no
 * login — e ela vai direto ao banco (sem cache) de propósito: credencial precisa estar sempre
 * atualizada (senha trocada, usuário removido) e hash de senha não deve ficar guardado em memória.
 */
import { prisma } from '../prisma/client';
import { funcionarioCache } from '../cache/funcionarioCache';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type {
    DadosAtualizacaoFuncionario,
    DadosCriacaoFuncionario,
    Funcionario,
    FuncionarioComSenha,
} from '../models/modelFuncionario';

/** Campos que nunca saem do banco nas consultas comuns. */
const SEM_SENHA = { senha_hash: true } as const;

/** Mensagens de erro compartilhadas por create/update. */
const MENSAGENS_ESCRITA = {
    valorDuplicado: 'Nome de usuário já está em uso',
    referenciaInvalida: 'departamento_id não corresponde a um departamento existente',
} as const;

export class RepositoryFuncionario {
    /** Lista todos os funcionários, sem senha (cache → banco). */
    async listar(): Promise<Funcionario[]> {
        return funcionarioCache.obterTodos(() =>
            prisma.funcionarios.findMany({ omit: SEM_SENHA, orderBy: { id: 'asc' } }),
        );
    }

    /** Busca um funcionário pelo id, sem senha (cache → banco). Devolve `null` se não existir. */
    async buscarPorId(id: number): Promise<Funcionario | null> {
        return funcionarioCache.obterPorId(id, () =>
            prisma.funcionarios.findUnique({ where: { id }, omit: SEM_SENHA }),
        );
    }

    /**
     * Busca o registro completo (com `senha_hash`) pelo nome de usuário.
     * USO EXCLUSIVO DO LOGIN. Consulta direta ao banco, sem cache (ver comentário do arquivo).
     */
    async buscarCredenciaisPorUsuario(usuario: string): Promise<FuncionarioComSenha | null> {
        return prisma.funcionarios.findUnique({ where: { usuario } });
    }

    /** Cria um funcionário no banco e o coloca no cache (sem senha). */
    async criar(dados: DadosCriacaoFuncionario): Promise<Funcionario> {
        try {
            const criado = await prisma.funcionarios.create({ data: dados, omit: SEM_SENHA });
            funcionarioCache.definir(criado);
            return criado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, MENSAGENS_ESCRITA);
        }
    }

    /** Atualiza os campos informados de um funcionário e atualiza o cache. */
    async atualizar(id: number, dados: DadosAtualizacaoFuncionario): Promise<Funcionario> {
        try {
            const atualizado = await prisma.funcionarios.update({ where: { id }, data: dados, omit: SEM_SENHA });
            funcionarioCache.definir(atualizado);
            return atualizado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { ...MENSAGENS_ESCRITA, registroNaoEncontrado: 'Funcionário não encontrado' });
        }
    }

    /**
     * Remove um funcionário. Bloqueado (409) se ele for responsável por departamento, solicitante ou
     * responsável de O.S., membro de equipe ou tiver registros de auditoria.
     */
    async remover(id: number): Promise<void> {
        try {
            await prisma.funcionarios.delete({ where: { id }, select: { id: true } });
            funcionarioCache.remover(id);
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Funcionário não encontrado',
                referenciaEmUso:
                    'Não é possível excluir: o funcionário está vinculado a departamentos, O.S., equipes ou auditoria',
            });
        }
    }
}

/** Instância única usada pelos services e pelo middleware de autenticação. */
export const repositoryFuncionario = new RepositoryFuncionario();
