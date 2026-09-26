import { apiRequest } from "./api";
import type { OrdemServico, OrdemServicoInput } from "../types/api";

export const ordemServicoService = {
    criar(payload: OrdemServicoInput): Promise<OrdemServico> {
        return apiRequest<OrdemServico>("/ordens-servico", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },
};
