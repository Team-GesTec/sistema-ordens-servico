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
 * ALTERAÇÕES (17/10/2026):
 *  - AJ-06-BE: `criar` passa a receber o perfil do usuário logado e trata o cadastro de O.S. antiga.
 */

import { prisma } from '../prisma/client';
import type { Prisma } from '../prisma/generated/client';
import { AppError } from '../errors/AppError';
import { repositoryOrdemServico, type RepositoryOrdemServico, type UsuarioEscopoOrdemServico } from '../repositories/repositoryOrdemServico';
import { repositoryAuditoria } from '../repositories/repositoryAuditoria';
import { repositoryFuncionario, type RepositoryFuncionario } from '../repositories/repositoryFuncionario';
import { serviceAuditoria } from './serviceAuditoria';
import { bloquearOrdemServico, bloquearProjetosRelacionados, validarProjetoDaOrdem } from '../utils/projetoOsInvariant';
import type { Funcionario, PerfilFuncionario } from '../models/modelFuncionario';
import {
    type DadosCriacaoOrdemServico,
    type DadosAtualizacaoOrdemServico,
    type DadosAlteracaoStatus,
    type OrdemServico,
    type OrdemServicoDetalhe,
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
const FUSO_CALENDARIO_NEGOCIO = 'America/Sao_Paulo';

/**
 * Interpreta YYYY-MM-DD como meia-noite do calendário do SGOS. Timestamps ISO completos
 * mantêm seu instante original. Isso evita que o parse UTC padrão transforme a data-only
 * escolhida em 21h do dia anterior no fuso brasileiro.
 */
function dataOpcionalNoCalendario(valor: unknown, campo: string): Date | null {
    const somenteData = typeof valor === 'string'
        ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim())
        : null;
    if (!somenteData) return dataOpcional(valor, campo);

    const ano = Number(somenteData[1]);
    const mes = Number(somenteData[2]);
    const dia = Number(somenteData[3]);
    const dataValidacao = new Date(Date.UTC(ano, mes - 1, dia));
    if (
        mes < 1 || mes > 12 || dia < 1 ||
        dataValidacao.getUTCFullYear() !== ano ||
        dataValidacao.getUTCMonth() !== mes - 1 ||
        dataValidacao.getUTCDate() !== dia
    ) {
        throw AppError.requisicaoInvalida(`${campo} não é uma data válida`);
    }

    const alvoWallClock = Date.UTC(ano, mes - 1, dia, 0, 0, 0, 0);
    let instante = alvoWallClock;
    const formatador = new Intl.DateTimeFormat('en-US', {
        timeZone: FUSO_CALENDARIO_NEGOCIO,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    for (let tentativa = 0; tentativa < 3; tentativa += 1) {
        const partes = formatador.formatToParts(new Date(instante));
        const valorParte = (tipo: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second') =>
            Number(partes.find((parte) => parte.type === tipo)?.value ?? 0);
        const representacaoWallClock = Date.UTC(
            valorParte('year'), valorParte('month') - 1, valorParte('day'),
            valorParte('hour'), valorParte('minute'), valorParte('second'),
        );
        const ajuste = alvoWallClock - representacaoWallClock;
        if (ajuste === 0) break;
        instante += ajuste;
    }
    return new Date(instante);
}

/** Toda O.S. deve possuir entrega posterior à abertura; não há prazo mínimo artificial. */
function validarPrazoPosteriorAbertura(dataAbertura: Date, dataLimite: Date | null): asserts dataLimite is Date {
    if (dataLimite === null) {
        throw AppError.requisicaoInvalida('A data de entrega é obrigatória.');
    }
    if (diferencaDiasCalendario(dataAbertura, dataLimite) < 1) {
        throw AppError.requisicaoInvalida(
            'A data de entrega deve ser posterior à data de abertura.',
        );
    }
}

const MAXIMO_PRAZO_INSTALACAO_DIAS = 90;

function dataCalendarioNegocio(data: Date): string {
    const partes = new Intl.DateTimeFormat('en-US', {
        timeZone: FUSO_CALENDARIO_NEGOCIO,
        year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(data);
    const parte = (tipo: 'year' | 'month' | 'day') => partes.find((item) => item.type === tipo)?.value ?? '';
    return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

function aberturaOperacionalAgora(agora: Date): Date {
    const formatador = new Intl.DateTimeFormat('en-US', {
        timeZone: FUSO_CALENDARIO_NEGOCIO, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
    const partes = formatador.formatToParts(agora);
    const obter = (tipo: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second') => Number(partes.find((parte) => parte.type === tipo)?.value ?? 0);
    const ano = obter('year'); const mes = obter('month'); const dia = obter('day');
    const segundosLocais = obter('hour') * 3600 + obter('minute') * 60 + obter('second') + agora.getMilliseconds() / 1000;
    // Exatamente às 17:00:00 mantém o instante atual; qualquer instante posterior vai para amanhã às 08:00.
    if (segundosLocais <= 17 * 3600) return agora;
    const amanha = new Date(Date.UTC(ano, mes - 1, dia) + 86_400_000).toISOString().slice(0, 10);
    // dataOpcionalNoCalendario resolve meia-noite no fuso de negócio; somar oito horas preserva 08:00 local.
    const meiaNoiteLocal = dataOpcionalNoCalendario(amanha, 'data_criacao');
    if (!meiaNoiteLocal) throw AppError.requisicaoInvalida('Não foi possível calcular a abertura operacional.');
    return new Date(meiaNoiteLocal.getTime() + 8 * 60 * 60 * 1000);
}

function diferencaDiasCalendario(inicio: Date, fim: Date): number {
    const isoInicio = dataCalendarioNegocio(inicio);
    const isoFim = dataCalendarioNegocio(fim);
    // As datas já foram normalizadas como YYYY-MM-DD no fuso de negócio.
    // Parsear ISO evita componentes possivelmente undefined sob noUncheckedIndexedAccess.
    const inicioUTC = Date.parse(`${isoInicio}T00:00:00.000Z`);
    const fimUTC = Date.parse(`${isoFim}T00:00:00.000Z`);
    if (!Number.isFinite(inicioUTC) || !Number.isFinite(fimUTC)) {
        throw AppError.requisicaoInvalida('Não foi possível calcular a diferença entre as datas da O.S.');
    }
    return Math.round((fimUTC - inicioUTC) / 86_400_000);
}

/** A regra especial de prazo de Instalação não pode ser liberada por edição genérica. */
function validarPrazoInstalacao(
    tipo: string,
    perfil: PerfilFuncionario,
    dataAbertura: Date,
    dataLimite: Date,
): void {
    if (tipo !== 'instalacao') return;
    if (perfil !== 'gestor' && perfil !== 'analista') {
        throw AppError.acessoNegado('Somente Gestor/Admin ou Analista/Líder autorizado no próprio departamento pode definir ou alterar o prazo de Instalação.');
    }
    if (diferencaDiasCalendario(dataAbertura, dataLimite) > MAXIMO_PRAZO_INSTALACAO_DIAS) {
        throw AppError.requisicaoInvalida('O prazo de Instalação não pode ultrapassar 90 dias corridos a partir da abertura.');
    }
}

/**
 * Folga para diferença de relógio entre o navegador e o servidor (AJ-06).
 * Uma data_criacao só é considerada "no passado" se for anterior a agora menos essa folga.
 */
const TOLERANCIA_DATA_PASSADA_MS = 5 * 60 * 1000;

/** Valor gravado na auditoria para identificar a origem do cadastro de O.S. antiga (AJ-06). */
const ORIGEM_MIGRACAO_MANUAL = 'migracao_manual';

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



    /** Lista somente as O.S. ativas. */
    async listar(): Promise<OrdemServico[]> {
        const ordens = await this.repositorio.listar();
        return ordens.filter((ordem) => ordem.ativo);
    }

    private async validarResponsavelOperacional(usuario: UsuarioEscopoOrdemServico): Promise<void> {
        if (String(usuario.tipo) !== 'analista') return;
        const departamento = await prisma.departamentos.findFirst({ where: { id: usuario.departamento_id, responsavel_id: usuario.id }, select: { id: true } });
        if (!departamento) throw AppError.acessoNegado('Analista/Líder precisa ser o responsável ativo do próprio departamento.');
    }

    /** Listagem padrão já filtrada no banco de acordo com a matriz oficial de visibilidade. */
    async listarParaUsuario(usuario: UsuarioEscopoOrdemServico, filtros: Record<string, unknown> = {}): Promise<OrdemServico[]> {
        await this.validarResponsavelOperacional(usuario);
        const ordens = await this.repositorio.listarVisiveis(usuario);
        const dataInicio = this.normalizarDataFiltro(filtros.dataEntregaInicio, 'dataEntregaInicio');
        const dataFim = this.normalizarDataFiltro(filtros.dataEntregaFim, 'dataEntregaFim');
        const minimo = this.normalizarDiasRestantes(filtros.diasRestantesMin, 'diasRestantesMin');
        const maximo = this.normalizarDiasRestantes(filtros.diasRestantesMax, 'diasRestantesMax');
        if (dataInicio && dataFim && dataInicio > dataFim) throw AppError.requisicaoInvalida('A data inicial de entrega não pode ser posterior à data final.');
        if (minimo !== null && maximo !== null && minimo > maximo) throw AppError.requisicaoInvalida('O mínimo de dias restantes não pode superar o máximo.');
        const hoje = dataCalendarioNegocio(new Date());
        const filtraPrazo = Boolean(dataInicio || dataFim || minimo !== null || maximo !== null);
        return ordens.filter((ordem) => {
            if (filtraPrazo && (!ordem.ativo || ordem.status === 'concluido')) return false;
            const entrega = ordem.data_limite_sla ? dataCalendarioNegocio(ordem.data_limite_sla) : null;
            if (filtraPrazo && !entrega) return false;
            if (!entrega) return true;
            if (dataInicio && entrega < dataInicio) return false;
            if (dataFim && entrega > dataFim) return false;
            const restantes = diferencaDiasCalendario(new Date(`${hoje}T12:00:00-03:00`), new Date(`${entrega}T12:00:00-03:00`));
            if (minimo !== null && restantes < minimo) return false;
            if (maximo !== null && restantes > maximo) return false;
            return true;
        });
    }

    private normalizarDataFiltro(valor: unknown, campo: string): string | null {
        if (valor === undefined || valor === null || valor === '') return null;
        if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw AppError.requisicaoInvalida(`${campo} deve estar no formato AAAA-MM-DD.`);
        const data = new Date(`${valor}T12:00:00Z`);
        if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== valor) throw AppError.requisicaoInvalida(`${campo} não é uma data válida.`);
        return valor;
    }

    private normalizarDiasRestantes(valor: unknown, campo: string): number | null {
        if (valor === undefined || valor === null || valor === '') return null;
        if (!(typeof valor === 'string' || typeof valor === 'number') || !/^-?\d+$/.test(String(valor)) || !Number.isSafeInteger(Number(valor))) throw AppError.requisicaoInvalida(`${campo} deve ser um número inteiro de dias corridos.`);
        return Number(valor);
    }

    /** Detalhes são consultados no banco e só retornados dentro do escopo do usuário. */
    async buscarPorIdParaUsuario(id: number, usuario: UsuarioEscopoOrdemServico): Promise<OrdemServicoDetalhe> {
        const idOS = exigirInteiroPositivo(id, 'id');
        await this.validarResponsavelOperacional(usuario);
        const ordem = await this.repositorio.buscarVisivelComHistorico(idOS, usuario);
        if (!ordem) throw AppError.naoEncontrado('O.S. não encontrada ou fora do seu escopo de acesso.');
        const dataUltimaAtualizacao = await this.repositorio.buscarDataUltimaAtualizacaoRegistrada(idOS);
        return { ...ordem, data_ultima_atualizacao: dataUltimaAtualizacao };
    }

    /** Histórico só pode ser consultado após confirmar a visibilidade da O.S. no backend. */
    async listarHistoricoParaUsuario(id: number, usuario: UsuarioEscopoOrdemServico) {
        const idOS = exigirInteiroPositivo(id, 'id');
        await this.validarResponsavelOperacional(usuario);
        const ordem = await this.repositorio.buscarVisivelComHistorico(idOS, usuario);
        if (!ordem) throw AppError.naoEncontrado('O.S. não encontrada ou fora do seu escopo de acesso.');
        return repositoryAuditoria.listarPorOrdemServico(idOS);
    }

    /** Consulta com relações para PDF individual, sob o mesmo escopo usado na listagem. */
    async buscarParaRelatorio(id: number, usuario: UsuarioEscopoOrdemServico) {
        const idOS = exigirInteiroPositivo(id, 'id');
        await this.validarResponsavelOperacional(usuario);
        const ordem = await this.repositorio.buscarVisivelParaRelatorio(idOS, usuario);
        if (!ordem) throw AppError.naoEncontrado('O.S. não encontrada ou fora do seu escopo de acesso.');
        return ordem;
    }

    /** Fonte autorizada para exportações; o filtro de histórico mantém o escopo do perfil. */
    async listarParaRelatorio(usuario: UsuarioEscopoOrdemServico, incluirInativas = false) {
        await this.validarResponsavelOperacional(usuario);
        return this.repositorio.listarVisiveisParaRelatorio(usuario, incluirInativas);
    }

    /** Lista O.S. inativas somente dentro do mesmo escopo aplicado à listagem e aos detalhes. */
    async listarInativas(usuario: UsuarioEscopoOrdemServico): Promise<OrdemServico[]> {
        await this.validarResponsavelOperacional(usuario);
        return this.repositorio.listarVisiveis(usuario, true);
    }

    /** Busca uma O.S. pelo id.
     * @throws AppError 404 se não existir.
     */
    async buscarPorId(id: number): Promise<OrdemServicoDetalhe> {
        const ordem = await this.repositorio.buscarPorId(id);
        if (!ordem) {
            throw AppError.naoEncontrado('OS não encontrada');
        }
        const dataUltimaAtualizacao = await this.repositorio.buscarDataUltimaAtualizacaoRegistrada(id);
        return { ...ordem, data_ultima_atualizacao: dataUltimaAtualizacao };
    }

    /**
     * Valida o corpo e abre uma O.S.
     * @param corpo O `req.body` recebido.
     * @param solicitanteId Id do funcionário logado (vem do token, nunca do corpo).
     * @param perfil Perfil do funcionário logado (vem do token, nunca do corpo).
     * @throws AppError 400 se algum campo for inválido ou o `anterior_id` não existir.
     * @throws AppError 403 se um não gestor informar data de abertura no passado (AJ-06).
     */
    async criar(corpo: unknown, solicitanteId: number, perfil: PerfilFuncionario): Promise<OrdemServico> {
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
        const agoraServidor = new Date();
        const aberturaInformada = dados.data_criacao === undefined || dados.data_criacao === null
            ? null
            : dataOpcionalNoCalendario(dados.data_criacao, 'data_criacao');
        // Apenas uma data informada realmente no passado representa migração histórica. Cadastro comum usa o relógio do backend.
        const migracao = aberturaInformada !== null && ehDataNoPassado(aberturaInformada);
        const dataCriacao = migracao ? aberturaInformada! : aberturaOperacionalAgora(agoraServidor);
        // Campo legado preservado no schema por compatibilidade, mas sem uso operacional em dias úteis.
        const prazoDiasUteis = null;
        const dataInicio = dataOpcional(dados.data_inicio, 'data_inicio');
        const dataFim = dataOpcional(dados.data_fim, 'data_fim');
        const dataLimiteSla =
            typeof dados.data_limite_sla === 'string' && dados.data_limite_sla.trim() === ''
                ? null
                : dataOpcionalNoCalendario(dados.data_limite_sla, 'data_limite_sla');
        const justificativaSlaManual = textoOpcional(dados.justificativa_sla_manual, 'justficativa_sla_manual');

        const solicitante = await prisma.funcionarios.findUnique({
            where: { id: solicitanteId },
            select: { id: true, tipo: true, departamento_id: true, ativo: true },
        });
        if (!solicitante || !solicitante.ativo) throw AppError.naoAutenticado('Solicitante não encontrado ou inativo.');
        if (perfil !== 'gestor' && departamentoId !== solicitante.departamento_id) {
            throw AppError.acessoNegado('Analista/Líder e Técnico só podem criar O.S. no próprio departamento.');
        }
        if (perfil === 'analista') {
            const departamentoResponsavel = await prisma.departamentos.findFirst({ where: { id: departamentoId, responsavel_id: solicitanteId }, select: { id: true } });
            if (!departamentoResponsavel) throw AppError.acessoNegado('O Analista/Líder deve ser o responsável ativo do próprio departamento.');
        }
        if (solicitante.tipo !== perfil) throw AppError.acessoNegado('O perfil da operação não corresponde ao perfil efetivo do usuário.');

        if (clienteId !== null) {
            const cliente = await prisma.clientes.findUnique({ where: { id: clienteId }, select: { ativo: true } });
            if (!cliente) throw AppError.requisicaoInvalida('cliente_id não corresponde a um cliente existente.');
            if (!cliente.ativo) throw AppError.conflito('Não é possível vincular uma nova O.S. a um cliente inativo.');
        }
        if (projetoId !== null) {
            const projeto = await prisma.projetos.findUnique({ where: { id: projetoId }, select: { ativo: true } });
            if (!projeto) throw AppError.requisicaoInvalida('projeto_id não corresponde a um projeto existente.');
            if (!projeto.ativo) throw AppError.conflito('Não é possível vincular uma nova O.S. a um projeto inativo.');
        }

        // AJ-06: data de abertura informada no passado = cadastro de O.S. antiga (migração manual).
        if (migracao) {
            if (perfil !== 'gestor') {
                throw AppError.acessoNegado('Apenas o gestor pode cadastrar O.S. com data de abertura no passado');
            }
            validarMigracao({ status, parecerTecnico, dataCriacao, dataFim });
        }

        validarPrazoPosteriorAbertura(dataCriacao, dataLimiteSla);
        validarPrazoInstalacao(tipo, perfil, dataCriacao, dataLimiteSla);

        if (anteriorId !== null) {
            const anterior = await this.repositorio.buscarPorId(anteriorId);
            if (!anterior) {
                throw AppError.requisicaoInvalida(`anterior_id ${anteriorId} não corresponde a uma O.S. existente`);
            }
        }

        if (responsavelId !== null) {
            if (perfil !== 'gestor') {
                throw AppError.acessoNegado('Analista/Líder e Técnico devem usar o fluxo de atribuição autorizado após a criação; não podem definir responsável diretamente no cadastro da O.S.');
            }
            const responsavel = await prisma.funcionarios.findUnique({
                where: { id: responsavelId },
                select: { id: true, ativo: true, tipo: true, departamento_id: true },
            });
            if (!responsavel || !responsavel.ativo || responsavel.tipo === 'gestor' || responsavel.departamento_id !== departamentoId) {
                throw AppError.requisicaoInvalida('O responsável inicial precisa ser um funcionário operacional ativo do departamento selecionado.');
            }
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

        if (migracao) {
            return this.criarMigracao(novaOS, solicitanteId);
        }

        // Criação e validação do projeto compartilham a mesma transação. O lock da
        // linha do projeto serializa este caminho com a inativação do projeto.
        const criada = await prisma.$transaction(async (conexao) => {
            // A checagem anterior melhora o feedback; esta verificação transacional fecha a corrida
            // com a inativação do responsável entre a validação e o commit da O.S.
            await bloquearEValidarResponsavelAtivo(conexao, novaOS.responsavel_id);
            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [novaOS.projeto_id]);
            validarProjetoDaOrdem(novaOS.projeto_id, true, novaOS.status, projetosBloqueados);
            const ordemCriada = await this.repositorio.criarNaTransacao(novaOS, conexao);
            await serviceAuditoria.registrar({
                os_id: ordemCriada.id,
                funcionario_id: solicitanteId,
                acao: 'insercao',
                campo_alterado: 'abertura_operacional',
                dado_antigo: agoraServidor.toISOString(),
                dado_novo: dataCriacao.toISOString(),
                justificativa: dataCriacao.getTime() === agoraServidor.getTime()
                    ? 'Instante real de criação preservado; abertura operacional no momento do cadastro.'
                    : 'Instante real de criação preservado no histórico; abertura operacional ajustada para o próximo dia corrido às 08:00 por cadastro após 17:00.',
            }, conexao);
            return ordemCriada;
        });
        this.repositorio.atualizarCache(criada);
        return criada;
    }

    /**
     * Grava uma O.S. antiga/existente e registra na auditoria, na mesma transação,
     * que a origem do cadastro é a migração manual (AJ-06-BE).
     *
     * A data_criacao informada (no passado) é mantida como data de abertura: é ela a base
     * do cálculo do SLA (PE-08), e não a data/hora atual do servidor.
     */
    private async criarMigracao(novaOS: DadosCriacaoOrdemServico, usuarioId: number): Promise<OrdemServico> {
        const criada = await prisma.$transaction(async (conexao) => {
            // Também cobre o caminho AJ-06 de cadastro histórico, sem alterar suas regras.
            await bloquearEValidarResponsavelAtivo(conexao, novaOS.responsavel_id);
            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [novaOS.projeto_id]);
            validarProjetoDaOrdem(novaOS.projeto_id, true, novaOS.status, projetosBloqueados);
            const ordemCriada = await this.repositorio.criarNaTransacao(novaOS, conexao);

            await serviceAuditoria.registrar(
                {
                    os_id: ordemCriada.id,
                    funcionario_id: usuarioId,
                    acao: 'insercao',
                    campo_alterado: 'origem',
                    dado_antigo: null,
                    dado_novo: ORIGEM_MIGRACAO_MANUAL,
                    justificativa:
                        'Cadastro de O.S. antiga/existente (migração manual) com abertura em ' +
                        `${novaOS.data_criacao.toISOString()} e status ${novaOS.status}`,
                },
                conexao,
            );

            return ordemCriada;
        });

        // Atualiza o cache só depois que a transação terminou
        this.repositorio.atualizarCache(criada);
        return criada;
    }

    /**
     * Persiste somente o parecer técnico do Técnico responsável, sem tocar no status ou
     * em campos operacionais relacionados. A autorização, validação de estado e auditoria
     * são verificadas dentro da mesma transação.
     */
    async salvarParecerTecnico(
        id: number,
        corpo: unknown,
        usuario: Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>,
    ): Promise<OrdemServico> {
        const idOS = exigirInteiroPositivo(id, 'id');
        if (usuario.tipo !== 'tecnico') {
            throw AppError.acessoNegado('Somente o Técnico responsável pode salvar o parecer técnico de forma independente.');
        }

        const dados = lerCorpo(corpo);
        const chaves = Object.keys(dados);
        if (chaves.length !== 1 || chaves[0] !== 'parecer_tecnico' || !campoPresente(dados, 'parecer_tecnico')) {
            throw AppError.requisicaoInvalida('Envie somente o campo parecer_tecnico. Nenhum outro campo da O.S. pode ser alterado por esta operação.');
        }
        const parecer = textoOpcional(dados.parecer_tecnico, 'parecer_tecnico', { maximo: TEXTO_MAXIMO_PARECER });

        const atualizada = await prisma.$transaction(async (conexao) => {
            await bloquearOrdemServico(conexao, idOS);
            const ordemAtual = await conexao.ordens_servico.findUnique({ where: { id: idOS } });
            if (!ordemAtual) throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);

            if (ordemAtual.departamento_id !== usuario.departamento_id || ordemAtual.responsavel_id !== usuario.id) {
                throw AppError.acessoNegado('Somente o Técnico responsável pela O.S. no próprio departamento pode editar o parecer técnico.');
            }
            if (!ordemAtual.ativo) {
                throw AppError.conflito('Não é possível alterar o parecer técnico de uma O.S. inativa.');
            }
            if (ordemAtual.status === 'concluido' || ordemAtual.status === 'bloqueado') {
                throw AppError.requisicaoInvalida('O parecer técnico não pode ser alterado quando a O.S. está concluída ou bloqueada.');
            }

            const parecerAnterior = ordemAtual.parecer_tecnico;
            if (parecerAnterior === parecer) return ordemAtual;

            const resultado = await conexao.ordens_servico.update({
                where: { id: idOS },
                data: { parecer_tecnico: parecer },
            });
            await serviceAuditoria.registrar({
                os_id: idOS,
                funcionario_id: usuario.id,
                acao: 'atualizacao',
                campo_alterado: 'parecer_tecnico',
                dado_antigo: parecerAnterior,
                dado_novo: parecer,
                justificativa: 'Edição independente do parecer técnico; status e demais campos preservados.',
            }, conexao);
            return resultado;
        });

        this.repositorio.atualizarCache(atualizada);
        return atualizada;
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
        usuario: Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>,
    ): Promise<OrdemServico> {
        const idOS = exigirInteiroPositivo(id, 'id');
        const dados = lerCorpo(corpo);
        const novoStatus = exigirEnum(dados.status, STATUS_ORDEM_SERVICO, 'status');
        const parecerEnviado =
            dados.parecer_tecnico !== undefined && dados.parecer_tecnico !== null && dados.parecer_tecnico !== '';
        const parecer = parecerEnviado
            ? exigirTexto(dados.parecer_tecnico, 'parecer_tecnico', { maximo: TEXTO_MAXIMO_PARECER })
            : undefined;
        const dadosStatus: DadosAlteracaoStatus = { status: novoStatus };
        if (parecer !== undefined) dadosStatus.parecer_tecnico = parecer;

        const atualizada = await prisma.$transaction(async (conexao) => {
            // Releitura sob lock evita aceitar uma transição usando status em cache
            // enquanto outra requisição conclui a mesma O.S.
            await bloquearOrdemServico(conexao, idOS);
            const ordemAtual = await conexao.ordens_servico.findUnique({ where: { id: idOS } });
            if (!ordemAtual) throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);

            const ehResponsavel = ordemAtual.responsavel_id === usuario.id;
            if (usuario.tipo === 'analista') {
                const responsavelDepartamento = await conexao.departamentos.findFirst({ where: { id: ordemAtual.departamento_id, responsavel_id: usuario.id }, select: { id: true } });
                if (ordemAtual.departamento_id !== usuario.departamento_id || !responsavelDepartamento) {
                    throw AppError.acessoNegado('Analista/Líder só pode alterar o status de O.S. do departamento sob sua responsabilidade.');
                }
            } else if (usuario.tipo !== 'gestor' && !ehResponsavel) {
                throw AppError.acessoNegado('Apenas Gestor/Admin, Analista/Líder do departamento ou o Técnico responsável pode alterar o status.');
            }
            if (!ordemAtual.ativo) {
                throw AppError.conflito(`A O.S. ${idOS} está inativa e não pode ter o status alterado.`);
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
            // data_criacao é a referência temporal da O.S. Mesmo em registros legados que
            // já tenham data_fim preenchida, não se pode concluir uma ordem cuja abertura
            // ainda esteja no futuro. A validação ocorre antes de qualquer escrita/auditoria.
            if (novoStatus === 'concluido') {
                const instanteConclusao = new Date();
                if (ordemAtual.data_criacao.getTime() > instanteConclusao.getTime()) {
                    throw AppError.requisicaoInvalida(
                        'A O.S. não pode ser concluída antes da data de abertura',
                    );
                }
                // Datas de conclusão históricas não são reescritas.
                if (ordemAtual.data_fim === null) {
                    dadosStatus.data_fim = instanteConclusao;
                }
            }

            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [ordemAtual.projeto_id]);
            validarProjetoDaOrdem(ordemAtual.projeto_id, ordemAtual.ativo, novoStatus, projetosBloqueados, ordemAtual.projeto_id);
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
            if (dadosStatus.data_fim && ordemAtual.data_fim === null) {
                await serviceAuditoria.registrar(
                    {
                        os_id: idOS,
                        funcionario_id: usuario.id,
                        acao: 'atualizacao',
                        campo_alterado: 'data_fim',
                        dado_antigo: null,
                        dado_novo: dadosStatus.data_fim.toISOString(),
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
            const solicitanteAtual = await conexao.funcionarios.findUnique({ where: { id: usuarioId }, select: { id: true, tipo: true, departamento_id: true, ativo: true } });
            if (!solicitanteAtual || !solicitanteAtual.ativo) throw AppError.naoAutenticado('Usuário ativo não encontrado.');
            const departamentoSobResponsabilidade = solicitanteAtual.tipo === 'analista'
                ? await conexao.departamentos.findFirst({ where: { id: ordemAtual.departamento_id, responsavel_id: usuarioId }, select: { id: true } })
                : null;
            if (solicitanteAtual.tipo === 'tecnico' || (solicitanteAtual.tipo === 'analista' && (ordemAtual.departamento_id !== solicitanteAtual.departamento_id || !departamentoSobResponsabilidade))) {
                throw AppError.acessoNegado('A edição geral da O.S. exige Gestor/Admin ou Analista/Líder responsável pelo próprio departamento.');
            }
            if (solicitanteAtual.tipo !== 'gestor' && solicitanteAtual.tipo !== 'analista') throw AppError.acessoNegado('Perfil sem permissão para editar O.S.');
            if (!ordemAtual.ativo) throw AppError.conflito('Não é possível editar uma O.S. inativa.');
            if (ordemAtual.status === 'concluido') {
                throw AppError.requisicaoInvalida('OS concluída não pode ser editada');
            }
            if (ordemAtual.status === 'bloqueado') {
                throw AppError.requisicaoInvalida('OS bloqueada não pode ser editada');
            }

            const dados = lerCorpo(corpo);
            if (campoPresente(dados, 'data_criacao')) {
                throw AppError.requisicaoInvalida(
                    'A data de abertura (data_criacao) não pode ser alterada após a criação da O.S.',
                );
            }
            const proibidos = CAMPOS_PROIBIDOS_NA_EDICAO.filter((campo) => campoPresente(dados, campo));
            if (proibidos.length > 0) {
                throw AppError.requisicaoInvalida(
                    `Estes campos não podem ser alterados por esta rota: ${proibidos.join(', ')}. ` +
                    'Use as rotas próprias de status, responsável ou SLA.',
                );
            }
            const alteracoes = await this.montarAlteracoes(dados, parcial);
            const tipoFinal = alteracoes.tipo ?? ordemAtual.tipo;
            const mudouTipo = alteracoes.tipo !== undefined && alteracoes.tipo !== ordemAtual.tipo;
            const prazoFoiEnviado = alteracoes.data_limite_sla !== undefined;
            if (prazoFoiEnviado || mudouTipo) {
                // A abertura é lida do banco sob lock, nunca do payload da edição.
                const prazoFinal = prazoFoiEnviado ? alteracoes.data_limite_sla! : ordemAtual.data_limite_sla;
                validarPrazoPosteriorAbertura(ordemAtual.data_criacao, prazoFinal);
                if (tipoFinal === 'instalacao' && (mudouTipo || prazoFoiEnviado && prazoFinal.getTime() !== (ordemAtual.data_limite_sla?.getTime() ?? null))) {
                    const solicitante = await this.funcionarios.buscarPorId(usuarioId);
                    if (!solicitante || !solicitante.ativo) {
                        throw AppError.acessoNegado('Não foi possível validar um usuário ativo para alterar o prazo de Instalação.');
                    }
                    if (solicitante.tipo === 'analista' && ordemAtual.departamento_id !== solicitante.departamento_id) {
                        throw AppError.acessoNegado('Analista/Líder só pode definir prazo de Instalação no próprio departamento.');
                    }
                    validarPrazoInstalacao(tipoFinal, solicitante.tipo, ordemAtual.data_criacao, prazoFinal);
                }
            }
            exigirAlteracoes(alteracoes);

            const clienteIdFinal = alteracoes.cliente_id !== undefined
                ? alteracoes.cliente_id
                : ordemAtual.cliente_id;
            if (alteracoes.cliente_id !== undefined && clienteIdFinal !== ordemAtual.cliente_id && clienteIdFinal !== null) {
                const cliente = await prisma.clientes.findUnique({ where: { id: clienteIdFinal }, select: { ativo: true } });
                if (!cliente) throw AppError.requisicaoInvalida('cliente_id não corresponde a um cliente existente.');
                if (!cliente.ativo) throw AppError.conflito('Não é possível vincular uma O.S. existente a um cliente inativo.');
            }
            const projetoIdFinal = alteracoes.projeto_id !== undefined
                ? alteracoes.projeto_id
                : ordemAtual.projeto_id;
            if (alteracoes.projeto_id !== undefined && projetoIdFinal !== ordemAtual.projeto_id && projetoIdFinal !== null) {
                const projeto = await prisma.projetos.findUnique({ where: { id: projetoIdFinal }, select: { ativo: true } });
                if (!projeto) throw AppError.requisicaoInvalida('projeto_id não corresponde a um projeto existente.');
                if (!projeto.ativo) throw AppError.conflito('Não é possível vincular uma O.S. existente a um projeto inativo.');
            }
            const projetosBloqueados = await bloquearProjetosRelacionados(
                conexao,
                [ordemAtual.projeto_id, projetoIdFinal],
            );
            validarProjetoDaOrdem(projetoIdFinal, ordemAtual.ativo, ordemAtual.status, projetosBloqueados, ordemAtual.projeto_id);

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
     * Solicita atribuição/reatribuição. O repositório aplica as regras de perfil e escopo
     * com dados autoritativos, dentro da transação.
     * @param id Id da O.S.
     * @param responsavelId Id do funcionário a ser atribuído.
    */
    async atribuirResponsavel(osId: number, responsavelId: unknown, solicitanteId: number): Promise<OrdemServico> {
        // Existência da O.S., perfil atual, departamento e elegibilidade do destino são checados
        // dentro da transação do repositório, sem depender de leituras potencialmente obsoletas do cache.
        return this.repositorio.atribuirResponsavel({
            osId: exigirInteiroPositivo(osId, 'id'),
            responsavelId: exigirInteiroPositivo(responsavelId, 'funcionario_id'),
            solicitanteId: exigirInteiroPositivo(solicitanteId, 'solicitante_id'),
        });
    }

    /**
     * Bloqueia uma O.S. e registra a alteração na auditoria.
     * Uma O.S. concluída não pode ser bloqueada.
     */
    async bloquear(id: number, usuario: Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>): Promise<OrdemServico> {
        const usuarioId = usuario.id;
        const idOS = exigirInteiroPositivo(id, "id");
        const atualizada = await prisma.$transaction(async (conexao) => {
            await bloquearOrdemServico(conexao, idOS);
            const ordemAtual = await conexao.ordens_servico.findUnique({ where: { id: idOS } });
            if (!ordemAtual) throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);
            if (usuario.tipo === 'analista') {
                const departamento = await conexao.departamentos.findFirst({ where: { id: ordemAtual.departamento_id, responsavel_id: usuario.id }, select: { id: true } });
                if (ordemAtual.departamento_id !== usuario.departamento_id || !departamento) throw AppError.acessoNegado('Analista/Líder só pode bloquear O.S. do departamento sob sua responsabilidade.');
            } else if (usuario.tipo !== 'gestor') {
                throw AppError.acessoNegado('Somente Gestor/Admin ou Analista/Líder do departamento pode bloquear O.S.');
            }
            if (!ordemAtual.ativo) throw AppError.conflito('Não é possível bloquear uma O.S. inativa.');
            if (ordemAtual.status === "concluido") {
                throw AppError.requisicaoInvalida("Uma O.S. concluída não pode ser bloqueada.");
            }
            if (ordemAtual.status === "bloqueado") {
                throw AppError.requisicaoInvalida("A O.S. já está bloqueada.");
            }

            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [ordemAtual.projeto_id]);
            validarProjetoDaOrdem(ordemAtual.projeto_id, ordemAtual.ativo, "bloqueado", projetosBloqueados, ordemAtual.projeto_id);
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
     * Inativa uma O.S. sem apagar seu registro; a operação é irreversível.
     * Registra a alteração na auditoria dentro da mesma transação.
     */
    async inativar(id: number, usuario: Pick<Funcionario, 'id' | 'tipo' | 'departamento_id'>): Promise<OrdemServico> {
        const usuarioId = usuario.id;
        const idOS = exigirInteiroPositivo(id, "id");
        if (usuario.tipo !== 'gestor' && usuario.tipo !== 'analista') throw AppError.acessoNegado('Somente Gestor/Admin ou Analista/Líder pode inativar O.S.');

        const atualizada = await prisma.$transaction(async (conexao) => {
            await bloquearOrdemServico(conexao, idOS);
            const ordemAtual = await conexao.ordens_servico.findUnique({ where: { id: idOS } });
            if (!ordemAtual) throw AppError.naoEncontrado(`O.S. ${idOS} não encontrada`);
            if (usuario.tipo === 'analista') {
                const departamento = await conexao.departamentos.findFirst({ where: { id: ordemAtual.departamento_id, responsavel_id: usuario.id }, select: { id: true } });
                if (ordemAtual.departamento_id !== usuario.departamento_id || !departamento) throw AppError.acessoNegado('Analista/Líder só pode inativar O.S. do departamento sob sua responsabilidade.');
            }
            if (ordemAtual.ativo === false) throw AppError.requisicaoInvalida(`A O.S. ${idOS} já está inativa`);

            const projetosBloqueados = await bloquearProjetosRelacionados(conexao, [ordemAtual.projeto_id]);
            validarProjetoDaOrdem(ordemAtual.projeto_id, false, ordemAtual.status, projetosBloqueados, ordemAtual.projeto_id);
            const resultado = await this.repositorio.atualizarNaTransacao(idOS, { ativo: false }, conexao);
            await serviceAuditoria.registrar(
                {
                    os_id: idOS,
                    funcionario_id: usuarioId,
                    acao: "atualizacao",
                    campo_alterado: "ativo",
                    dado_antigo: String(ordemAtual.ativo),
                    dado_novo: 'false',
                    justificativa: "Inativação permanente da ordem de serviço",
                },
                conexao,
            );
            return resultado;
        });
        this.repositorio.atualizarCache(atualizada);
        return atualizada;
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

        if (!parcial || campoPresente(dados, 'data_limite_sla')) {
            alteracoes.data_limite_sla =
                typeof dados.data_limite_sla === 'string' && dados.data_limite_sla.trim() === ''
                    ? null
                    : dataOpcionalNoCalendario(dados.data_limite_sla, 'data_limite_sla');
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
        if (!funcionario.ativo) {
            throw AppError.conflito(`${campo} não pode corresponder a um funcionário inativo`);
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
