/**
 * models/modelAuditoria.ts
 *
 * Tipos da trilha imutável de auditoria das O.S.
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE01: `DadosRegistroAuditoria` passa a exigir `tipo_evento` e aceita `descricao`,
 *    `parecer` (mudança de status) e `apontamento_id` (lançamento de horas da US#2.7).
 *  - 2.10-BE02/BE03: tipos de leitura do histórico de atividades da O.S. e dos logs globais,
 *    com paginação e indicadores.
 *
 * ALTERAÇÕES (06/11/2026):
 *  - `FiltroLogsAuditoria` ganhou o período (`dataInicio` e `dataFim`).
 */
import type { auditoria } from '../prisma/generated/client';
import { tipo_evento_auditoria } from '../prisma/generated/client';

export type Auditoria = auditoria;

/** Tipos de evento válidos (espelho do enum `tipo_evento_auditoria`). */
export const TIPOS_EVENTO_AUDITORIA = Object.values(tipo_evento_auditoria);

/** Um dos tipos de evento da auditoria. */
export type TipoEventoAuditoria = tipo_evento_auditoria;

/** Dados de um novo registro de auditoria. */
export interface DadosRegistroAuditoria {
    os_id: number;
    funcionario_id: number;
    acao: auditoria['acao'];
    tipo_evento: TipoEventoAuditoria;
    campo_alterado?: string | null;
    dado_antigo?: string | null;
    dado_novo?: string | null;
    justificativa?: string | null;
    /** Texto para exibição. Se ausente, é montado pelo serviceAuditoria. */
    descricao?: string | null;
    /** Parecer técnico informado na mudança de status (US#2.4). */
    parecer?: string | null;
    /** Lançamento de horas (US#2.7) que gerou o registro. */
    apontamento_id?: number | null;
}

/** Registro lido do banco com o responsável e a O.S. */
export type AuditoriaComRelacoes = auditoria & {
    funcionarios: { id: number; nome: string; usuario: string };
    ordens_servico: { id: number; titulo: string };
};

/** Um registro pronto para exibição no histórico da O.S. e nos logs globais. */
export interface AtividadeAuditoria {
    id: number;
    os_id: number;
    funcionario_id: number;
    /** Instante em ISO 8601 (para ordenar e filtrar no cliente). */
    data_modificacao: Date;
    /** Data e hora já formatadas em "dd/mm/aaaa hh:mm" (fuso de Brasília). */
    data_hora: string;
    acao: auditoria['acao'];
    tipo_evento: TipoEventoAuditoria;
    descricao: string;
    campo_alterado: string | null;
    dado_antigo: string | null;
    dado_novo: string | null;
    justificativa: string | null;
    parecer: string | null;
    apontamento_id: number | null;
    funcionarios: { id: number; nome: string; usuario: string };
    ordem_servico: { id: number; titulo: string };
}

/** Metadados de paginação devolvidos junto das listas. */
export interface Paginacao {
    pagina: number;
    limite: number;
    total: number;
    total_paginas: number;
}

/** Pedido de página já validado. */
export interface PedidoPagina {
    pagina: number;
    limite: number;
}

/** Filtros dos logs globais já validados. */
export interface FiltroLogsAuditoria extends PedidoPagina {
    busca: string | null;
    tipo: TipoEventoAuditoria | null;
    /** Primeiro instante do dia inicial (fuso de Brasília), inclusive. */
    dataInicio: Date | null;
    /** Último instante do dia final (fuso de Brasília), inclusive. */
    dataFim: Date | null;
}

/** Indicadores dos cartões da tela "Logs de auditoria", calculados sobre o filtro aplicado. */
export interface IndicadoresAuditoria {
    total_eventos: number;
    eventos_hoje: number;
    ordens_impactadas: number;
    ultimo_evento: Date | null;
    /** `ultimo_evento` em "dd/mm/aaaa hh:mm" (fuso de Brasília). */
    ultimo_evento_formatado: string | null;
}

/** Resposta de GET /ordens-servico/:id/historico. */
export interface RespostaHistoricoOrdemServico {
    dados: AtividadeAuditoria[];
    paginacao: Paginacao;
}

/** Resposta de GET /auditoria. */
export interface RespostaLogsAuditoria {
    dados: AtividadeAuditoria[];
    paginacao: Paginacao;
    indicadores: IndicadoresAuditoria;
}
