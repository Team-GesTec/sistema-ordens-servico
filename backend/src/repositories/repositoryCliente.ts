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
            const atualizado = await prisma.clientes.update({
                where: { id },
                data: {
                    ...(dados.nome !== undefined && { nome: dados.nome }),
                    ...(dados.razao_social !== undefined && { razao_social: dados.razao_social }),
                    ...(dados.ramo_atuacao !== undefined && { ramo_atuacao: dados.ramo_atuacao }),
                    ...(dados.locais_operacionais !== undefined && {
                        locais_operacionais: {
                            create: dados.locais_operacionais,
                        },
                    }),
                },
            });
            clienteCache.definir(atualizado);
            return atualizado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { registroNaoEncontrado: 'Cliente não encontrado' });
        }
    }

        /** Conta projetos do cliente cujo status não é concluído. */
    async contarProjetosNaoConcluidos(clienteId: number): Promise<number> {
        return prisma.projetos.count({
            where: {
                cliente_id: clienteId,
                status: { not: 'concluido' },
            },
        });
    }

    /** Conta O.S. não concluídas vinculadas diretamente ao cliente ou por projeto. */
    async contarOrdensServicoNaoConcluidas(clienteId: number): Promise<number> {
        return prisma.ordens_servico.count({
            where: {
                status: { not: 'concluido' },
                OR: [
                    // O.S. vinculada diretamente ao cliente
                    { cliente_id: clienteId },

                    // O.S. vinculada por meio de um projeto do cliente
                    { projetos: { is: { cliente_id: clienteId } } },

                    // O.S. vinculada a um local operacional do cliente
                    { locais_operacionais: { is: { cliente_id: clienteId } } },
                ],
            },
        });
    }

    /** Inativa o cliente sem apagar seu registro ou histórico. */
    async inativar(id: number): Promise<Cliente> {
        try {
            const inativado = await prisma.clientes.update({
                where: { id },
                data: { ativo: false },
            });

            clienteCache.definir(inativado);
            return inativado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Cliente não encontrado',
            });
        }
    }

    /** Reativa o cliente sem apagar seu histórico. */
    async ativar(id: number): Promise<Cliente> {
        try {
            const ativado = await prisma.clientes.update({
                where: { id },
                data: { ativo: true },
            });

            clienteCache.definir(ativado);
            return ativado;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: "Cliente não encontrado",
            });
        }
    }
}

/** Instância única usada pelos services. */
export const repositoryCliente = new RepositoryCliente();
