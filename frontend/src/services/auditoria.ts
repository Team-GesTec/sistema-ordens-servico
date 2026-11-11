import { apiRequest } from "./api";
import type { RespostaLogsAuditoria, TipoEventoAuditoria } from "../types/api";

/** Filtros da tela "Logs de auditoria" (busca, tipo, período e paginação ficam no backend). */
export interface FiltroAuditoria {
    busca: string;
    tipo: TipoEventoAuditoria | "";
    /** Dia inicial "AAAA-MM-DD" (inclusive) ou vazio. */
    dataInicio: string;
    /** Dia final "AAAA-MM-DD" (inclusive) ou vazio. */
    dataFim: string;
    pagina: number;
    limite: number;
}

/** Nomes dos tipos de evento, na ordem do filtro da tela. */
export const ROTULOS_TIPO_EVENTO: Record<TipoEventoAuditoria, string> = {
    criacao: "Criação",
    edicao: "Edição",
    mudanca_status: "Mudança de status",
    atribuicao_responsavel: "Responsável",
    alteracao_sla: "Prazo / SLA",
    anexo: "Anexo",
    registro_horas: "Horas registradas",
    ativacao: "Ativação",
};

export const auditoriaService = {
    /** GET /auditoria — somente gestor; os indicadores vêm calculados sobre o filtro aplicado. */
    listar(filtro: FiltroAuditoria): Promise<RespostaLogsAuditoria> {
        const parametros = new URLSearchParams({
            pagina: String(filtro.pagina),
            limite: String(filtro.limite),
        });
        const busca = filtro.busca.trim();
        if (busca) parametros.set("busca", busca);
        if (filtro.tipo) parametros.set("tipo", filtro.tipo);
        if (filtro.dataInicio) parametros.set("data_inicio", filtro.dataInicio);
        if (filtro.dataFim) parametros.set("data_fim", filtro.dataFim);
        return apiRequest<RespostaLogsAuditoria>(`/auditoria?${parametros.toString()}`);
    },
};
