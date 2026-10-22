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
import { AppError } from '../errors/AppError';
import type { Cliente, DadosAtualizacaoCliente, DadosCriacaoCliente } from '../models/modelCliente';

export class RepositoryCliente {
    /** Lista todos os clientes (cache → banco). */
    async listar(): Promise<Cliente[]> {
        return clienteCache.obterTodos(() => prisma.clientes.findMany({ orderBy: { id: 'asc' } }));
    }


    /** Lista somente clientes ativos usados por O.S. visíveis ou projetos ativos do departamento. */
    async listarVisiveisParaDepartamento(
        departamentoId: number,
        funcionarioId: number,
        perfil: 'analista' | 'tecnico',
        incluirInativos = false,
    ): Promise<Cliente[]> {
        const ordemWhere = perfil === 'tecnico'
            ? {
                ...(incluirInativos ? {} : { ativo: true }),
                departamento_id: departamentoId,
                OR: [
                    { responsavel_id: null },
                    { responsavel_id: funcionarioId },
                    { solicitante_id: funcionarioId },
                ],
            }
            : { ...(incluirInativos ? {} : { ativo: true }), departamento_id: departamentoId };
        const ordens = await prisma.ordens_servico.findMany({
            where: ordemWhere,
            select: { cliente_id: true, projeto_id: true, ativo_id: true },
        });
        const projetosNoDepartamento = await prisma.projetos.findMany({
            where: {
                OR: [
                    { ...(incluirInativos ? {} : { ativo: true }), projetos_departamentos: { some: { departamento_id: departamentoId } } },
                    { id: { in: [...new Set(ordens.map((ordem) => ordem.projeto_id).filter((id): id is number => id !== null))] } },
                ],
            },
            select: { id: true, cliente_id: true },
        });
        const locais = await prisma.locais_operacionais.findMany({
            where: { id: { in: [...new Set(ordens.map((ordem) => ordem.ativo_id).filter((id): id is number => id !== null))] } },
            select: { cliente_id: true },
        });
        const idsClientes = [...new Set([
            ...ordens.map((ordem) => ordem.cliente_id).filter((id): id is number => id !== null),
            ...projetosNoDepartamento.map((projeto) => projeto.cliente_id),
            ...locais.map((local) => local.cliente_id),
        ])];
        if (idsClientes.length === 0) return [];
        return prisma.clientes.findMany({
            where: { id: { in: idsClientes }, ativo: !incluirInativos },
            orderBy: { id: 'asc' },
        });
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
            const atualizado = await prisma.$transaction(async (tx) => {
                const bloqueios = await tx.$queryRaw<Array<{ id: number; ativo: boolean }>>`
                    SELECT "id", "ativo" FROM "clientes" WHERE "id" = ${id} FOR UPDATE
                `;
                const atual = bloqueios[0];
                if (!atual) throw AppError.naoEncontrado('Cliente não encontrado');
                if (!atual.ativo) throw AppError.conflito('Cliente inativo é somente histórico e não pode ser editado.');
                return tx.clientes.update({
                    where: { id },
                    data: {
                        ...(dados.nome !== undefined && { nome: dados.nome }),
                        ...(dados.razao_social !== undefined && { razao_social: dados.razao_social }),
                        ...(dados.ramo_atuacao !== undefined && { ramo_atuacao: dados.ramo_atuacao }),
                        ...(dados.locais_operacionais !== undefined && {
                            locais_operacionais: { create: dados.locais_operacionais },
                        }),
                    },
                });
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


}

/** Instância única usada pelos services. */
export const repositoryCliente = new RepositoryCliente();
