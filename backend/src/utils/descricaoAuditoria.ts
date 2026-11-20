/**
 * utils/descricaoAuditoria.ts
 *
 * Monta o texto de exibição (`descricao`) de um registro de auditoria (US#2.10).
 *
 * Usado em dois momentos:
 *  - na gravação, quando quem registra não informa a descrição;
 *  - na leitura, para registros gravados antes da coluna `descricao` existir (descricao null).
 * Função pura: não acessa banco.
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE01: criado.
 */
import type { TipoEventoAuditoria } from '../models/modelAuditoria';

/** Nome legível de cada campo da O.S. gravado em `campo_alterado`. */
const ROTULOS_CAMPO: Record<string, string> = {
    tipo: 'Tipo',
    titulo: 'Título',
    descricao: 'Descrição',
    criticidade: 'Criticidade',
    departamento_id: 'Departamento',
    cliente_id: 'Cliente',
    projeto_id: 'Projeto',
    ativo_id: 'Local operacional',
    anterior_id: 'O.S. anterior',
    parecer_tecnico: 'Parecer técnico',
    data_criacao: 'Data de abertura',
    data_inicio: 'Data de início',
    data_fim: 'Data de conclusão',
    status: 'Status',
    responsavel_id: 'Responsável',
    data_limite_sla: 'Prazo (SLA)',
    sla_manual: 'SLA manual',
    justificativa_sla_manual: 'Justificativa do SLA',
    ativo: 'Situação',
    anexo: 'Anexo',
    origem: 'Origem',
};

/** Nome legível de cada status da O.S. */
const ROTULOS_STATUS: Record<string, string> = {
    em_andamento: 'Em andamento',
    aguardando: 'Aguardando',
    validacao_testes: 'Validação de testes',
    bloqueado: 'Bloqueado',
    concluido: 'Concluído',
};

/** Campos do registro necessários para montar a descrição. */
export interface DadosDescricaoAuditoria {
    tipo_evento: TipoEventoAuditoria;
    campo_alterado?: string | null | undefined;
    dado_antigo?: string | null | undefined;
    dado_novo?: string | null | undefined;
    apontamento_id?: number | null | undefined;
}

/** Nome legível do campo (ou o próprio nome, se não estiver mapeado). */
export function rotuloCampo(campo: string | null | undefined): string {
    if (!campo) return 'Registro';
    return ROTULOS_CAMPO[campo] ?? campo;
}

const rotuloStatus = (status: string | null | undefined): string =>
    status ? ROTULOS_STATUS[status] ?? status : '—';

/** Lê o nome do arquivo gravado em `dado_novo` pela inclusão de anexo (JSON). */
function nomeDoAnexo(dadoNovo: string | null | undefined): string | null {
    if (!dadoNovo) return null;
    try {
        const anexo: unknown = JSON.parse(dadoNovo);
        if (typeof anexo === 'object' && anexo !== null && 'nome' in anexo && typeof anexo.nome === 'string') {
            return anexo.nome;
        }
    } catch {
        // dado_novo não é JSON: segue sem o nome
    }
    return null;
}

/** Monta a descrição de exibição de um registro de auditoria. */
export function descreverAuditoria(registro: DadosDescricaoAuditoria): string {
    const { tipo_evento: tipo, campo_alterado: campo, dado_antigo: antigo, dado_novo: novo } = registro;

    switch (tipo) {
        case 'criacao':
            if (campo === 'origem') return 'O.S. cadastrada por migração manual';
            if (campo === 'data_limite_sla') return 'Prazo inicial (SLA) definido na abertura';
            return 'O.S. criada';
        case 'mudanca_status':
            return `Status alterado de ${rotuloStatus(antigo)} para ${rotuloStatus(novo)}`;
        case 'atribuicao_responsavel':
            return antigo ? 'Responsável substituído' : 'Responsável atribuído';
        case 'alteracao_sla':
            return campo === 'data_limite_sla' ? 'Prazo (SLA) alterado manualmente' : `${rotuloCampo(campo)} alterado(a)`;
        case 'anexo': {
            const nome = nomeDoAnexo(novo);
            return nome ? `Anexo incluído: ${nome}` : 'Anexo incluído';
        }
        case 'registro_horas':
            return registro.apontamento_id
                ? `Horas registradas (lançamento #${registro.apontamento_id})`
                : 'Horas registradas';
        case 'ativacao':
            return novo === 'true' ? 'O.S. reativada' : 'O.S. inativada';
        case 'edicao':
        default:
            return `${rotuloCampo(campo)} alterado(a)`;
    }
}
