/**
 * repositories/repositoryOrdemServico.ts
 *
 * Acesso a dados de OS: ÚNICO lugar que fala com `prisma.ordens_servico`.
 * Leituras passam pelo cache; escritas vão ao banco e, confirmadas, atualizam o cache.
 */


import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { ordemServicoCache } from '../cache/ordemServicoCache';
import { traduzirErroPrisma } from '../errors/tratarErroPrisma';
import type {
    OrdemServico,
    DadosCriacaoOrdemServico,
    DadosAtualizacaoOrdemServico,
    DadosAlteracaoStatus,
} from '../models/modelOrdemServico';
import { AppError } from '../errors/AppError';

/** Mensagem para quando algum registro aponta para um id inexistente. */
const REFERENCIA_INVALIDA = 'cliente_id, departamento_id, solicitante_id, projeto_id ou anterior_id não corresponde a um registro existente';



/** Escopo autenticado usado para listagem, histórico e relatórios. */
export interface UsuarioEscopoOrdemServico {
    id: number;
    tipo: string;
    departamento_id: number;
}

function filtroVisibilidade(usuario: UsuarioEscopoOrdemServico, incluirInativas = false): Prisma.ordens_servicoWhereInput {
    const estado: Prisma.ordens_servicoWhereInput = incluirInativas ? { ativo: false } : { ativo: true };
    const perfil = String(usuario.tipo);

    if (perfil === 'gestor') return estado;
    if (perfil === 'analista') {
        return { ...estado, departamento_id: usuario.departamento_id };
    }
    if (perfil === 'tecnico') {
        return {
            ...estado,
            OR: [
                { departamento_id: usuario.departamento_id, responsavel_id: null },
                { departamento_id: usuario.departamento_id, responsavel_id: usuario.id },
                { departamento_id: usuario.departamento_id, solicitante_id: usuario.id },
            ],
        };
    }
    // Perfis não representados no modelo atual falham fechados.
    return { id: -1 };
}

const RELACOES_RELATORIO = {
    clientes: { select: { id: true, nome: true, razao_social: true } },
    projetos: { select: { id: true, nome: true, status: true, ativo: true } },
    departamentos: { select: { id: true, nome: true } },
    funcionarios_ordens_servico_responsavel_idTofuncionarios: {
        select: { id: true, nome: true, usuario: true, ativo: true },
    },
    funcionarios_ordens_servico_solicitante_idTofuncionarios: {
        select: { id: true, nome: true, usuario: true },
    },
} as const;

interface DadosAtribuicaoResponsavel {
    osId: number;
    responsavelId: number;
    solicitanteId: number;
}

export class RepositoryOrdemServico {
    /** Lista todas as OS (cache → banco), mais recentes primeiro. */
    async listar(): Promise<OrdemServico[]> {
        return ordemServicoCache.obterTodos(() => prisma.ordens_servico.findMany({ orderBy: { data_criacao: 'desc' } }));
    }

    /** Busca uma ordem de serviço pelo id (cache → banco). Devolve `null` se não existir. */
    async buscarPorId(id: number): Promise<OrdemServico | null> {
        return ordemServicoCache.obterPorId(id, () => prisma.ordens_servico.findUnique({ where: { id } }));
    }

    /** Lista somente O.S. autorizadas ao usuário, consultando diretamente o banco. */
    async listarVisiveis(usuario: UsuarioEscopoOrdemServico, incluirInativas = false): Promise<OrdemServico[]> {
        return prisma.ordens_servico.findMany({
            where: filtroVisibilidade(usuario, incluirInativas),
            orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
        });
    }

    /** Busca por ID com filtro de autorização aplicado no próprio SELECT. */
    async buscarVisivel(id: number, usuario: UsuarioEscopoOrdemServico, incluirInativas = false): Promise<OrdemServico | null> {
        const escopo = filtroVisibilidade(usuario, incluirInativas);
        if (String(usuario.tipo) === 'gestor') {
            return prisma.ordens_servico.findFirst({ where: { id, ...(incluirInativas ? { ativo: false } : {}) } });
        }
        return prisma.ordens_servico.findFirst({ where: { id, ...escopo } });
    }

    /** Busca ativo ou inativo dentro do mesmo escopo, sem revelar registros fora da atribuição. */
    async buscarVisivelComHistorico(id: number, usuario: UsuarioEscopoOrdemServico): Promise<OrdemServico | null> {
        const ativo = await this.buscarVisivel(id, usuario);
        if (ativo) return ativo;
        return this.buscarVisivel(id, usuario, true);
    }

    /** Consulta detalhada com relações, já limitada pelo escopo de acesso do usuário. */
    async buscarVisivelParaRelatorio(id: number, usuario: UsuarioEscopoOrdemServico) {
        const perfil = String(usuario.tipo);
        if (perfil === 'gestor') {
            return prisma.ordens_servico.findFirst({ where: { id }, include: RELACOES_RELATORIO });
        }
        const ativa = await prisma.ordens_servico.findFirst({
            where: { id, ...filtroVisibilidade(usuario) },
            include: RELACOES_RELATORIO,
        });
        if (ativa) return ativa;
        return prisma.ordens_servico.findFirst({
            where: { id, ...filtroVisibilidade(usuario, true) },
            include: RELACOES_RELATORIO,
        });
    }

    /** Dados com relações para exportação, mantendo o filtro de escopo no banco. */
    async listarVisiveisParaRelatorio(usuario: UsuarioEscopoOrdemServico, incluirInativas = false) {
        return prisma.ordens_servico.findMany({
            where: filtroVisibilidade(usuario, incluirInativas),
            include: RELACOES_RELATORIO,
            orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
        });
    }

    /** Recupera somente o instante da auditoria mais recente, sem expor o histórico completo. */
    async buscarDataUltimaAtualizacaoRegistrada(osId: number): Promise<Date | null> {
        const registro = await prisma.auditoria.findFirst({
            where: { os_id: osId },
            orderBy: [{ data_modificacao: 'desc' }, { id: 'desc' }],
            select: { data_modificacao: true },
        });
        return registro?.data_modificacao ?? null;
    }

    /** Cria uma OS no banco e coloca no cache. */
    async criar(dados: DadosCriacaoOrdemServico): Promise<OrdemServico> {
        try {
            const criada = await prisma.ordens_servico.create({ data: dados });
            ordemServicoCache.definir(criada);
            return criada;
        } catch (erro) {
            throw traduzirErroPrisma(erro, { referenciaInvalida: REFERENCIA_INVALIDA });
        }
    }

    /**
     * Cria uma OS dentro de uma transação (usado no cadastro de O.S. antiga — AJ-06).
     * Não mexe no cache: quem chama deve chamar `atualizarCache` depois que a transação terminar.
     */
    async criarNaTransacao(
        dados: DadosCriacaoOrdemServico,
        conexao: Prisma.TransactionClient,
    ): Promise<OrdemServico> {
        try {
            return await conexao.ordens_servico.create({ data: dados });
        } catch (erro) {
            throw traduzirErroPrisma(erro, { referenciaInvalida: REFERENCIA_INVALIDA });
        }
    }

    /** Atualiza os campos informados de uma OS e atualiza o cache. */
    async atualizar(id: number, dados: DadosAtualizacaoOrdemServico): Promise<OrdemServico> {
        try {
            const atualizada = await prisma.ordens_servico.update({ where: { id }, data: dados });
            ordemServicoCache.definir(atualizada);
            return atualizada;
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Ordem de Serviço não encontrada',
                referenciaInvalida: REFERENCIA_INVALIDA
            });
        }
    }

        /**
     * Atualiza os campos informados de uma OS dentro de uma transação.
     * Não mexe no cache: quem chama deve chamar `limparCache` depois que a transação terminar.
     */
    async atualizarNaTransacao(
        id: number,
        dados: DadosAtualizacaoOrdemServico,
        conexao: Prisma.TransactionClient,
    ): Promise<OrdemServico> {
        try {
            return await conexao.ordens_servico.update({ where: { id }, data: dados });
        } catch (erro) {
            throw traduzirErroPrisma(erro, {
                registroNaoEncontrado: 'Ordem de Serviço não encontrada',
                referenciaInvalida: REFERENCIA_INVALIDA,
            });
        }
    }

    /** Coloca no cache a versão já gravada de uma OS. Chamar depois que a transação terminar. */
    atualizarCache(ordem: OrdemServico): void {
        ordemServicoCache.definir(ordem);
    }


    /**
     * Atribui ou substitui o responsável e registra a auditoria na mesma transação.
     *
     * A atualização condicional impede que duas requisições sobrescrevam uma à outra.
    */
    async atribuirResponsavel(dados: DadosAtribuicaoResponsavel): Promise<OrdemServico> {
        const { osId, responsavelId, solicitanteId } = dados;

        const atualizada = await prisma.$transaction(async (tx) => {
            // Serializa a atribuição com a inativação de funcionários e valida o estado no banco.
            // Retorna um tipo suportado pelo Prisma: pg_advisory_xact_lock retorna void.
            // O lock continua sendo transacional e usa a mesma chave de sincronização existente.
            await tx.$queryRaw`
                WITH advisory_lock AS (
                    SELECT pg_advisory_xact_lock(734031, 3)
                )
                SELECT 1::int AS lock_acquired
                FROM advisory_lock
            `;

            // A leitura de existência é autoritativa. buscarPorId usa cache e pode retornar null
            // quando a lista completa está válida, mas não contém um registro recém-criado/em outra instância.
            const ordemAtual = await tx.ordens_servico.findUnique({ where: { id: osId } });
            if (!ordemAtual) {
                throw AppError.naoEncontrado('OS não encontrada');
            }
            if (!ordemAtual.ativo) {
                throw AppError.conflito('Não é possível atribuir responsável a uma O.S. inativa');
            }
            if (ordemAtual.status === 'concluido') {
                throw AppError.requisicaoInvalida('Não é possível atribuir um responsável a uma OS concluída');
            }

            const solicitante = await tx.funcionarios.findUnique({
                where: { id: solicitanteId },
                select: { id: true, departamento_id: true, tipo: true, ativo: true },
            });
            if (!solicitante || !solicitante.ativo) {
                throw AppError.naoAutenticado('Solicitante não encontrado ou inativo');
            }

            const perfilSolicitante = String(solicitante.tipo);
            if (perfilSolicitante !== 'gestor' && perfilSolicitante !== 'analista' && perfilSolicitante !== 'tecnico') {
                throw AppError.acessoNegado('Perfil sem permissão para atribuir responsáveis a O.S.');
            }
            if (perfilSolicitante === 'analista') {
                const departamentoResponsavel = await tx.departamentos.findFirst({ where: { id: ordemAtual.departamento_id, responsavel_id: solicitanteId }, select: { id: true } });
                if (ordemAtual.departamento_id !== solicitante.departamento_id || !departamentoResponsavel) {
                    throw AppError.acessoNegado('Analista/Líder só pode atribuir O.S. do departamento sob sua responsabilidade.');
                }
            }

            if (perfilSolicitante === 'tecnico') {
                // Técnico só pode assumir a si mesmo, de uma O.S. sem responsável do próprio setor.
                if (responsavelId !== solicitanteId) {
                    throw AppError.acessoNegado('Técnicos só podem assumir O.S. para si mesmos');
                }
                if (ordemAtual.responsavel_id !== null) {
                    throw AppError.requisicaoInvalida('Esta O.S. já possui um responsável');
                }
                if (ordemAtual.departamento_id !== solicitante.departamento_id) {
                    throw AppError.acessoNegado('Técnicos só podem assumir ordens do próprio departamento');
                }
            }

            const responsavel = responsavelId === solicitanteId
                ? solicitante
                : await tx.funcionarios.findUnique({
                    where: { id: responsavelId },
                    select: { id: true, ativo: true, departamento_id: true, tipo: true },
                });
            if (!responsavel) {
                throw AppError.requisicaoInvalida('responsavel_id não corresponde a um funcionário existente');
            }
            if (!responsavel.ativo) {
                throw AppError.conflito('Não é possível atribuir uma O.S. a um funcionário inativo');
            }
            if (perfilSolicitante === 'analista' && 'departamento_id' in responsavel && responsavel.departamento_id !== ordemAtual.departamento_id) {
                throw AppError.acessoNegado('Analista/Líder só pode atribuir O.S. a integrantes do próprio departamento.');
            }
            if (ordemAtual.responsavel_id === responsavelId) {
                throw AppError.conflito('O funcionário selecionado já é o responsável atual da O.S.');
            }

            // Compare-and-set: alterações concorrentes de status, departamento, estado ou responsável
            // fazem a atualização falhar, antes de qualquer evento de auditoria.
            const resultado = await tx.ordens_servico.updateMany({
                where: {
                    id: osId,
                    status: ordemAtual.status,
                    ativo: ordemAtual.ativo,
                    departamento_id: ordemAtual.departamento_id,
                    responsavel_id: ordemAtual.responsavel_id,
                },
                data: { responsavel_id: responsavelId },
            });
            if (resultado.count !== 1) {
                throw AppError.conflito('A O.S. foi alterada por outra operação. Atualize os detalhes e tente novamente.');
            }

            // Auditoria somente para uma alteração confirmada, dentro da mesma transação.
            await tx.auditoria.create({
                data: {
                    os_id: osId,
                    funcionario_id: solicitanteId,
                    acao: 'atualizacao',
                    campo_alterado: 'responsavel_id',
                    dado_antigo: ordemAtual.responsavel_id?.toString() ?? null,
                    dado_novo: responsavelId.toString(),
                },
            });

            return tx.ordens_servico.findUniqueOrThrow({ where: { id: osId } });
        });

        // Defina o registro confirmado em vez de removê-lo: a EntityCache considera um ID ausente
        // como inexistente enquanto a lista completa está válida e não consulta o banco nesse caso.
        ordemServicoCache.definir(atualizada);
        return atualizada;
    }
    /** Grava o novo status e o parecer técnico de uma O.S. que já existe. */
    async atualizarStatus(
        id: number,
        dados: DadosAlteracaoStatus,
        conexao: Prisma.TransactionClient = prisma,
    ): Promise<OrdemServico> {
        const atualizada = await conexao.ordens_servico.update({
            where: { id },
            data: dados,
        });
        return atualizada;
    }
}

/** Instância única usada pelos services. */
export const repositoryOrdemServico = new RepositoryOrdemServico();
