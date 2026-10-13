/**
 * services/serviceOrdemServico.ts
 *
 * Regras de negócio da O.S.: abertura (US#2.1), edição, atribuição de responsável (US#2.3)
 * e alteração de status (US#2.4).
 *
 * Regras da abertura e da edição:
 *  - tipo, titulo, descricao, departamento_id e sla_manual são obrigatórios;
 *  - data_criacao assume a data atual quando não informada;
 *  - campos opcionais ausentes recebem null no cadastro;
 *  - anterior_id, se informado, deve apontar para uma O.S. existente;
 *  - o status inicial é em_andamento;
 *  - PUT exige os campos obrigatórios; PATCH altera somente os campos enviados.
 *
 * Regras da alteração de status:
 *  - o novo status deve ser um dos 5 oficiais;
 *  - o Gestor altera qualquer O.S.; o Técnico, só as que estão atribuídas a ele;
 *  - O.S. concluída não tem o status alterado;
 *  - o parecer técnico é obrigatório para concluir e opcional nos demais status;
 *  - a alteração e o registro de auditoria são gravados na mesma transação.
 */

import { prisma } from '../prisma/client';
import { AppError } from '../errors/AppError';
import { repositoryOrdemServico, type RepositoryOrdemServico } from '../repositories/repositoryOrdemServico';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import { serviceAuditoria } from './serviceAuditoria';
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


/** Campos que a edição geral não altera: cada um tem a sua rota (US#2.4, US#2.3 e US#3.1). */
const CAMPOS_PROIBIDOS_NA_EDICAO = [
    'status',
    'responsavel_id',
    'sla_config_id',
    'prazo_dias_uteis',
    'data_limite_sla',
    'sla_manual',
    'justificativa_sla_manual',
] as const;

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
        // 1. Valida o que chegou
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

        // 3. Checa a permissão: gestor altera qualquer O.S.; os demais, só as atribuídas a eles
        const ehResponsavel = ordem.responsavel_id === usuario.id;
        if (usuario.tipo !== 'gestor' && !ehResponsavel) {
            throw AppError.acessoNegado('Apenas o gestor ou o responsável pela O.S. pode alterar o status');
        }

        // 4. Checa a trava: O.S. concluída não muda mais
        if (ordem.status === 'concluido') {
            throw AppError.requisicaoInvalida(`A O.S. ${idOS} está concluída e não pode ter o status alterado`);
        }
        if (ordem.status === novoStatus) {
            throw AppError.requisicaoInvalida(`A O.S. ${idOS} já está com o status ${novoStatus}`);
        }

        // 5. Checa o parecer: obrigatório para concluir
        if (novoStatus === 'concluido' && parecer === undefined) {
            throw AppError.requisicaoInvalida('parecer_tecnico é obrigatório para concluir a O.S.');
        }

        // 6. Grava o status e a auditoria na mesma transação
        const dadosStatus: DadosAlteracaoStatus = { status: novoStatus };
        if (parecer !== undefined) {
            dadosStatus.parecer_tecnico = parecer;
        }

        const atualizada = await prisma.$transaction(async (conexao) => {
            const ordemAtualizada = await this.repositorio.atualizarStatus(idOS, dadosStatus, conexao);

            await serviceAuditoria.registrar(
                {
                    os_id: idOS,
                    funcionario_id: usuario.id,
                    acao: 'atualizacao',
                    campo_alterado: 'status',
                    dado_antigo: ordem.status,
                    dado_novo: novoStatus,
                    justificativa: parecer ?? null,
                },
                conexao,
            );

            return ordemAtualizada;
        });

        // 7. Devolve a O.S. atualizada
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
        // 1. Busca a O.S. para saber o status atual
        const ordem = await this.repositorio.buscarPorId(id);
        if (!ordem) {
            throw AppError.naoEncontrado('OS não encontrada');
        }

        // 2. O.S. concluída não é editada
        if (ordem.status === 'concluido') {
            throw AppError.requisicaoInvalida('OS concluída não pode ser editada');
        }

        // 3. Status, responsável e SLA têm rotas próprias
        const dados = lerCorpo(corpo);
        const proibidos = CAMPOS_PROIBIDOS_NA_EDICAO.filter((campo) => campoPresente(dados, campo));
        if (proibidos.length > 0) {
            throw AppError.requisicaoInvalida(
                `Estes campos não podem ser alterados por esta rota: ${proibidos.join(', ')}. ` +
                'Use as rotas próprias de status, responsável ou SLA.',
            );
        }

        // 4. Valida o restante
        const alteracoes = await this.montarAlteracoes(dados, parcial);
        exigirAlteracoes(alteracoes);

        // 5. Descobre quais campos realmente mudaram
        const campos = Object.keys(alteracoes) as (keyof DadosAtualizacaoOrdemServico)[];
        const camposAlterados = campos.filter(
            (campo) => paraTextoAuditoria(ordem[campo]) !== paraTextoAuditoria(alteracoes[campo]),
        );

        // 6. Grava a edição e a auditoria na mesma transação
        const atualizada = await prisma.$transaction(async (conexao) => {
            const ordemAtualizada = await this.repositorio.atualizarNaTransacao(id, alteracoes, conexao);

            for (const campo of camposAlterados) {
                await serviceAuditoria.registrar(
                    {
                        os_id: id,
                        funcionario_id: usuarioId,
                        acao: 'atualizacao',
                        campo_alterado: campo,
                        dado_antigo: paraTextoAuditoria(ordem[campo]),
                        dado_novo: paraTextoAuditoria(alteracoes[campo]),
                    },
                    conexao,
                );
            }

            return ordemAtualizada;
        });

        // 7. Atualiza o cache só depois que a transação terminou
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

    private async garantirFuncionarioExiste(funcionarioId: number, campo: string): Promise<void> {
        const funcionario = await this.funcionarios.buscarPorId(funcionarioId);

        if (!funcionario) {
            throw AppError.requisicaoInvalida(`${campo} não corresponde a um funcionário existente`);
        }
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