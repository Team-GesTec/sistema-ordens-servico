/**
 * repositories/repositoryCliente.ts
 *
 * Acesso a dados de Cliente: ÚNICO lugar que fala com `prisma.clientes`.
 * Toda leitura passa pelo cache; toda escrita vai ao banco e, confirmada, atualiza o cache
 * (write-through). Erros conhecidos do Prisma são traduzidos para `AppError`.
 *
 * ALTERAÇÃO (16/09/2026): esta lógica ficava dentro do controllerCliente; foi extraída para a
 * camada de repository prevista na arquitetura do projeto.
 * ALTERAÇÃ0 (21/09/2026): adiciona locais_operacionais em dados recebidos no método criar().
 */
import { prisma } from '../prisma/client';
import { clienteCache } from '../cache/clienteCache';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type { Cliente, DadosAtualizacaoCliente, DadosCriacaoCliente } from '../models/modelCliente';

export class RepositoryCliente {
    /** Lista todos os clientes (cache → banco). */
    async listar(): Promise<Cliente[]> {
        return clienteCache.obterTodos(() => prisma.clientes.findMany({ orderBy: { id: 'asc' } }));
    }

    /** Busca um cliente pelo id (cache → banco). Devolve `null` se não existir. */
    async buscarPorId(id: number): Promise<Cliente | null> {
        return clienteCache.obterPorId(id, () => prisma.clientes.findUnique({ where: { id } }));
    }

    /** Cria um cliente no banco e o coloca no cache. */
    async criar(dados: DadosCriacaoCliente): Promise<Cliente> {
        try {
            const criado = await prisma.clientes.create({
                data: {
                    nome: dados.nome,
                    categoria: dados.categoria,
                    razao_social: dados.razao_social,
                    ramo_atuacao: dados.ramo_atuacao,
                    locais_operacionais: {
                        create: dados.locais_operacionais, // lista de { descricao, tipo }
                    },
                },
                include: { locais_operacionais: true }, // pra devolver eles na resposta
            });
            clienteCache.definir(criado);
            return criado;
        } catch (erro) {
            throw traduzirErroPrisma(erro);
        }
    }

    /** Atualiza os campos informados de um cliente e atualiza o cache. */
    async atualizar(id: number, dados: DadosAtualizacaoCliente): Promise<Cliente> {
        try {
            const atualizado = await prisma.clientes.update({ where: { id }, data: dados });
            clienteCache.definir(atualizado);
            return atualizado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { registroNaoEncontrado: 'Cliente não encontrado' });
        }
    }

    /** Remove um cliente do banco e do cache. Bloqueado (409) se houver projetos/O.S./locais ligados a ele. */
    async remover(id: number): Promise<void> {
        try {
            await prisma.clientes.delete({ where: { id }, select: { id: true } });
            clienteCache.remover(id);
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Cliente não encontrado',
                referenciaEmUso:
                    'Não é possível excluir: o cliente ainda tem projetos, O.S. ou locais operacionais vinculados',
            });
        }
    }
}

/** Instância única usada pelos services. */
export const repositoryCliente = new RepositoryCliente();
