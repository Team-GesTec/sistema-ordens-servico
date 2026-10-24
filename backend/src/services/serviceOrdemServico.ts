/**
 * services/serviceOrdemServico.ts
/**
 * services/serviceOrdemServico.ts
 *
 * Regras de negócio da O.S.: abertura (US#2.1), edição, atribuição de responsável (US#2.3)
 * e alteração de status (US#2.4).
 *
 * Regras da abertura e da edição:
 *  - tipo, titulo, descricao e departamento_id são obrigatórios;
 *  - data_criacao assume a data atual quando não informada;
 *  - campos opcionais ausentes recebem null no cadastro;
 *  - anterior_id, se informado, deve apontar para uma O.S. existente;
 *  - o status inicial é em_andamento;
 *  - PUT exige os campos obrigatórios; PATCH altera somente os campos enviados.
 *
 * Regras da alteração de status:
 *  - o novo status deve ser um dos 5 oficiais;
 *  - o Gestor altera qualquer O.S.; o Técnico, só as que estão atribuídas a ele;
 *  - O.S. concluída ou bloqueada não tem o status alterado;
 *  - o parecer técnico é obrigatório para concluir e opcional nos demais status;
 *  - a alteração e o registro de auditoria são gravados na mesma transação.
 *
 * Regras do cadastro de O.S. antiga/existente — migração manual (AJ-06-BE):
 *  - a O.S. é tratada como migração quando a data_criacao (abertura) informada está no passado;
 *  - apenas o Gestor cadastra com data de abertura no passado (PE-14); o Técnico recebe 403;
 *  - o status atual pode ser qualquer um dos 5 oficiais;
 *  - status concluido exige parecer_tecnico e data_fim (data de conclusão), como na US#2.4;
 *  - a data de conclusão não pode ser anterior à abertura nem estar no futuro;
 *  - O.S. que já "nasce vencida" é aceita normalmente (não há bloqueio por SLA na criação);
 *  - o cadastro e o registro de auditoria da origem (migração manual) são gravados na mesma transação.
 *
 * Regras do SLA na abertura (3.1-BE01) — o cálculo em si fica em serviceSla.ts:
 *  - Manutenção: data_limite_sla é calculada pela configuração, salvo prazo personalizado do Gestor;
 *  - Manutenção: o Gestor pode substituir o cálculo automático por dias úteis ou uma data específica;
 *  - Instalação: data_limite_sla é a informada pelo Gestor (até 3 meses), ou fica vazia;
 *  - sla_config_id, prazo_dias_uteis, justificativa_sla_manual e sla_manual não são aceitos no corpo;
 *  - a definição inicial do SLA é registrada na auditoria, na mesma transação do cadastro.
 *
 * ALTERAÇÕES (17/10/2026):
 *  - AJ-06-BE: `criar` passa a receber o perfil do usuário logado e trata o cadastro de O.S. antiga.
 *  - 3.1-BE01: `criar` define o SLA pelo serviceSla e audita a definição inicial;
 *    `criarMigracao` virou `criarComAuditoria`, usado por qualquer cadastro que gere auditoria.
 */

import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { AppError } from '../errors/AppError';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import { serviceAuditoria } from './serviceAuditoria';
import { calcularEstadoSla, type EstadoSla } from '../utils/estadoSla';
import { serviceSla } from './serviceSla';
import type { DadosRegistroAuditoria } from '../models/modelAuditoria';
import { bloquearOrdemServico, bloquearProjetosRelacionados, validarProjetoDaOrdem } from '../utils/projetoOsInvariant';
import type { PerfilFuncionario } from '../models/modelFuncionario';
import {
    type DadosCriacaoOrdemServico,
    type DadosAtualizacaoOrdemServico,
    type DadosAlteracaoStatus,
    type OrdemServico,
    STATUS_ORDEM,
    STATUS_PADRAO,
} from '../models/modelOrdemServico';

import {
    campoPresente,
    dataOpcional,
    exigirAlteracoes,
    exigirEnum,
    exigirInteiroPositivo,
    exigirTexto,
    inteiroPositivoOpcional,
    lerCorpo,
    textoOpcional,
    type CorpoRequisicao
} from '../utils/validacao';

const TIPOS_ORDEM_SERVICO = ['instalacao', 'manutencao'] as const;
const NIVEIS_CRITICIDADE = ['baixo', 'medio', 'alto', 'muito_alto', 'urgente'] as const;
const STATUS_ORDEM_SERVICO = ['em_andamento', 'aguardando', 'validacao_testes', 'bloqueado', 'concluido'] as const;

const TEXTO_MAXIMO_DESCRICAO = 1000;
const TEXTO_MAXIMO_TITULO = 60;
const TEXTO_MAXIMO_PARECER = 1000;

/**
 * Folga para diferença de relógio entre o navegador e o servidor (AJ-06).
 * Uma data_criacao só é considerada "no passado" se for anterior a agora menos essa folga.
 */
const TOLERANCIA_DATA_PASSADA_MS = 5 * 60 * 1000;

/** Valor gravado na auditoria para identificar a origem do cadastro de O.S. antiga (AJ-06). */
const ORIGEM_MIGRACAO_MANUAL = 'migracao_manual';

/** Campos de SLA que o sistema define na abertura e o cliente não pode enviar (3.1-BE01). */
const CAMPOS_SLA_DEFINIDOS_PELO_SISTEMA = ['sla_config_id', 'prazo_dias_uteis', 'justificativa_sla_manual'] as const;

/** Registro de auditoria ainda sem o id da O.S. (preenchido depois que ela é criada). */
type RegistroAuditoriaCriacao = Omit<DadosRegistroAuditoria, 'os_id'>;

/**
 * Serializa novas atribuições com a inativação de funcionários. O lock é compartilhado
 * com RepositoryFuncionario e a verificação usa o banco na mesma transação da O.S.
 */
async function bloquearEValidarResponsavelAtivo(
    conexao: Prisma.TransactionClient,
    responsavelId: number | null,
): Promise<void> {
    if (responsavelId === null) return;

    await conexao.$executeRaw`SELECT pg_advisory_xact_lock(734031, 3)`;
    const responsavel = await conexao.funcionarios.findUnique({
        where: { id: responsavelId },
        select: { id: true, ativo: true },
    });
    if (!responsavel) {
        throw AppError.requisicaoInvalida('responsavel_id não corresponde a um funcionário existente');
    }
    if (!responsavel.ativo) {
        throw AppError.conflito('responsavel_id não pode corresponder a um funcionário inativo');
    }
}


/** Campos que a edição geral não altera: cada um tem a sua rota (US#2.4, US#2.3 e US#3.1). */
const CAMPOS_PROIBIDOS_NA_EDICAO = [
    'status',
    'ativo',
    'responsavel_id',
    'sla_config_id',
    'prazo_dias_uteis',
    'data_limite_sla',
    'sla_manual',
    'justificativa_sla_manual',
] as const;

/** Uma O.S. com o estado do SLA calculado no momento da leitura (US#3.2). */
type OrdemServicoComSla = OrdemServico & { estado_sla: EstadoSla };

/** Devolve uma cópia da O.S. com o estado do SLA. Não altera a O.S. original (que pode estar no cache). */
function comEstadoSla(ordem: OrdemServico, agora: Date): OrdemServicoComSla {
    return {...ordem, estado_sla: calcularEstadoSla(ordem,agora)}
}

export class ServiceOrdemServico {
    private readonly repositorio: RepositoryOrdemServico;
    private readonly funcionarios: RepositoryFuncionario;

    constructor(repositorio: RepositoryOrdemServico = repositoryOrdemServico, funcionarios: RepositoryFuncionario = repositoryFuncionario) {
        this.repositorio = repositorio;
        this.funcionarios = funcionarios
    }

    /** Lista somente as O.S. ativas, cada uma com o estado do SLA. */
    async listar(): Promise<OrdemServicoComSla[]> {       const ordens = await this.repositorio.listar();
        const ativas = ordens.filter((ordem) => ordem.ativo);
        const agora = new Date();
        return ativas.map((ordem) => comEstadoSla(ordem,agora));
    }

    /** Lista somente as O.S. inativas, para consulta do histórico. */
    async listarInativas(): Promise<OrdemServico[]> {
        const ordens = await this.repositorio.listar();
        return ordens.filter((ordem) => !ordem.ativo);
    }

    /** Busca uma O.S. pelo id, com o estado do SLA.
     * @throws AppError 404 se não existir.
     */
    async buscarPorId(id: number): Promise<OrdemServicoComSla> {
        const ordem = await this.repositorio.buscarPorId(id);
        if(!ordem) {
            throw AppError.naoEncontrado('OS não encontrada');
        }
        return comEstadoSla(ordem, new Date());
    }

    /**
     * Valida o corpo e abre uma O.S.
     * @param corpo O `req.body` recebido.
     * @param solicitanteId Id do funcionário logado (vem do token, nunca do corpo).
     * @param perfil Perfil do funcionário logado (vem do token, nunca do corpo).
     * @throws AppError 400 se algum campo for inválido ou o `anterior_id` não existir.
     * @throws AppError 403 se um não gestor informar data de abertura no passado (AJ-06)
     *                   ou a data limite de uma O.S. de instalação (3.1-BE01).
     * @throws AppError 422 se faltar configuração de SLA ou a data de instalação passar de 3 meses (3.1-BE01).
     */
    async criar(corpo: unknown, solicitanteId: number, perfil: PerfilFuncionario): Promise<OrdemServico> {
        const dados = lerCorpo(corpo);

        const tipo = exigirEnum(dados.tipo, TIPOS_ORDEM_SERVICO, 'tipo');
        const titulo = exigirTexto(dados.titulo, 'titulo', { maximo: TEXTO_MAXIMO_TITULO });
        const descricao = exigirTexto(dados.descricao, 'descricao', { maximo: TEXTO_MAXIMO_DESCRICAO });

        const departamentoId = exigirInteiroPositivo(dados.departamento_id, 'departamento_id');

        // 3.1-BE01: estes campos de SLA são definidos pelo sistema
        const camposSlaEnviados = CAMPOS_SLA_DEFINIDOS_PELO_SISTEMA.filter((campo) => campoPresente(dados, campo));
        if (camposSlaEnviados.length > 0) {
            throw AppError.requisicaoInvalida(
                `Estes campos são definidos automaticamente pelo cálculo de SLA e não podem ser enviados: ${camposSlaEnviados.join(', ')}`,
            );
        }
        if (dados.sla_manual !== undefined && dados.sla_manual !== null && dados.sla_manual !== false) {
            throw AppError.requisicaoInvalida('O SLA é definido automaticamente na abertura: sla_manual deve ser false');
        }

        const clienteId = inteiroPositivoOpcional(dados.cliente_id, 'cliente_id');
        const responsavelId = inteiroPositivoOpcional(dados.responsavel_id, 'responsavel_id');
        const projetoId = inteiroPositivoOpcional(dados.projeto_id, 'projeto_id');
        const ativoId = inteiroPositivoOpcional(dados.ativo_id, 'ativo_id');
        const anteriorId = inteiroPositivoOpcional(dados.anterior_id, 'anterior_id');
        const criticidade =
            dados.criticidade === undefined || dados.criticidade === null
                ? NIVEIS_CRITICIDADE[1]
                : exigirEnum(dados.criticidade, NIVEIS_CRITICIDADE, 'criticidade');
        const parecerTecnico = textoOpcional(dados.parecer_tecnico, 'parecer_tecnico', { maximo: TEXTO_MAXIMO_DESCRICAO });
        const status =
            dados.status === undefined || dados.status === null
                ? STATUS_PADRAO
                : exigirEnum(dados.status, STATUS_ORDEM, 'status');
        const dataCriacao =
            dados.data_criacao === undefined || dados.data_criacao === null
                ? new Date()
                : dataOpcional(dados.data_criacao, 'data_criacao') ?? new Date();
        const dataInicio = dataOpcional(dados.data_inicio, 'data_inicio');
        const dataFim = dataOpcional(dados.data_fim, 'data_fim');
        const dataLimiteInformada = dataOpcional(dados.data_limite_sla, 'data_limite_sla');
        const prazoDiasUteisPersonalizado = inteiroPositivoOpcional(
            dados.prazo_dias_uteis_custom,
            'prazo_dias_uteis_custom',
        );

        // AJ-06: data de abertura no passado = cadastro de O.S. antiga (migração manual)
        const migracao = ehDataNoPassado(dataCriacao);
        if (migracao) {
            if (perfil !== 'gestor') {
                throw AppError.acessoNegado('Apenas o gestor pode cadastrar O.S. com data de abertura no passado');
            }
            validarMigracao({ status, parecerTecnico, dataCriacao, dataFim });
        }

        if (anteriorId !== null) {
            const anterior = await this.repositorio.buscarPorId(anteriorId);
            if (!anterior) {
                throw AppError.requisicaoInvalida(`anterior_id ${anteriorId} não corresponde a uma O.S. existente`);
            }
        }

        if (responsavelId !== null){
            await this.garantirFuncionarioExiste(responsavelId, 'responsavel_id');
        }

        // 3.1-BE01: define o SLA a partir da data de abertura (inclusive a passada da AJ-06 — PE-08)
        const sla = await serviceSla.definirNaCriacao({
            tipo,
            criticidade,
            abertura: dataCriacao,
            dataLimiteInformada,
            prazoDiasUteisPersonalizado,
            perfil,
        });

        const novaOS: DadosCriacaoOrdemServico = {
            tipo,
            titulo,
            descricao,
            sla_config_id: sla.sla_config_id,
            cliente_id: clienteId,
            departamento_id: departamentoId,
            solicitante_id: solicitanteId,
            responsavel_id: responsavelId,
            projeto_id: projetoId,
            ativo_id: ativoId,
            criticidade: criticidade,
            anterior_id: anteriorId,
            parecer_tecnico: parecerTecnico,
            status,
            data_criacao: dataCriacao,
            prazo_dias_uteis: sla.prazo_dias_uteis,
            data_inicio: dataInicio,
            data_fim: dataFim,
            data_limite_sla: sla.data_limite_sla,
            sla_manual: sla.sla_manual,
            justificativa_sla_manual: sla.sla_manual ? sla.descricao : null,
        };

        const registros: RegistroAuditoriaCriacao[] = [];

        if (migracao) {
            // AJ-06: a data_criacao informada (no passado) é mantida como data de abertura
            registros.push({
                funcionario_id: solicitanteId,
                acao: 'insercao',
                campo_alterado: 'origem',
                dado_antigo: null,
                dado_novo: ORIGEM_MIGRACAO_MANUAL,
                justificativa:
                    'Cadastro de O.S. antiga/existente (migração manual) com abertura em ' +
                    `${novaOS.data_criacao.toISOString()} e status ${novaOS.status}`,
            });
        }

        if (sla.data_limite_sla !== null) {
            // 3.1-BE01: registra a definição inicial do SLA
            registros.push({
                funcionario_id: solicitanteId,
                acao: 'insercao',
                campo_alterado: 'data_limite_sla',
                dado_antigo: null,
                dado_novo: sla.data_limite_sla.toISOString(),
                justificativa: sla.descricao,
            });
        }

        return this.criarComAuditoria(novaOS, registros);
    }

    /**
     * Grava a O.S. e os registros de auditoria do cadastro na mesma transação
     * (origem da migração manual — AJ-06 — e definição inicial do SLA — 3.1-BE01).
     *
     * Criação e validação do projeto compartilham a transação: o lock da linha do projeto
     * serializa este caminho com a inativação do projeto, e a checagem do responsável fecha
     * a corrida com a inativação do funcionário entre a validação e o commit.
     */
    private async criarComAuditoria(
        novaOS: DadosCriacaoOrdemServico,
        registros: RegistroAuditoriaCriacao[],
    ): Promise<OrdemServico> {
        const criada = await prisma.$transaction(async (conexao) => {
            await bloquearEValidarResponsavelAtivo(conexao, novaOS.responsavel_id);
            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [novaOS.projeto_id]);
            validarProjetoDaOrdem(novaOS.projeto_id, true, novaOS.status, projetosBloqueados);

            const ordemCriada = await this.repositorio.criarNaTransacao(novaOS, conexao);

            for (const registro of registros) {
                await serviceAuditoria.registrar({ ...registro, os_id: ordemCriada.id }, conexao);
            }

            return ordemCriada;
        });

        // Atualiza o cache só depois que a transação terminou
        this.repositorio.atualizarCache(criada);
        return criada;
    }

    /**
     * Altera o status de uma O.S. e registra o parecer técnico (US#2.4).
     * @param id Id da O.S. (vem da URL).
     * @param corpo O `req.body` recebido, com `status` e, opcionalmente, `parecer_tecnico`.
     * @param usuario Funcionário logado (vem do token, nunca do corpo).
     * @throws AppError 400 se os dados forem inválidos ou a alteração não for permitida.
     * @throws AppError 403 se o usuário for técnico e não for o responsável pela O.S.
     * @throws AppError 404 se a O.S. não existir.
     */
    async alterarStatus(
        id: number,
        corpo: unknown,
        usuario: { id: number; tipo: PerfilFuncionario },
    ): Promise<OrdemServico> {
        const idOS = exigirInteiroPositivo(id, 'id');
        const dados = lerCorpo(corpo);
        const novoStatus = exigirEnum(dados.status, STATUS_ORDEM_SERVICO, 'status');
        const parecerEnviado =
            dados.parecer_tecnico !== undefined && dados.parecer_tecnico !== null && dados.parecer_tecnico !== '';
        const parecer = parecerEnviado
            ? exigirTexto(dados.parecer_tecnico, 'parecer_tecnico', { maximo: TEXTO_MAXIMO_PARECER })
            : undefined;

        // 2. Busca a O.S.
        const ordem = await this.repositorio.buscarPorId(idOS);
        if (!ordem) {
            throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);
        }

        // 3. Checa a permissão
        const ehGestor = usuario.tipo === 'gestor';
        const ehResponsavel = ordem.responsavel_id === usuario.id;

        //gestor altera qualquer O.S. Os demais, só as atribuídas a eles
        if (!ehGestor && !ehResponsavel) {
            throw AppError.acessoNegado('Apenas o gestor ou o responsável pela O.S. pode alterar o status');
        }

        // bloquear é ação só do gestor


        // 4. Checa a trava: O.S. concluída não muda mais
        if (ordem.status === 'concluido') {
            throw AppError.requisicaoInvalida(`A O.S. ${idOS} está concluída e não pode ter o status alterado`);
        }
        if (ordem.status === 'bloqueado') {
            throw AppError.requisicaoInvalida(
                `A O.S. ${idOS} está bloqueada e não pode ser desbloqueada. ` +
                'Para retomar o trabalho, crie uma nova O.S. vinculada a esta.'
            );
        }

        if (ordem.status === novoStatus) {
            throw AppError.requisicaoInvalida(`A O.S. ${idOS} já está com o status ${novoStatus}`)
        }

        // 5. Checa o parecer: obrigatório para concluir
        if (novoStatus === 'concluido' && parecer === undefined) {
            throw AppError.requisicaoInvalida('parecer_tecnico é obrigatório para concluir a O.S.');
        }

        // 6. Grava o status e a auditoria na mesma transação
        const dadosStatus: DadosAlteracaoStatus = { status: novoStatus };
        if (parecer !== undefined) dadosStatus.parecer_tecnico = parecer;

        const atualizada = await prisma.$transaction(async (conexao) => {
            // Releitura sob lock evita aceitar uma transição usando status em cache
            // enquanto outra requisição conclui a mesma O.S.
            await bloquearOrdemServico(conexao, idOS);
            const ordemAtual = await conexao.ordens_servico.findUnique({ where: { id: idOS } });
            if (!ordemAtual) throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);

            const ehResponsavel = ordemAtual.responsavel_id === usuario.id;
            if (usuario.tipo !== 'gestor' && !ehResponsavel) {
                throw AppError.acessoNegado('Apenas o gestor ou o responsável pela O.S. pode alterar o status');
            }
            if (ordemAtual.status === 'concluido') {
                throw AppError.requisicaoInvalida(`A O.S. ${idOS} está concluída e não pode ter o status alterado`);
            }
            if (ordemAtual.status === 'bloqueado') {
                throw AppError.requisicaoInvalida(
                    `A O.S. ${idOS} está bloqueada e não pode ter o status alterado por esta rota`,
                );
            }
            if (ordemAtual.status === novoStatus) {
                throw AppError.requisicaoInvalida(`A O.S. ${idOS} já está com o status ${novoStatus}`);
            }
            // A obrigatoriedade do parecer é verificada somente depois da existência,
            // autorização e restrições de estado, preservando o contrato 404/403/400.
            if (novoStatus === 'concluido' && parecer === undefined) {
                throw AppError.requisicaoInvalida('parecer_tecnico é obrigatório para concluir a O.S.');
            }

            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [ordemAtual.projeto_id]);
            validarProjetoDaOrdem(ordemAtual.projeto_id, ordemAtual.ativo, novoStatus, projetosBloqueados);
            const ordemAtualizada = await this.repositorio.atualizarStatus(idOS, dadosStatus, conexao);

            await serviceAuditoria.registrar(
                {
                    os_id: idOS,
                    funcionario_id: usuario.id,
                    acao: 'atualizacao',
                    campo_alterado: 'status',
                    dado_antigo: ordemAtual.status,
                    dado_novo: novoStatus,
                    justificativa: parecer ?? null,
                },
                conexao,
            );
            return ordemAtualizada;
        });

        // 7. Atualiza o cache só depois que a transação terminou
        this.repositorio.atualizarCache(atualizada)
        return atualizada;
    }

    /**
     * Valida o corpo e atualiza uma O.S.
     * @param id Id da O.S.
     * @param corpo O `req.body` recebido.
     * @param parcial `false` (PUT): exige todos campos;
     *                ausente vira `null`. `true` (PATCH): altera só o que foi enviado
     *                (ex.: `{ "status": "em_andamento" }`).
     */
    async atualizar(id: number, corpo: unknown, parcial: boolean, usuarioId: number): Promise<OrdemServico> {
        const idOS = exigirInteiroPositivo(id, 'id');

        const atualizada = await prisma.$transaction(async (conexao) => {
            // Mantém existência e estado antes da validação do corpo, como no contrato anterior,
            // mas verifica ambos sobre a linha bloqueada dentro da transação.
            await bloquearOrdemServico(conexao, idOS);
            const ordemAtual = await conexao.ordens_servico.findUnique({ where: { id: idOS } });
            if (!ordemAtual) throw AppError.naoEncontrado('OS não encontrada');
            if (ordemAtual.status === 'concluido') {
                throw AppError.requisicaoInvalida('OS concluída não pode ser editada');
            }
            if (ordemAtual.status === 'bloqueado') {
                throw AppError.requisicaoInvalida('OS bloqueada não pode ser editada');
            }

            const dados = lerCorpo(corpo);
            const proibidos = CAMPOS_PROIBIDOS_NA_EDICAO.filter((campo) => campoPresente(dados, campo));
            if (proibidos.length > 0) {
                throw AppError.requisicaoInvalida(
                    `Estes campos não podem ser alterados por esta rota: ${proibidos.join(', ')}. ` +
                    'Use as rotas próprias de status, responsável ou SLA.',
                );
            }
            const alteracoes = await this.montarAlteracoes(dados, parcial);
            exigirAlteracoes(alteracoes);

            const projetoIdFinal = alteracoes.projeto_id !== undefined
                ? alteracoes.projeto_id
                : ordemAtual.projeto_id;
            const projetosBloqueados = await bloquearProjetosRelacionados(
                conexao,
                [ordemAtual.projeto_id, projetoIdFinal],
            );
            validarProjetoDaOrdem(projetoIdFinal, ordemAtual.ativo, ordemAtual.status, projetosBloqueados);

            const campos = Object.keys(alteracoes) as (keyof DadosAtualizacaoOrdemServico)[];
            const camposAlterados = campos.filter(
                (campo) => paraTextoAuditoria(ordemAtual[campo]) !== paraTextoAuditoria(alteracoes[campo]),
            );
            const ordemAtualizada = await this.repositorio.atualizarNaTransacao(idOS, alteracoes, conexao);
            for (const campo of camposAlterados) {
                await serviceAuditoria.registrar(
                    {
                        os_id: idOS,
                        funcionario_id: usuarioId,
                        acao: 'atualizacao',
                        campo_alterado: campo,
                        dado_antigo: paraTextoAuditoria(ordemAtual[campo]),
                        dado_novo: paraTextoAuditoria(alteracoes[campo]),
                    },
                    conexao,
                );
            }
            return ordemAtualizada;
        });

        this.repositorio.atualizarCache(atualizada);
        return atualizada;
    }

    /**
     * Atribui um funcionário como responsável da O.S.
     * Somente gestores podem executar essa operação.
     * @param id Id da O.S.
     * @param responsavelId Id do funcionário a ser atribuído.
    */
    async atribuirResponsavel(osId: number, responsavelId: number, solicitanteId: number): Promise<OrdemServico> {
        const solicitante = await this.funcionarios.buscarPorId(solicitanteId);

        if (!solicitante) {
            throw AppError.naoEncontrado('Solicitante não encontrado');
        }

        const ordem = await this.repositorio.buscarPorId(osId);

        if (!ordem) {
            throw AppError.naoEncontrado('OS não encontrada');
        }

        if (ordem.status === 'concluido') {
            throw AppError.requisicaoInvalida('Não é possível atribuir um responsável a uma OS concluída');
        }

        // Caso o solicitante seja um técnico
        if (solicitante.tipo === 'tecnico') {
            // Apenas atribuição a si mesmo
            if (responsavelId !== solicitanteId) {
                throw AppError.acessoNegado('Técnicos só podem atribuir OS para si mesmos');
            }

            if (ordem.responsavel_id !== null) {
                throw AppError.requisicaoInvalida('Esta OS já possui um responsável');
            }

            if (ordem.departamento_id !== solicitante.departamento_id) {
                throw AppError.acessoNegado('Técnicos só podem assumir ordens do próprio departamento');
            }
        }

        const responsavel = await this.funcionarios.buscarPorId(responsavelId);

        if (!responsavel) {
            throw AppError.requisicaoInvalida('responsavel_id não corresponde a um funcionário existente');
        }
        if (!responsavel.ativo) {
            throw AppError.conflito('Não é possível atribuir uma O.S. a um funcionário inativo');
        }

        return this.repositorio.atribuirResponsavel({
            osId,
            responsavelId,
            solicitanteId,
            permitirTroca: solicitante.tipo === 'gestor',
        });
    }

    /**
     * Bloqueia uma O.S. e registra a alteração na auditoria.
     * Uma O.S. concluída não pode ser bloqueada.
     */
    async bloquear(id: number, usuarioId: number): Promise<OrdemServico> {
        const idOS = exigirInteiroPositivo(id, "id");
        const ordem = await this.repositorio.buscarPorId(idOS);

        if (!ordem) {
            throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);
        }

        if (ordem.status === "concluido") {
            throw AppError.requisicaoInvalida(
                "Uma O.S. concluída não pode ser bloqueada.",
            );
        }

        if (ordem.status === "bloqueado") {
            throw AppError.requisicaoInvalida(
                "A O.S. já está bloqueada.",
            );
        }

        const atualizada = await prisma.$transaction(async (conexao) => {
            await bloquearOrdemServico(conexao, idOS);
            const ordemAtual = await conexao.ordens_servico.findUnique({ where: { id: idOS } });
            if (!ordemAtual) throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);
            if (ordemAtual.status === "concluido") {
                throw AppError.requisicaoInvalida("Uma O.S. concluída não pode ser bloqueada.");
            }
            if (ordemAtual.status === "bloqueado") {
                throw AppError.requisicaoInvalida("A O.S. já está bloqueada.");
            }

            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [ordemAtual.projeto_id]);
            validarProjetoDaOrdem(ordemAtual.projeto_id, ordemAtual.ativo, "bloqueado", projetosBloqueados);
            const resultado = await this.repositorio.atualizarNaTransacao(
                idOS,
                { status: "bloqueado" },
                conexao,
            );
            await serviceAuditoria.registrar(
                {
                    os_id: idOS,
                    funcionario_id: usuarioId,
                    acao: "atualizacao",
                    campo_alterado: "status",
                    dado_antigo: ordemAtual.status,
                    dado_novo: "bloqueado",
                    justificativa: "Bloqueio da ordem de serviço",
                },
                conexao,
            );

            return resultado;
        });

        this.repositorio.atualizarCache(atualizada);

        return atualizada;
    }

    /**
     * Remove o bloqueio e retorna a O.S. ao status padrão de andamento.
     * A autorização de gestor é aplicada pelo middleware da rota.
     */
    async desbloquear(id: number): Promise<OrdemServico> {
        const ordem = await this.buscarPorId(id);
        if (ordem.status !== 'bloqueado') {
            throw AppError.requisicaoInvalida('A O.S. já está desbloqueada');
        }

        return this.repositorio.atualizar(id, { status: STATUS_PADRAO });
    }

    /**
     * Altera manualmente a data limite do SLA.
     * A autorização de gestor é aplicada pelo middleware da rota.
     * @throws AppError 400 se a O.S. estiver inativa, concluída ou bloqueada.
     */
    async alterarSlaManual(id: number, corpo: unknown, funcionarioId: number): Promise<OrdemServico> {
        const dados = lerCorpo(corpo);
        const dataLimiteSla = exigirDataValida(dados.data_limite_sla, 'data_limite_sla');
        const justificativa = exigirTexto(
            dados.justificativa_sla_manual,
            'justificativa_sla_manual',
        );

        const ordem = await this.buscarPorId(id);

        if (!ordem.ativo) {
            throw AppError.requisicaoInvalida(`A O.S. ${id} está inativa e não pode ter o prazo alterado`);
        }

        if (ordem.status === 'concluido' || ordem.status === 'bloqueado') {
            throw AppError.requisicaoInvalida(
                `A O.S. ${id} está ${ordem.status === 'concluido' ? 'concluída' : 'bloqueada'} e não pode ter o prazo alterado`,
            );
        }

        return this.repositorio.alterarSlaManual({
            osId: id,
            dataLimiteSla,
            justificativa,
            funcionarioId,
        });
    }
    /** Remove uma O.S. (bloqueada pelo banco se houver vínculos). */
    remover(id: number): Promise<void> {
        return this.repositorio.remover(id);
    }

    /**
     * Ativa ou inativa uma O.S. sem apagar seu registro.
     * Registra a alteração na auditoria dentro da mesma transação.
     */
    async alterarAtivo(
        id: number,
        ativo: boolean,
        usuarioId: number,
    ): Promise<OrdemServico> {
        const idOS = exigirInteiroPositivo(id, "id");
        if (typeof ativo !== "boolean") {
            throw AppError.requisicaoInvalida("O campo ativo deve ser true ou false");
        }

        const atualizada = await prisma.$transaction(async (conexao) => {
            await bloquearOrdemServico(conexao, idOS);
            const ordemAtual = await conexao.ordens_servico.findUnique({ where: { id: idOS } });
            if (!ordemAtual) throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);
            if (ordemAtual.ativo === ativo) {
                throw AppError.requisicaoInvalida(
                    ativo ? `A O.S. ${idOS} já está ativa` : `A O.S. ${idOS} já está inativa`,
                );
            }

            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [ordemAtual.projeto_id]);
            validarProjetoDaOrdem(ordemAtual.projeto_id, ativo, ordemAtual.status, projetosBloqueados);
            const resultado = await this.repositorio.atualizarNaTransacao(idOS, { ativo }, conexao);
            await serviceAuditoria.registrar(
                {
                    os_id: idOS,
                    funcionario_id: usuarioId,
                    acao: "atualizacao",
                    campo_alterado: "ativo",
                    dado_antigo: String(ordemAtual.ativo),
                    dado_novo: String(ativo),
                    justificativa: ativo ? "Reativação da ordem de serviço" : "Inativação da ordem de serviço",
                },
                conexao,
            );
            return resultado;
        });
        this.repositorio.atualizarCache(atualizada);
        return atualizada;
    }
    private async garantirFuncionarioExiste(funcionarioId: number, campo: string): Promise<void> {
        const funcionario = await this.funcionarios.buscarPorId(funcionarioId);

        if (!funcionario) {
            throw AppError.requisicaoInvalida(`${campo} não corresponde a um funcionário existente`);
        }
        if (!funcionario.ativo) {
            throw AppError.conflito(`${campo} não pode corresponder a um funcionário inativo`);
        }
    }

    /** Monta o objeto de alterações conforme o modo (PUT ou PATCH). */
    private async montarAlteracoes(dados: CorpoRequisicao, parcial: boolean): Promise<DadosAtualizacaoOrdemServico> {
        const alteracoes: DadosAtualizacaoOrdemServico = {};

        if (!parcial || campoPresente(dados, 'tipo')) {
            alteracoes.tipo = exigirEnum(
                dados.tipo,
                TIPOS_ORDEM_SERVICO,
                'tipo',
            );
        }

        if (!parcial || campoPresente(dados, 'titulo')) {
            alteracoes.titulo = exigirTexto(dados.titulo, 'titulo', {
                maximo: TEXTO_MAXIMO_TITULO,
            });
        }

        if (!parcial || campoPresente(dados, 'descricao')) {
            alteracoes.descricao = exigirTexto(
                dados.descricao,
                'descricao',
                { maximo: TEXTO_MAXIMO_DESCRICAO },
            );
        }

        if (!parcial || campoPresente(dados, 'departamento_id')) {
            alteracoes.departamento_id = exigirInteiroPositivo(
                dados.departamento_id,
                'departamento_id',
            );
        }

        if (!parcial || campoPresente(dados, 'cliente_id')) {
            alteracoes.cliente_id = inteiroPositivoOpcional(
                dados.cliente_id,
                'cliente_id',
            );
        }

        if (!parcial || campoPresente(dados, 'projeto_id')) {
            alteracoes.projeto_id = inteiroPositivoOpcional(
                dados.projeto_id,
                'projeto_id',
            );
        }

        if (!parcial || campoPresente(dados, 'ativo_id')) {
            alteracoes.ativo_id = inteiroPositivoOpcional(
                dados.ativo_id,
                'ativo_id',
            );
        }

        if (!parcial || campoPresente(dados, 'anterior_id')) {
            const anteriorId = inteiroPositivoOpcional(
                dados.anterior_id,
                'anterior_id',
            );

            if (anteriorId !== null) {
                const anterior = await this.repositorio.buscarPorId(anteriorId);

                if (!anterior) {
                    throw AppError.requisicaoInvalida(
                        `anterior_id ${anteriorId} não corresponde a uma O.S. existente`,
                    );
                }
            }

            alteracoes.anterior_id = anteriorId;
        }

        if (!parcial || campoPresente(dados, 'criticidade')) {
            alteracoes.criticidade = exigirEnum(
                dados.criticidade,
                NIVEIS_CRITICIDADE,
                'criticidade',
            );
        }

        if (!parcial || campoPresente(dados, 'parecer_tecnico')) {
            alteracoes.parecer_tecnico = textoOpcional(
                dados.parecer_tecnico,
                'parecer_tecnico',
                { maximo: TEXTO_MAXIMO_DESCRICAO },
            );
        }

        if (!parcial || campoPresente(dados, 'data_criacao')) {
            alteracoes.data_criacao =
                dados.data_criacao === undefined || dados.data_criacao === null
                    ? new Date()
                    : exigirDataValida(
                        dados.data_criacao,
                        'data_criacao',
                    );
        }

        if (!parcial || campoPresente(dados, 'data_inicio')) {
            alteracoes.data_inicio = dataOpcional(
                dados.data_inicio,
                'data_inicio',
            );
        }

        if (!parcial || campoPresente(dados, 'data_fim')) {
            alteracoes.data_fim = dataOpcional(
                dados.data_fim,
                'data_fim',
            );
        }

        return alteracoes;
    }

}

function exigirDataValida(valor: unknown, campo: string): Date {
    if (typeof valor !== 'string' && typeof valor !== 'number' && !(valor instanceof Date)) {
        throw AppError.requisicaoInvalida(`${campo} deve ser uma data válida`);
    }

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        throw AppError.requisicaoInvalida(`${campo} deve ser uma data válida`);
    }
    return data;
}


/** Indica se a data está no passado, descontando a folga de relógio (AJ-06). */
function ehDataNoPassado(data: Date): boolean {
    return data.getTime() < Date.now() - TOLERANCIA_DATA_PASSADA_MS;
}

/**
 * Valida os dados de uma O.S. antiga/existente (AJ-06-BE).
 * Concluída exige parecer técnico e data de conclusão (data_fim), seguindo a regra da US#2.4.
 * @throws AppError 400 se faltar parecer/data de conclusão ou se a data de conclusão for inválida.
 */
function validarMigracao(dados: {
    status: string;
    parecerTecnico: string | null;
    dataCriacao: Date;
    dataFim: Date | null;
}): void {
    if (dados.status !== 'concluido') {
        return;
    }

    if (dados.parecerTecnico === null) {
        throw AppError.requisicaoInvalida('parecer_tecnico é obrigatório para cadastrar uma O.S. concluída');
    }

    if (dados.dataFim === null) {
        throw AppError.requisicaoInvalida('data_fim (data de conclusão) é obrigatória para cadastrar uma O.S. concluída');
    }

    if (dados.dataFim.getTime() < dados.dataCriacao.getTime()) {
        throw AppError.requisicaoInvalida('data_fim (data de conclusão) não pode ser anterior à data de abertura');
    }

    if (dados.dataFim.getTime() > Date.now() + TOLERANCIA_DATA_PASSADA_MS) {
        throw AppError.requisicaoInvalida('data_fim (data de conclusão) não pode estar no futuro');
    }
}

/** Converte um valor para texto, no formato gravado na auditoria. */
function paraTextoAuditoria(valor: unknown): string | null {
    if (valor === null || valor === undefined) {
        return null;
    }
    if (valor instanceof Date) {
        return valor.toISOString();
    }
    return String(valor);
}


/** Instância única usada pelo controller. */
export const serviceOrdemServico = new ServiceOrdemServico();