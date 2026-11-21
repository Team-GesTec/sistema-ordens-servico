import { apiRequest } from "./api";
import type { ResultadoNotificacoes } from "../types/notificacao";

export const notificacaoService = {
    listar(pagina = 1, limite = 30, lida?: boolean): Promise<ResultadoNotificacoes> {
        const filtro = lida === undefined ? "" : `&lida=${lida}`;
        return apiRequest<ResultadoNotificacoes>(`/notificacoes?pagina=${pagina}&limite=${limite}${filtro}`);
    },
    contarNaoLidas(): Promise<{ total: number }> {
        return apiRequest<{ total: number }>("/notificacoes/nao-lidas/contagem");
    },
    marcarUmaComoLida(id: string): Promise<void> {
        return apiRequest<void>(`/notificacoes/${encodeURIComponent(id)}/lida`, { method: "PATCH" });
    },
    marcarTodasComoLidas(): Promise<{ atualizadas: number }> {
        return apiRequest<{ atualizadas: number }>("/notificacoes/lidas", { method: "PATCH" });
    },
};
