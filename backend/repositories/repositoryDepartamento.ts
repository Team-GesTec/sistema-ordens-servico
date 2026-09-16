/**
 * repositories/repositoryDepartamento.ts
 *
 * Acesso a dados de Departamento: ÚNICO lugar que fala com `prisma.departamentos`.
 * Leituras passam pelo cache; escritas vão ao banco e, confirmadas, atualizam o cache.
 */
import { prisma } from '../prisma/client';
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

    /** Cria um departamento no banco e o coloca no cache. */
    async criar(dados: DadosCriacaoDepartamento): Promise<Departamento> {
        try {
            const criado = await prisma.departamentos.create({ data: dados });
            departamentoCache.definir(criado);
            return criado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { referenciaInvalida: RESPONSAVEL_INVALIDO });
        }
    }

    /** Atualiza os campos informados de um departamento e atualiza o cache. */
    async atualizar(id: number, dados: DadosAtualizacaoDepartamento): Promise<Departamento> {
        try {
            const atualizado = await prisma.departamentos.update({ where: { id }, data: dados });
            departamentoCache.definir(atualizado);
            return atualizado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Departamento não encontrado',
                referenciaInvalida: RESPONSAVEL_INVALIDO,
            });
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
                referenciaEmUso:
                    'Não é possível excluir: o departamento ainda tem funcionários, O.S. ou projetos vinculados',
            });
        }
    }
}

/** Instância única usada pelos services. */
export const repositoryDepartamento = new RepositoryDepartamento();
