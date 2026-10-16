
import { apiRequest } from "./api";
import type { OrdemServico, OrdemServicoInput } from "../types/api";

export const ordemServicoService = {
    listar(): Promise<OrdemServico[]> {
        return apiRequest<OrdemServico[]>("/ordens-servico");
    },

    buscarPorId(id: number): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}`);
    },

    criar(payload: OrdemServicoInput): Promise<OrdemServico> {
        return apiRequest<OrdemServico>("/ordens-servico", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    atribuirResponsavel(id: number, funcionarioId: number): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/atribuir/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ funcionario_id: funcionarioId }),
        });
    },

    alterarStatus(
        id: number,
        status: string,
        parecer_tecnico?: string,
    ): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status,
                parecer_tecnico,
            }),
        });
    },
};
