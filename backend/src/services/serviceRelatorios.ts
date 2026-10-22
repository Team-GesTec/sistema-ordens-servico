import { AppError } from '../errors/AppError';
import type { UsuarioEscopoOrdemServico } from '../repositories/repositoryOrdemServico';
import type { PerfilFuncionario } from '../models/modelFuncionario';
import { serviceOrdemServico } from './serviceOrdemServico';
import { serviceProjeto } from './serviceProjeto';
import { gerarPdfTexto } from '../utils/pdfTexto';
import { STATUS_ORDEM } from '../models/modelOrdemServico';
import { gerarXlsx } from '../utils/xlsx';

export interface FiltrosExportacaoOS {
    busca?: unknown;
    status?: unknown;
    criticidade?: unknown;
    responsavel_id?: unknown;
    departamento_id?: unknown;
    projeto_id?: unknown;
    inativas?: unknown;
    dataEntregaInicio?: unknown;
    dataEntregaFim?: unknown;
    diasRestantesMin?: unknown;
    diasRestantesMax?: unknown;
}

function textoQuery(valor: unknown, nome: string): string | undefined {
    if (valor === undefined || valor === null || valor === '') return undefined;
    if (typeof valor !== 'string') throw AppError.requisicaoInvalida(`Filtro ${nome} inválido.`);
    return valor.trim();
}

function normalizarTexto(valor: unknown): string {
    return String(valor ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR')
        .trim();
}

function inteiroQuery(valor: unknown, nome: string): number | undefined {
    const texto = textoQuery(valor, nome);
    if (texto === undefined) return undefined;
    if (!/^\d+$/.test(texto) || !Number.isSafeInteger(Number(texto)) || Number(texto) <= 0) {
        throw AppError.requisicaoInvalida(`Filtro ${nome} deve ser um inteiro positivo.`);
    }
    return Number(texto);
}

interface FiltrosPrazoNormalizados {
    dataEntregaInicio?: string;
    dataEntregaFim?: string;
    diasRestantesMin?: number;
    diasRestantesMax?: number;
}

function dataISOQuery(valor: unknown, nome: string): string | undefined {
    const texto = textoQuery(valor, nome);
    if (texto === undefined) return undefined;
    const correspondencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (!correspondencia) throw AppError.requisicaoInvalida(`Filtro ${nome} deve usar uma data válida no formato AAAA-MM-DD.`);
    const [, ano, mes, dia] = correspondencia;
    const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
    if (data.toISOString().slice(0, 10) !== texto) throw AppError.requisicaoInvalida(`Filtro ${nome} não contém uma data válida.`);
    return texto;
}

function diasQuery(valor: unknown, nome: string): number | undefined {
    const texto = textoQuery(valor, nome);
    if (texto === undefined) return undefined;
    if (!/^-?\d+$/.test(texto) || !Number.isSafeInteger(Number(texto))) {
        throw AppError.requisicaoInvalida(`Filtro ${nome} deve ser um número inteiro (negativos são permitidos para O.S. vencidas).`);
    }
    return Number(texto);
}

function normalizarFiltrosPrazo(filtros: FiltrosExportacaoOS): FiltrosPrazoNormalizados {
    const dataEntregaInicio = dataISOQuery(filtros.dataEntregaInicio, 'dataEntregaInicio');
    const dataEntregaFim = dataISOQuery(filtros.dataEntregaFim, 'dataEntregaFim');
    const diasRestantesMin = diasQuery(filtros.diasRestantesMin, 'diasRestantesMin');
    const diasRestantesMax = diasQuery(filtros.diasRestantesMax, 'diasRestantesMax');
    const resultado: FiltrosPrazoNormalizados = {
        ...(dataEntregaInicio !== undefined ? { dataEntregaInicio } : {}),
        ...(dataEntregaFim !== undefined ? { dataEntregaFim } : {}),
        ...(diasRestantesMin !== undefined ? { diasRestantesMin } : {}),
        ...(diasRestantesMax !== undefined ? { diasRestantesMax } : {}),
    };
    if (resultado.dataEntregaInicio && resultado.dataEntregaFim && resultado.dataEntregaInicio > resultado.dataEntregaFim) {
        throw AppError.requisicaoInvalida('A data inicial de entrega não pode ser posterior à data final.');
    }
    if (resultado.diasRestantesMin !== undefined && resultado.diasRestantesMax !== undefined && resultado.diasRestantesMin > resultado.diasRestantesMax) {
        throw AppError.requisicaoInvalida('O mínimo de dias restantes não pode ser superior ao máximo.');
    }
    return resultado;
}

function dataCalendario(valor: Date | string | null | undefined): string | null {
    if (!valor) return null;
    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) return null;
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(data);
    const obter = (tipo: 'year' | 'month' | 'day') => partes.find((parte) => parte.type === tipo)?.value ?? '';
    return `${obter('year')}-${obter('month')}-${obter('day')}`;
}

function diaUTCMs(dataISO: string): number {
    const correspondencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO);
    if (!correspondencia) return Number.NaN;
    const ano = Number(correspondencia[1]); const mes = Number(correspondencia[2]); const dia = Number(correspondencia[3]);
    const instante = Date.UTC(ano, mes - 1, dia);
    const validada = new Date(instante);
    if (validada.getUTCFullYear() !== ano || validada.getUTCMonth() !== mes - 1 || validada.getUTCDate() !== dia) return Number.NaN;
    return instante;
}

function diasEntre(inicio: string, fim: string): number {
    return Math.round((diaUTCMs(fim) - diaUTCMs(inicio)) / 86_400_000);
}

function dentroLimites(valor: number, minimo?: number, maximo?: number): boolean {
    return (minimo === undefined || valor >= minimo) && (maximo === undefined || valor <= maximo);
}

function correspondePrazo(os: { data_limite_sla: Date | null; ativo?: boolean; status?: string }, filtros: FiltrosPrazoNormalizados): boolean {
    const filtraEntrega = Boolean(filtros.dataEntregaInicio || filtros.dataEntregaFim);
    const filtraDiasRestantes = filtros.diasRestantesMin !== undefined || filtros.diasRestantesMax !== undefined;
    if (!filtraEntrega && !filtraDiasRestantes) return true;
    if (os.ativo === false || os.status === 'concluido') return false;
    const entrega = dataCalendario(os.data_limite_sla);
    if (!entrega) return false;
    if (filtros.dataEntregaInicio && entrega < filtros.dataEntregaInicio) return false;
    if (filtros.dataEntregaFim && entrega > filtros.dataEntregaFim) return false;
    if (filtraDiasRestantes) {
        const hoje = dataCalendario(new Date());
        if (!hoje) return false;
        const restantes = diasEntre(hoje, entrega);
        if (!dentroLimites(restantes, filtros.diasRestantesMin, filtros.diasRestantesMax)) return false;
    }
    return true;
}

function dataRelatorio(valor: Date | string | null | undefined): string {
    if (!valor) return 'Não informado';
    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) return 'Não informado';
    return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function protegerFormulaCSV(valor: unknown): string {
    let texto = valor === null || valor === undefined ? '' : valor instanceof Date ? dataRelatorio(valor) : String(valor);
    if (/^[\s\u0000-\u001f]*[=+\-@]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replace(/"/g, '""')}"`;
}

function escaparLinhaCSV(valores: unknown[]): string {
    return valores.map(protegerFormulaCSV).join(';');
}

const ROTULOS_STATUS: Record<string, string> = {
    em_andamento: 'Em andamento', aguardando: 'Aguardando', validacao_testes: 'Validação de testes',
    bloqueado: 'Bloqueado', concluido: 'Concluído',
};
const ROTULOS_TIPO: Record<string, string> = { instalacao: 'Instalação', manutencao: 'Manutenção' };
const ROTULOS_CRITICIDADE: Record<string, string> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto', muito_alto: 'Muito alto', urgente: 'Urgente' };

export class ServiceRelatorios {
    private async obterDadosExportacaoOrdens(usuario: UsuarioEscopoOrdemServico, filtros: FiltrosExportacaoOS): Promise<{ cabecalho: string[]; linhas: unknown[][] }> {
        const busca = normalizarTexto(textoQuery(filtros.busca, 'busca') ?? '');
        const status = textoQuery(filtros.status, 'status');
        const criticidade = textoQuery(filtros.criticidade, 'criticidade');
        const responsavelIdRaw = textoQuery(filtros.responsavel_id, 'responsavel_id');
        const responsavelId = responsavelIdRaw && responsavelIdRaw !== 'sem_responsavel'
            ? inteiroQuery(responsavelIdRaw, 'responsavel_id')
            : undefined;
        const departamentoId = inteiroQuery(filtros.departamento_id, 'departamento_id');
        const projetoId = inteiroQuery(filtros.projeto_id, 'projeto_id');
        const inativas = filtros.inativas === '1' || filtros.inativas === 'true';
        const filtrosPrazo = normalizarFiltrosPrazo(filtros);

        if (status && status !== 'todos' && !STATUS_ORDEM.includes(status as (typeof STATUS_ORDEM)[number])) {
            throw AppError.requisicaoInvalida('Filtro status não corresponde a um status existente.');
        }
        if (criticidade && !['baixo', 'medio', 'alto', 'muito_alto', 'urgente'].includes(criticidade)) {
            throw AppError.requisicaoInvalida('Filtro criticidade não corresponde a um valor existente.');
        }
        const ordens = await serviceOrdemServico.listarParaRelatorio(usuario, inativas);
        const filtradas = ordens.filter((os) => {
            if (status && status !== 'todos' && os.status !== status) return false;
            if (criticidade && os.criticidade !== criticidade) return false;
            if (responsavelIdRaw === 'sem_responsavel' && os.responsavel_id !== null) return false;
            if (responsavelId !== undefined && os.responsavel_id !== responsavelId) return false;
            if (departamentoId !== undefined && os.departamento_id !== departamentoId) return false;
            if (projetoId !== undefined && os.projeto_id !== projetoId) return false;
            if (!correspondePrazo(os, filtrosPrazo)) return false;
            if (!busca) return true;
            const idSelecionado = busca.match(/^#(\d+)$/);
            if (idSelecionado) return os.id === Number(idSelecionado[1]);
            // Replica os campos pesquisáveis na listagem para que o CSV corresponda aos filtros visuais.
            const termos = [
                String(os.id), os.titulo, os.descricao, ROTULOS_TIPO[os.tipo] ?? os.tipo,
                ROTULOS_STATUS[os.status] ?? os.status,
                String(os.cliente_id ?? ''), String(os.departamento_id), String(os.projeto_id ?? ''),
                String(os.responsavel_id ?? ''), ROTULOS_CRITICIDADE[os.criticidade ?? ''] ?? os.criticidade ?? '',
                `${os.funcionarios_ordens_servico_responsavel_idTofuncionarios?.nome ?? ''} ${os.funcionarios_ordens_servico_responsavel_idTofuncionarios?.usuario ?? ''}`,
                os.funcionarios_ordens_servico_responsavel_idTofuncionarios?.nome,
                os.funcionarios_ordens_servico_responsavel_idTofuncionarios?.usuario,
            ];
            return termos.some((valor) => normalizarTexto(valor).includes(busca));
        });

        const cabecalho = ['OS', 'Título', 'Descrição', 'Cliente', 'Projeto', 'Departamento', 'Responsável', 'Solicitante', 'Status', 'Criticidade', 'Ativa', 'Abertura', 'Prazo SLA', 'Conclusão'];
        const linhas = filtradas.map((os) => [
            os.id, os.titulo, os.descricao, os.clientes?.nome ?? '', os.projetos?.nome ?? '', os.departamentos.nome,
            os.funcionarios_ordens_servico_responsavel_idTofuncionarios?.nome ?? '',
            os.funcionarios_ordens_servico_solicitante_idTofuncionarios.nome,
            ROTULOS_STATUS[os.status] ?? os.status, os.criticidade ?? '', os.ativo ? 'Ativa' : 'Inativa',
            os.data_criacao, os.data_limite_sla, os.data_fim,
        ]);
        return { cabecalho, linhas };
    }

    async exportarOrdensCSV(usuario: UsuarioEscopoOrdemServico, filtros: FiltrosExportacaoOS): Promise<string> {
        const { cabecalho, linhas } = await this.obterDadosExportacaoOrdens(usuario, filtros);
        return `\uFEFF${[escaparLinhaCSV(cabecalho), ...linhas.map(escaparLinhaCSV)].join('\r\n')}\r\n`;
    }

    async exportarOrdensXLSX(usuario: UsuarioEscopoOrdemServico, filtros: FiltrosExportacaoOS): Promise<Buffer> {
        const { cabecalho, linhas } = await this.obterDadosExportacaoOrdens(usuario, filtros);
        const valores = linhas.map((linha) => linha.map((valor) => valor instanceof Date ? dataRelatorio(valor) : valor ?? ''));
        return gerarXlsx(cabecalho, valores, 'Ordens de Servico');
    }

    async relatorioIndividualOS(id: number, usuario: UsuarioEscopoOrdemServico): Promise<Buffer> {
        const os = await serviceOrdemServico.buscarParaRelatorio(id, usuario);
        const responsavel = os.funcionarios_ordens_servico_responsavel_idTofuncionarios;
        const solicitante = os.funcionarios_ordens_servico_solicitante_idTofuncionarios;
        const linhas = [
            `O.S.: #${os.id}`,
            `Título: ${os.titulo}`,
            `Status: ${ROTULOS_STATUS[os.status] ?? os.status}`,
            `Criticidade: ${os.criticidade ?? 'Não definida'}`,
            `Tipo: ${os.tipo}`,
            `Cliente: ${os.clientes?.nome ?? 'Não associado'}${os.clientes?.razao_social ? ` (${os.clientes.razao_social})` : ''}`,
            `Projeto: ${os.projetos?.nome ?? 'Não associado'}`,
            `Departamento: ${os.departamentos.nome}`,
            `Responsável: ${responsavel?.nome ?? 'Sem responsável'}${responsavel ? ` (${responsavel.usuario})` : ''}`,
            `Solicitante: ${solicitante.nome} (${solicitante.usuario})`,
            `Abertura: ${dataRelatorio(os.data_criacao)}`,
            `Prazo SLA: ${dataRelatorio(os.data_limite_sla)}`,
            `Conclusão: ${dataRelatorio(os.data_fim)}`,
            `Ativa: ${os.ativo ? 'Sim' : 'Não'}`,
            '', 'Descrição:', os.descricao,
            ...(os.parecer_tecnico ? ['', 'Parecer técnico:', os.parecer_tecnico] : []),
        ];
        return gerarPdfTexto(`Relatório individual — O.S. #${os.id}`, linhas);
    }

    async relatorioProjetoPDF(id: number, usuario: UsuarioEscopoOrdemServico): Promise<Buffer> {
        // O escopo vem da sessão autenticada; seus perfis são os valores do enum Prisma.
        const projeto = await serviceProjeto.buscarPorId(id, {
            ...usuario,
            tipo: usuario.tipo as PerfilFuncionario,
        });
        const perfil = String(usuario.tipo);
        let ordens = projeto.ordens_servico;
        if (perfil !== 'gestor') {
            const visiveis = await serviceOrdemServico.listarParaUsuario(usuario);
            const idsPermitidos = new Set(visiveis.map((ordem) => ordem.id));
            ordens = ordens.filter((ordem) => idsPermitidos.has(ordem.id));
            if (ordens.length === 0) {
                throw AppError.naoEncontrado('Projeto não encontrado ou sem O.S. dentro do seu escopo de acesso.');
            }
        }
        const elegiveis = ordens.filter((os) => os.ativo);
        const concluidas = elegiveis.filter((os) => os.status === 'concluido').length;
        const percentual = elegiveis.length === 0 ? null : Math.round((concluidas / elegiveis.length) * 10000) / 100;
        const linhas = [
            `Projeto: ${projeto.nome} (#${projeto.id})`,
            `Cliente: ${projeto.cliente.nome} (${projeto.cliente.razao_social})`,
            `Status: ${projeto.status}`,
            `Data de início: ${dataRelatorio(projeto.data_inicio)}`,
            `Data de término: ${dataRelatorio(projeto.data_fim)}`,
            `O.S. elegíveis para conclusão: ${elegiveis.length}`,
            `O.S. concluídas: ${concluidas}`,
            `Percentual de conclusão no escopo do relatório: ${percentual === null ? 'Sem ordens de serviço' : `${percentual}%`}`,
            '', 'Ordens de serviço incluídas:',
            ...(ordens.length ? ordens.map((os) => `#${os.id} · ${os.titulo} · ${ROTULOS_STATUS[os.status] ?? os.status} · ${os.ativo ? 'Ativa' : 'Inativa'} · Abertura: ${dataRelatorio(os.data_criacao)} · Prazo: ${dataRelatorio(os.data_limite_sla)} · Conclusão: ${dataRelatorio(os.data_fim)}`) : ['Nenhuma O.S. vinculada no escopo autorizado.']),
        ];
        if (perfil === 'gestor') {
            linhas.splice(3, 0, `Departamentos vinculados: ${projeto.departamentos_detalhes.map((departamento) => departamento.nome).join(', ') || 'Nenhum'}`);
        }
        return gerarPdfTexto(`Relatório consolidado — Projeto #${projeto.id}`, linhas);
    }
}

export const serviceRelatorios = new ServiceRelatorios();
