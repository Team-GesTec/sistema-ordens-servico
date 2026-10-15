/**
 * services/serviceOrdemServico.ts
 * 
 * Regras de negócio e abertura de O.S. (US#2.1)
 * 
 * Regras:
 *  - tipo, titulo, descricao, departamento_id e sla_manual são obrigatórios;
 *  - data_criacao assume a data atual quando não informada;
 *  - campos opcionais ausentes recebem null no cadastro;
 *  - anterior_id, se informado, deve apontar para uma O.S. existente;
 *  - o status inicial é em_andamento;
 *  - PUT exige os campos obrigatórios; PATCH altera somente os campos enviados.
 */

import { AppError } from '../errors/AppError';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import {
    type DadosCriacaoOrdemServico,
    type DadosAtualizacaoOrdemServico,
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

const TEXTO_MAXIMO_DESCRICAO = 1000;
const TEXTO_MAXIMO_TITULO = 60;

export class ServiceOrdemServico {
    private readonly repositorio: RepositoryOrdemServico;
    private readonly funcionarios: RepositoryFuncionario;

    constructor(repositorio: RepositoryOrdemServico = repositoryOrdemServico, funcionarios: RepositoryFuncionario = repositoryFuncionario) {
        this.repositorio = repositorio;
        this.funcionarios = funcionarios
    }

    /** Lista todas as O.S. cadastradas, sem filtro (por enquanto). */
    async listar(): Promise<OrdemServico[]> {
        return this.repositorio.listar();
    }

    /** Busca uma O.S. pelo id.
     * @throws AppError 404 se não existir.
     */
    async buscarPorId(id: number): Promise<OrdemServico> {
        const ordem = await this.repositorio.buscarPorId(id);
        if(!ordem) {
            throw AppError.naoEncontrado('OS não encontrada');
        }
        return ordem;
    }

    /**
     * Valida o corpo e abre uma O.S.
     * @param corpo O `req.body` recebido.
     * @param solicitanteId Id do funcionário logado (vem do token, nunca do corpo).
     * @throws AppError 400 se algum campo for inválido ou o `anterior_id` não existir.
     */
    async criar(corpo: unknown, solicitanteId: number): Promise<OrdemServico> {
        const dados = lerCorpo(corpo);

        const tipo = exigirEnum(dados.tipo, TIPOS_ORDEM_SERVICO, 'tipo');
        const titulo = exigirTexto(dados.titulo, 'titulo', { maximo: TEXTO_MAXIMO_TITULO });
        const descricao = exigirTexto(dados.descricao, 'descricao', { maximo: TEXTO_MAXIMO_DESCRICAO });

        const departamentoId = exigirInteiroPositivo(dados.departamento_id, 'departamento_id');

        const slaManual = Boolean(dados.sla_manual);
        const slaConfigId = inteiroPositivoOpcional(dados.sla_config_id, 'sla_config_id');
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
        const prazoDiasUteis = inteiroPositivoOpcional(dados.prazo_dias_uteis, 'prazo_dias_uteis');
        const dataInicio = dataOpcional(dados.data_inicio, 'data_inicio');
        const dataFim = dataOpcional(dados.data_fim, 'data_fim');
        const dataLimiteSla = dataOpcional(dados.data_limite_sla, 'data_limite_sla');
        const justificativaSlaManual = textoOpcional(dados.justificativa_sla_manual, 'justficativa_sla_manual');

        if (anteriorId !== null) {
            const anterior = await this.repositorio.buscarPorId(anteriorId);
            if (!anterior) {
                throw AppError.requisicaoInvalida(`anterior_id ${anteriorId} não corresponde a uma O.S. existente`);
            }
        }

        if (responsavelId !== null){
            await this.garantirFuncionarioExiste(responsavelId, 'responsavel_id');
        }

        const novaOS: DadosCriacaoOrdemServico = {
            tipo,
            titulo,
            descricao,
            sla_config_id: slaConfigId,
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
            prazo_dias_uteis: prazoDiasUteis,
            data_inicio: dataInicio,
            data_fim: dataFim,
            data_limite_sla: dataLimiteSla,
            sla_manual: slaManual,
            justificativa_sla_manual: justificativaSlaManual
        };

        return this.repositorio.criar(novaOS);
    }

    /**
     * Valida o corpo e atualiza uma O.S.
     * @param id Id da O.S.
     * @param corpo O `req.body` recebido.
     * @param parcial `false` (PUT): exige todos campos;
     *                ausente vira `null`. `true` (PATCH): altera só o que foi enviado
     *                (ex.: `{ "status": "em_andamento" }`).
     */
    async atualizar(id: number, corpo: unknown, parcial: boolean): Promise<OrdemServico> {
        const dados = lerCorpo(corpo);
        const alteracoes = await this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);
        return this.repositorio.atualizar(id, alteracoes);
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

        return this.repositorio.atribuirResponsavel({
            osId,
            responsavelId,
            solicitanteId,
            permitirTroca: solicitante.tipo === 'gestor',
        });
    }

    /** 
     * Bloqueia uma O.S.
     * Somente gestores podem executar essa opeação.
     * @param id Id da O.S.
     */
    async bloquear(id: number): Promise<OrdemServico> {
        const ordem = await this.repositorio.buscarPorId(id);

        if (!ordem) {
            throw AppError.naoEncontrado('OS não encontrada');
        }

        if (ordem.status === 'bloqueado') {
            throw AppError.requisicaoInvalida('A O.S. já está bloqueada');
        }

        return this.repositorio.atualizar(id, { status: 'bloqueado' });
    }

    /** 
     * Desbloqueia uma O.S.
     * Somente gestores podem executar essa opeação.
     * @param id Id da O.S.
     */
    async desbloquear(id: number): Promise<OrdemServico> {
        const ordem = await this.repositorio.buscarPorId(id);

        if (!ordem) {
            throw AppError.naoEncontrado('OS não encontrada');
        }

        if (ordem.status !== 'bloqueado') {
            throw AppError.requisicaoInvalida('A O.S. já está desbloqueada');
        }

        return this.repositorio.atualizar(id, { status: 'em_andamento' });
    }

    /** Remove um projeto (bloqueado pelo banco se houver vinculos). */
    remover(id: number): Promise<void> {
        return this.repositorio.remover(id);
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

        if (!parcial || campoPresente(dados, 'sla_config_id')) {
            alteracoes.sla_config_id = inteiroPositivoOpcional(
                dados.sla_config_id,
                'sla_config_id',
            );
        }

        if (!parcial || campoPresente(dados, 'cliente_id')) {
            alteracoes.cliente_id = inteiroPositivoOpcional(
                dados.cliente_id,
                'cliente_id',
            );
        }

        if (!parcial || campoPresente(dados, 'responsavel_id')) {
            const responsavelId = inteiroPositivoOpcional(
                dados.responsavel_id,
                'responsavel_id',
            );

            if (responsavelId !== null) {
                await this.garantirFuncionarioExiste(
                    responsavelId,
                    'responsavel_id',
                );
            }

            alteracoes.responsavel_id = responsavelId;
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

        if (!parcial || campoPresente(dados, 'status')) {
            alteracoes.status = exigirEnum(
                dados.status,
                STATUS_ORDEM,
                'status',
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

        if (!parcial || campoPresente(dados, 'prazo_dias_uteis')) {
            alteracoes.prazo_dias_uteis = inteiroPositivoOpcional(
                dados.prazo_dias_uteis,
                'prazo_dias_uteis',
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

        if (!parcial || campoPresente(dados, 'data_limite_sla')) {
            alteracoes.data_limite_sla = dataOpcional(
                dados.data_limite_sla,
                'data_limite_sla',
            );
        }

        if (!parcial || campoPresente(dados, 'sla_manual')) {
            alteracoes.sla_manual = exigirBoolean(
                dados.sla_manual,
                'sla_manual',
            );
        }

        if (!parcial || campoPresente(dados, 'justificativa_sla_manual')) {
            alteracoes.justificativa_sla_manual = textoOpcional(
                dados.justificativa_sla_manual,
                'justificativa_sla_manual',
            );
        }

        return alteracoes;
    }

    private async garantirFuncionarioExiste(funcionarioId: number, campo: string): Promise<void> {
        const funcionario = await this.funcionarios.buscarPorId(funcionarioId);

        if (!funcionario) {
            throw AppError.requisicaoInvalida(`${campo} não corresponde a um funcionário existente`);
        }
    }
}

function exigirBoolean(valor: unknown, campo: string): boolean {
    if (typeof valor !== 'boolean') {
        throw AppError.requisicaoInvalida(`${campo} deve ser um boolean`);
    }
    return valor;
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
/** Instância única usada pelo controller. */
export const serviceOrdemServico = new ServiceOrdemServico();