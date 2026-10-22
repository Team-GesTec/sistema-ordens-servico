import { prisma } from '../prisma/client';
import { AppError } from '../errors/AppError';
import type { Funcionario } from '../models/modelFuncionario';
import { serviceCliente } from './serviceCliente';
import { serviceDepartamento } from './serviceDepartamento';
import { serviceFuncionario } from './serviceFuncionario';
import { serviceProjeto } from './serviceProjeto';
import { serviceOrdemServico } from './serviceOrdemServico';
import { lerCsv, lerPlanilhaXlsx } from '../utils/xlsx';

export type EntidadeImportacao = 'clientes' | 'locais_operacionais' | 'departamentos' | 'funcionarios' | 'projetos' | 'ordens_servico';
interface ErroLinha { linha: number; coluna: string; mensagem: string }
interface LinhaImportacao { linha: number; dados?: Record<string, unknown>; erros: ErroLinha[]; visivel: Record<string, unknown> }
interface AnaliseArquivo { entidade: EntidadeImportacao; nomeArquivo: string; total: number; linhas: LinhaImportacao[]; cabecalhos: string[] }

const TAMANHO_MAXIMO = 5 * 1024 * 1024;
const MAX_REGISTROS = 5000;
const MAX_PREVIEW = 25;
type EnumeracoesImportacao = {
    tipo_local: string[];
    tipo_funcionario: string[];
    status_projeto: string[];
    tipo_os: string[];
    criticidade: string[];
    status_os: string[];
};

const ENUMS: EnumeracoesImportacao = {
    tipo_local: ['offshore', 'terrestre', 'site'],
    tipo_funcionario: ['gestor', 'analista', 'tecnico'],
    status_projeto: ['em_planejamento', 'em_andamento', 'pausado', 'concluido'],
    tipo_os: ['instalacao', 'manutencao'],
    criticidade: ['baixo', 'medio', 'alto', 'muito_alto', 'urgente'],
    status_os: ['em_andamento', 'aguardando', 'validacao_testes', 'bloqueado', 'concluido'],
};

const CAMPOS: Record<EntidadeImportacao, { obrigatorios: string[]; permitidos: string[] }> = {
    clientes: { obrigatorios: ['nome', 'razao_social', 'ramo_atuacao'], permitidos: ['nome', 'razao_social', 'ramo_atuacao'] },
    locais_operacionais: { obrigatorios: ['cliente_id', 'descricao', 'tipo'], permitidos: ['cliente_id', 'descricao', 'tipo'] },
    departamentos: { obrigatorios: ['nome'], permitidos: ['nome', 'responsavel_id'] },
    funcionarios: { obrigatorios: ['departamento_id', 'usuario', 'senha', 'nome'], permitidos: ['departamento_id', 'usuario', 'senha', 'nome', 'tipo'] },
    projetos: { obrigatorios: ['nome', 'cliente_id', 'departamentos'], permitidos: ['nome', 'cliente_id', 'departamentos', 'data_inicio', 'data_fim', 'status'] },
    ordens_servico: { obrigatorios: ['titulo', 'descricao', 'tipo', 'departamento_id'], permitidos: ['titulo', 'descricao', 'tipo', 'departamento_id', 'cliente_id', 'projeto_id', 'responsavel_id', 'ativo_id', 'anterior_id', 'criticidade', 'status', 'data_criacao', 'data_limite_sla', 'data_inicio', 'data_fim', 'parecer_tecnico', 'sla_manual', 'justificativa_sla_manual'] },
};

const ALIASES: Record<string, string> = {
    cliente: 'cliente_id', id_cliente: 'cliente_id', id_do_cliente: 'cliente_id',
    setor_id: 'departamento_id', departamento: 'departamento_id', setor: 'departamento_id', id_departamento: 'departamento_id',
    id_funcionario: 'responsavel_id', funcionario_responsavel: 'responsavel_id', responsavel: 'responsavel_id',
    id_projeto: 'projeto_id', projeto: 'projeto_id',
    ativo: 'ativo_id', local_operacional_id: 'ativo_id', local_operacional: 'ativo_id',
    os_anterior: 'anterior_id', ordem_anterior_id: 'anterior_id',
    perfil: 'tipo', tipo_perfil: 'tipo', tipo_os: 'tipo', tipo_local: 'tipo',
    status_atual: 'status', data_abertura: 'data_criacao', abertura: 'data_criacao',
    prazo: 'data_limite_sla', prazo_sla: 'data_limite_sla', data_prazo: 'data_limite_sla',
    inicio: 'data_inicio', conclusao: 'data_fim', data_conclusao: 'data_fim',
    criticidade_os: 'criticidade', departamento_ids: 'departamentos', departamentos_ids: 'departamentos',
};

function normalizarCabecalho(valor: string): string {
    const normalizado = valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return ALIASES[normalizado] ?? normalizado;
}

function exigirGestor(usuario: Funcionario, entidade: EntidadeImportacao): void {
    if (entidade === 'projetos' || entidade === 'ordens_servico') {
        // O schema persistido atual representa apenas gestor/tecnico. Analista/Líder
        // não pode ser habilitado por uma regra paralela antes de existir no modelo.
        if (usuario.tipo !== 'gestor') throw AppError.acessoNegado('A importação de projetos e O.S. é exclusiva do Gestor/Admin.');
        return;
    }
    if (usuario.tipo !== 'gestor') throw AppError.acessoNegado('A importação desta entidade é permitida somente ao Gestor/Admin.');
}

function inteiroOpcional(valor: string | undefined, coluna: string, linha: number, erros: ErroLinha[]): number | null {
    if (!valor?.trim()) return null;
    if (!/^\d+$/.test(valor.trim()) || !Number.isSafeInteger(Number(valor)) || Number(valor) < 1) {
        erros.push({ linha, coluna, mensagem: 'Informe um identificador inteiro positivo ou deixe vazio.' });
        return null;
    }
    return Number(valor);
}

function inteiroObrigatorio(valor: string | undefined, coluna: string, linha: number, erros: ErroLinha[]): number | null {
    const numero = inteiroOpcional(valor, coluna, linha, erros);
    if (numero === null && !erros.some((item) => item.linha === linha && item.coluna === coluna)) {
        erros.push({ linha, coluna, mensagem: 'Campo obrigatório.' });
    }
    return numero;
}

function textoObrigatorio(valor: string | undefined, coluna: string, linha: number, erros: ErroLinha[]): string {
    const texto = (valor ?? '').trim();
    if (!texto) erros.push({ linha, coluna, mensagem: 'Campo obrigatório.' });
    return texto;
}

function dataOpcional(valor: string | undefined, coluna: string, linha: number, erros: ErroLinha[]): string | null {
    const texto = (valor ?? '').trim();
    if (!texto) return null;
    let iso = texto;
    const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br?.[1] !== undefined && br[2] !== undefined && br[3] !== undefined) {
        iso = `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
    }
    const dia = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dia) {
        const ano = Number(dia[1]); const mes = Number(dia[2]); const diaMes = Number(dia[3]);
        const verificacao = new Date(Date.UTC(ano, mes - 1, diaMes));
        if (verificacao.getUTCFullYear() !== ano || verificacao.getUTCMonth() !== mes - 1 || verificacao.getUTCDate() !== diaMes) {
            erros.push({ linha, coluna, mensagem: 'Data de calendário inválida.' }); return null;
        }
        return iso;
    }
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) { erros.push({ linha, coluna, mensagem: 'Use data YYYY-MM-DD ou DD/MM/AAAA.' }); return null; }
    return iso;
}

function booleanoOpcional(valor: string | undefined, coluna: string, linha: number, erros: ErroLinha[]): boolean | undefined {
    if (!valor?.trim()) return undefined;
    const normalizado = valor.trim().toLowerCase();
    if (['true', '1', 'sim', 's'].includes(normalizado)) return true;
    if (['false', '0', 'nao', 'não', 'n'].includes(normalizado)) return false;
    erros.push({ linha, coluna, mensagem: 'Use sim/não ou true/false.' });
    return undefined;
}

function idsLista(valor: string | undefined, linha: number, erros: ErroLinha[]): number[] {
    const texto = (valor ?? '').trim();
    if (!texto) { erros.push({ linha, coluna: 'departamentos', mensagem: 'Informe ao menos um ID de departamento, separado por |.' }); return []; }
    const partes = texto.split('|').map((x) => x.trim());
    const ids = partes.map((p) => /^\d+$/.test(p) && Number.isSafeInteger(Number(p)) && Number(p) > 0 ? Number(p) : NaN);
    if (ids.some((id) => !Number.isFinite(id))) erros.push({ linha, coluna: 'departamentos', mensagem: 'Informe IDs inteiros positivos separados por |, por exemplo 1|2.' });
    const validos = ids.filter(Number.isFinite);
    if (new Set(validos).size !== validos.length) erros.push({ linha, coluna: 'departamentos', mensagem: 'A lista contém departamentos duplicados.' });
    return [...new Set(validos)];
}

function parsearEntidade(entidade: EntidadeImportacao, linha: number, campos: Record<string, string>): { dados: Record<string, unknown>; erros: ErroLinha[] } {
    const erros: ErroLinha[] = [];
    const t = (campo: string) => (campos[campo] ?? '').trim();
    const dados: Record<string, unknown> = {};
    for (const obrigatorio of CAMPOS[entidade].obrigatorios) {
        if (!t(obrigatorio)) erros.push({ linha, coluna: obrigatorio, mensagem: 'Campo obrigatório.' });
    }
    if (entidade === 'clientes') {
        dados.nome = t('nome'); dados.razao_social = t('razao_social'); dados.ramo_atuacao = t('ramo_atuacao'); dados.locais_operacionais = [];
    } else if (entidade === 'locais_operacionais') {
        dados.cliente_id = inteiroObrigatorio(campos.cliente_id, 'cliente_id', linha, erros);
        dados.descricao = t('descricao'); dados.tipo = t('tipo');
        if (t('tipo') && !ENUMS.tipo_local.includes(t('tipo'))) erros.push({ linha, coluna: 'tipo', mensagem: 'Valor permitido: offshore, terrestre ou site.' });
    } else if (entidade === 'departamentos') {
        dados.nome = t('nome'); dados.responsavel_id = inteiroOpcional(campos.responsavel_id, 'responsavel_id', linha, erros);
    } else if (entidade === 'funcionarios') {
        dados.departamento_id = inteiroObrigatorio(campos.departamento_id, 'departamento_id', linha, erros);
        dados.usuario = t('usuario'); dados.senha = t('senha'); dados.nome = t('nome');
        dados.tipo = t('tipo') || 'tecnico';
        if (t('tipo') && !ENUMS.tipo_funcionario.includes(t('tipo'))) erros.push({ linha, coluna: 'tipo', mensagem: 'Perfil inválido. Use gestor, analista ou tecnico.' });
        if (t('senha') && t('senha').length < 8) erros.push({ linha, coluna: 'senha', mensagem: 'A senha deve ter pelo menos 8 caracteres.' });
    } else if (entidade === 'projetos') {
        dados.nome = t('nome'); dados.cliente_id = inteiroObrigatorio(campos.cliente_id, 'cliente_id', linha, erros);
        dados.departamentos = idsLista(campos.departamentos, linha, erros);
        dados.status = t('status') || 'em_planejamento';
        if (t('status') && !ENUMS.status_projeto.includes(t('status'))) erros.push({ linha, coluna: 'status', mensagem: 'Status de projeto inválido.' });
        dados.data_inicio = dataOpcional(campos.data_inicio, 'data_inicio', linha, erros);
        dados.data_fim = dataOpcional(campos.data_fim, 'data_fim', linha, erros);
    } else {
        dados.titulo = t('titulo'); dados.descricao = t('descricao');
        dados.tipo = t('tipo') || 'instalacao';
        dados.departamento_id = inteiroObrigatorio(campos.departamento_id, 'departamento_id', linha, erros);
        dados.cliente_id = inteiroOpcional(campos.cliente_id, 'cliente_id', linha, erros);
        dados.projeto_id = inteiroOpcional(campos.projeto_id, 'projeto_id', linha, erros);
        dados.responsavel_id = inteiroOpcional(campos.responsavel_id, 'responsavel_id', linha, erros);
        dados.ativo_id = inteiroOpcional(campos.ativo_id, 'ativo_id', linha, erros);
        dados.anterior_id = inteiroOpcional(campos.anterior_id, 'anterior_id', linha, erros);
        dados.criticidade = t('criticidade') || 'medio'; dados.status = t('status') || 'em_andamento';
        if (!ENUMS.tipo_os.includes(String(dados.tipo))) erros.push({ linha, coluna: 'tipo', mensagem: 'Tipo de O.S. inválido.' });
        if (!ENUMS.criticidade.includes(String(dados.criticidade))) erros.push({ linha, coluna: 'criticidade', mensagem: 'Criticidade inválida.' });
        if (!ENUMS.status_os.includes(String(dados.status))) erros.push({ linha, coluna: 'status', mensagem: 'Status de O.S. inválido.' });
        dados.data_criacao = dataOpcional(campos.data_criacao, 'data_criacao', linha, erros);
        dados.data_limite_sla = dataOpcional(campos.data_limite_sla, 'data_limite_sla', linha, erros);
        dados.data_inicio = dataOpcional(campos.data_inicio, 'data_inicio', linha, erros);
        dados.data_fim = dataOpcional(campos.data_fim, 'data_fim', linha, erros);
        dados.parecer_tecnico = t('parecer_tecnico') || undefined;
        if (dados.status === 'concluido') {
            // Não permitir que a importação contorne as validações AJ-06 da criação de O.S.
            // concluída: esse fluxo deve ser uma migração histórica explícita.
            const abertura = typeof dados.data_criacao === 'string' ? new Date(dados.data_criacao) : null;
            const conclusao = typeof dados.data_fim === 'string' ? new Date(dados.data_fim) : null;
            if (!abertura || Number.isNaN(abertura.getTime())) {
                erros.push({ linha, coluna: 'data_criacao', mensagem: 'O.S. concluída precisa informar uma data de abertura histórica válida.' });
            } else if (abertura.getTime() >= Date.now() - 5 * 60 * 1000) {
                erros.push({ linha, coluna: 'data_criacao', mensagem: 'O.S. concluída por importação precisa ter abertura histórica anterior ao momento atual.' });
            }
            if (typeof dados.parecer_tecnico !== 'string' || !dados.parecer_tecnico.trim()) {
                erros.push({ linha, coluna: 'parecer_tecnico', mensagem: 'Parecer técnico é obrigatório para importar O.S. concluída.' });
            }
            if (!conclusao || Number.isNaN(conclusao.getTime())) {
                erros.push({ linha, coluna: 'data_fim', mensagem: 'Data de conclusão válida é obrigatória para importar O.S. concluída.' });
            } else {
                if (abertura && !Number.isNaN(abertura.getTime()) && conclusao.getTime() < abertura.getTime()) {
                    erros.push({ linha, coluna: 'data_fim', mensagem: 'A conclusão não pode ser anterior à abertura.' });
                }
                if (conclusao.getTime() > Date.now() + 5 * 60 * 1000) {
                    erros.push({ linha, coluna: 'data_fim', mensagem: 'A data de conclusão não pode estar no futuro.' });
                }
            }
        }
        const manual = booleanoOpcional(campos.sla_manual, 'sla_manual', linha, erros);
        dados.sla_manual = manual ?? false;
        dados.justificativa_sla_manual = t('justificativa_sla_manual') || undefined;
        // O solicitante é sempre o usuário autenticado, não um ID fornecido no arquivo.
    }
    return { dados, erros };
}

function valoresVisiveis(entidade: EntidadeImportacao, dados: Record<string, unknown>): Record<string, unknown> {
    const seguro = { ...dados };
    delete seguro.senha;
    delete seguro.senha_hash;
    if (entidade === 'funcionarios') seguro.senha = '••••••';
    return seguro;
}

function extrairArquivo(buffer: Buffer, nomeArquivo: string): string[][] {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw AppError.requisicaoInvalida('Selecione um arquivo não vazio para importar.');
    if (buffer.length > TAMANHO_MAXIMO) throw AppError.requisicaoInvalida('O arquivo excede o limite de 5 MB.');
    const ext = nomeArquivo.toLowerCase().split('.').pop();
    if (ext === 'csv') return lerCsv(buffer);
    if (ext === 'xlsx') {
        if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) throw AppError.requisicaoInvalida('O arquivo não possui assinatura de contêiner XLSX/ZIP válida.');
        return lerPlanilhaXlsx(buffer);
    }
    throw AppError.requisicaoInvalida('Formato não suportado. Utilize CSV ou XLSX.');
}

function validarNomeEEntidade(entidadeRaw: string, nomeArquivoRaw: string | undefined): { entidade: EntidadeImportacao; nomeArquivo: string } {
    const entidadeNormalizada = entidadeRaw.trim().toLowerCase();
    const entidade = (entidadeNormalizada === 'ativos' ? 'locais_operacionais' : entidadeNormalizada) as EntidadeImportacao;
    if (!Object.prototype.hasOwnProperty.call(CAMPOS, entidade)) throw AppError.requisicaoInvalida('Entidade não suportada para importação.');
    let nomeArquivo = 'importacao.csv';
    try { nomeArquivo = decodeURIComponent(nomeArquivoRaw ?? ''); } catch { throw AppError.requisicaoInvalida('Nome de arquivo inválido.'); }
    if (!nomeArquivo || nomeArquivo.length > 180 || /[\r\n/\\]/.test(nomeArquivo)) throw AppError.requisicaoInvalida('Nome de arquivo inválido.');
    return { entidade, nomeArquivo };
}

export class ServiceImportacao {
    private async analisarCompleto(entidadeRaw: string, nomeArquivoRaw: string | undefined, conteudo: Buffer, usuario: Funcionario) {
        const { entidade, nomeArquivo } = validarNomeEEntidade(entidadeRaw, nomeArquivoRaw);
        exigirGestor(usuario, entidade);
        let matriz: string[][];
        try { matriz = extrairArquivo(conteudo, nomeArquivo); }
        catch (erro) { if (erro instanceof AppError) throw erro; throw AppError.requisicaoInvalida(erro instanceof Error ? erro.message : 'Arquivo inválido.'); }
        if (matriz.length < 2) throw AppError.requisicaoInvalida('O arquivo precisa conter cabeçalho e pelo menos uma linha de dados.');
        if (matriz.length - 1 > MAX_REGISTROS) throw AppError.requisicaoInvalida('O arquivo excede o limite de 5.000 registros.');
        const primeiraLinha = matriz[0];
        if (!primeiraLinha) throw AppError.requisicaoInvalida('O arquivo não contém uma linha de cabeçalhos válida.');
        const cabecalhos = primeiraLinha.map(normalizarCabecalho);
        if (cabecalhos.some((x) => !x)) throw AppError.requisicaoInvalida('Há um cabeçalho vazio. Corrija a primeira linha e tente novamente.');
        const repetidos = cabecalhos.filter((h, i) => cabecalhos.indexOf(h) !== i);
        if (repetidos.length) throw AppError.requisicaoInvalida(`Cabeçalhos duplicados ou equivalentes: ${[...new Set(repetidos)].join(', ')}.`);
        const desconhecidos = cabecalhos.filter((h) => !CAMPOS[entidade].permitidos.includes(h));
        if (desconhecidos.length) throw AppError.requisicaoInvalida(`Coluna(s) não reconhecida(s) para ${entidade}: ${desconhecidos.join(', ')}.`);
        const linhas: LinhaImportacao[] = matriz.slice(1).map((valores, indice) => {
            const numeroLinha = indice + 2;
            const campos: Record<string, string> = {};
            cabecalhos.forEach((h, i) => { campos[h] = (valores[i] ?? '').trim(); });
            if (valores.length > cabecalhos.length && valores.slice(cabecalhos.length).some((x) => x.trim())) {
                return { linha: numeroLinha, erros: [{ linha: numeroLinha, coluna: '(linha)', mensagem: 'A linha possui mais valores que o cabeçalho.' }], visivel: {} };
            }
            const resultado = parsearEntidade(entidade, numeroLinha, campos);
            return { linha: numeroLinha, dados: resultado.dados, erros: resultado.erros, visivel: valoresVisiveis(entidade, resultado.dados) };
        });
        await this.validarDuplicidadesEReferencias(entidade, linhas);
        return {
            entidade,
            nomeArquivo,
            total: linhas.length,
            validos: linhas.filter((linha) => linha.erros.length === 0).length,
            invalidos: linhas.filter((linha) => linha.erros.length > 0).length,
            erros: linhas.flatMap((linha) => linha.erros).slice(0, 200),
            amostra: linhas.slice(0, MAX_PREVIEW).map((linha) => ({ linha: linha.linha, dados: linha.visivel, erros: linha.erros.map(({ coluna, mensagem }) => ({ coluna, mensagem })) })),
            // Dados completos permanecem internos ao servidor e não são serializados pela resposta pública.
            analiseInterna: { entidade, nomeArquivo, total: linhas.length, linhas, cabecalhos } as AnaliseArquivo,
        };
    }

    async analisar(entidadeRaw: string, nomeArquivoRaw: string | undefined, conteudo: Buffer, usuario: Funcionario) {
        const { analiseInterna: _interno, ...publico } = await this.analisarCompleto(entidadeRaw, nomeArquivoRaw, conteudo, usuario);
        return publico;
    }

    async importar(entidadeRaw: string, nomeArquivoRaw: string | undefined, conteudo: Buffer, usuario: Funcionario) {
        const analise = await this.analisarCompleto(entidadeRaw, nomeArquivoRaw, conteudo, usuario);
        const interna = analise.analiseInterna;
        const erros: ErroLinha[] = interna.linhas.flatMap((linha) => linha.erros);
        let importados = 0;
        for (const linha of interna.linhas) {
            if (linha.erros.length || !linha.dados) continue;
            try {
                await this.criarRegistro(interna.entidade, linha.dados, usuario);
                importados++;
            } catch (erro) {
                const mensagem = erro instanceof AppError ? erro.message : erro instanceof Error ? erro.message : 'Falha inesperada ao importar a linha.';
                erros.push({ linha: linha.linha, coluna: '(registro)', mensagem: mensagem.slice(0, 500) });
            }
        }
        const falhas = interna.total - importados;
        return {
            entidade: interna.entidade,
            total: interna.total,
            importados,
            falhas,
            parcial: importados > 0 && falhas > 0,
            completo: falhas === 0 && importados === interna.total,
            mensagem: falhas === 0
                ? `${importados} registro(s) importado(s) com sucesso.`
                : `${importados} registro(s) importado(s); ${falhas} registro(s) não foram importados. Consulte os erros por linha.`,
            erros: erros.slice(0, 500),
        };
    }

    private async criarRegistro(entidade: EntidadeImportacao, dados: Record<string, unknown>, usuario: Funcionario): Promise<unknown> {
        switch (entidade) {
            case 'clientes': return serviceCliente.criar(dados);
            case 'locais_operacionais': return prisma.locais_operacionais.create({ data: {
                cliente_id: Number(dados.cliente_id), descricao: String(dados.descricao), tipo: dados.tipo as 'offshore' | 'terrestre' | 'site',
            } });
            case 'departamentos': return serviceDepartamento.criar(dados);
            case 'funcionarios': return serviceFuncionario.criar(dados);
            case 'projetos': return serviceProjeto.criar(dados, usuario.id);
            case 'ordens_servico': return serviceOrdemServico.criar(dados, usuario.id, usuario.tipo);
        }
    }

    private async validarDuplicidadesEReferencias(entidade: EntidadeImportacao, linhas: LinhaImportacao[]): Promise<void> {
        const candidatas = linhas.filter((linha) => linha.dados && linha.erros.length === 0);
        const ids = (campo: string) => [...new Set(candidatas.map((l) => l.dados?.[campo]).filter((v): v is number => typeof v === 'number' && v > 0))];
        const exigirExistentes = (existentes: Set<number>, campo: string, selecionado: (linha: LinhaImportacao) => number | null | undefined, ativo?: Set<number>) => {
            for (const linha of candidatas) {
                const id = selecionado(linha);
                if (typeof id !== 'number') continue;
                if (!existentes.has(id)) linha.erros.push({ linha: linha.linha, coluna: campo, mensagem: `O identificador ${id} não corresponde a um registro existente.` });
                else if (ativo && !ativo.has(id)) linha.erros.push({ linha: linha.linha, coluna: campo, mensagem: `O registro ${id} está inativo e não pode ser usado em um novo vínculo.` });
            }
        };
        const buscarIds = async (delegate: 'clientes' | 'departamentos' | 'funcionarios' | 'projetos' | 'locais_operacionais' | 'ordens_servico', selecionados: number[]) => {
            if (!selecionados.length) return [] as Array<{ id: number; ativo?: boolean }>;
            const where = { id: { in: selecionados } };
            if (delegate === 'clientes') return prisma.clientes.findMany({ where, select: { id: true, ativo: true } });
            if (delegate === 'departamentos') return prisma.departamentos.findMany({ where, select: { id: true } });
            if (delegate === 'funcionarios') return prisma.funcionarios.findMany({ where, select: { id: true, ativo: true } });
            if (delegate === 'projetos') return prisma.projetos.findMany({ where, select: { id: true, ativo: true } });
            if (delegate === 'locais_operacionais') return prisma.locais_operacionais.findMany({ where, select: { id: true } });
            return prisma.ordens_servico.findMany({ where, select: { id: true, ativo: true } });
        };
        const [clientes, departamentos, funcionarios, projetos, locais, ordens] = await Promise.all([
            buscarIds('clientes', ids('cliente_id')),
            buscarIds('departamentos', [...ids('departamento_id'), ...candidatas.flatMap((l) => Array.isArray(l.dados?.departamentos) ? l.dados!.departamentos as number[] : [])]),
            buscarIds('funcionarios', [...ids('responsavel_id')]),
            buscarIds('projetos', ids('projeto_id')),
            buscarIds('locais_operacionais', ids('ativo_id')),
            buscarIds('ordens_servico', ids('anterior_id')),
        ]);
        const set = (rows: Array<{ id: number; ativo?: boolean }>) => new Set(rows.map((r) => r.id));
        const setAtivos = (rows: Array<{ id: number; ativo?: boolean }>) => new Set(rows.filter((r) => r.ativo !== false).map((r) => r.id));
        const setClientes = set(clientes); const setDepartamentos = set(departamentos); const setFuncionarios = set(funcionarios);
        const setProjetos = set(projetos); const setLocais = set(locais); const setOrdens = set(ordens);
        const funcionariosAtivos = setAtivos(funcionarios); const projetosAtivos = setAtivos(projetos); const ordensAtivas = setAtivos(ordens);
        if (['locais_operacionais', 'projetos', 'ordens_servico'].includes(entidade)) exigirExistentes(setClientes, 'cliente_id', (l) => l.dados?.cliente_id as number | null | undefined);
        if (['funcionarios', 'projetos', 'ordens_servico'].includes(entidade)) exigirExistentes(setDepartamentos, 'departamento_id', (l) => l.dados?.departamento_id as number | null | undefined);
        if (entidade === 'departamentos') exigirExistentes(funcionariosAtivos, 'responsavel_id', (l) => l.dados?.responsavel_id as number | null | undefined);
        if (entidade === 'projetos') {
            exigirExistentes(setDepartamentos, 'departamentos', (l) => Array.isArray(l.dados?.departamentos) ? (l.dados!.departamentos as number[]).find((id) => !setDepartamentos.has(id)) : undefined);
        }
        if (entidade === 'ordens_servico') {
            exigirExistentes(setProjetos, 'projeto_id', (l) => l.dados?.projeto_id as number | null | undefined, projetosAtivos);
            exigirExistentes(funcionariosAtivos, 'responsavel_id', (l) => l.dados?.responsavel_id as number | null | undefined);
            exigirExistentes(setLocais, 'ativo_id', (l) => l.dados?.ativo_id as number | null | undefined);
            exigirExistentes(ordensAtivas, 'anterior_id', (l) => l.dados?.anterior_id as number | null | undefined);
        }
        if (entidade === 'funcionarios') {
            const departments = await prisma.departamentos.findMany({ where: { id: { in: ids('departamento_id') } }, select: { id: true } });
            exigirExistentes(set(departments), 'departamento_id', (l) => l.dados?.departamento_id as number | null | undefined);
        }
        // Verificação de unicidade prévia. A constraint do banco continua sendo a proteção final contra corrida.
        if (entidade === 'clientes') {
            const nomes = candidatas.map((l) => String(l.dados?.nome ?? ''));
            const razoes = candidatas.map((l) => String(l.dados?.razao_social ?? ''));
            const existentes = await prisma.clientes.findMany({ where: { OR: [{ nome: { in: nomes } }, { razao_social: { in: razoes } }] }, select: { nome: true, razao_social: true } });
            const nomeUsado = new Set(existentes.map((x) => x.nome)); const razaoUsada = new Set(existentes.map((x) => x.razao_social));
            const vistosNomes = new Set<string>(); const vistasRazoes = new Set<string>();
            for (const linha of candidatas) {
                const nome = String(linha.dados?.nome ?? ''); const razao = String(linha.dados?.razao_social ?? '');
                if (nomeUsado.has(nome) || vistosNomes.has(nome)) linha.erros.push({ linha: linha.linha, coluna: 'nome', mensagem: 'Já existe cliente com este nome no banco ou no arquivo.' });
                if (razaoUsada.has(razao) || vistasRazoes.has(razao)) linha.erros.push({ linha: linha.linha, coluna: 'razao_social', mensagem: 'Já existe cliente com esta razão social no banco ou no arquivo.' });
                vistosNomes.add(nome); vistasRazoes.add(razao);
            }
        }
        if (entidade === 'funcionarios') {
            const usuarios = candidatas.map((l) => String(l.dados?.usuario ?? '').trim().toLowerCase());
            const existentes = await prisma.funcionarios.findMany({ where: { usuario: { in: usuarios } }, select: { usuario: true } });
            const usados = new Set(existentes.map((x) => x.usuario.toLowerCase())); const vistos = new Set<string>();
            for (const linha of candidatas) {
                const usuario = String(linha.dados?.usuario ?? '').trim().toLowerCase();
                if (usados.has(usuario) || vistos.has(usuario)) linha.erros.push({ linha: linha.linha, coluna: 'usuario', mensagem: 'O usuário já existe no banco ou está duplicado no arquivo.' });
                vistos.add(usuario);
            }
        }
    }
}

export const serviceImportacao = new ServiceImportacao();
