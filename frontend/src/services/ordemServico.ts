import { apiRequest } from "./api";
import type { OrdemServico, OrdemServicoInput } from "../types/api";

export const ordemServicoService = {
    listar(): Promise<OrdemServico[]> {
        return apiRequest<OrdemServico[]>("/ordens-servico");
    },

    listarInativas(): Promise<OrdemServico[]> {
        return apiRequest<OrdemServico[]>("/ordens-servico/inativas");
    },

    alterarAtivo(id: number, ativo: boolean): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}/ativo`, {
            method: "PATCH",
            body: JSON.stringify({ ativo }),
        });
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

    atribuirResponsavel(
        id: number,
        funcionarioId: number,
    ): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/atribuir/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ funcionario_id: funcionarioId }),
        });
    },

    alterarStatus(
        id: number,
        status: OrdemServico["status"],
        parecerTecnico?: string,
    ): Promise<OrdemServico> {
        const payload = {
            status,
            ...(parecerTecnico !== undefined
                ? { parecer_tecnico: parecerTecnico }
                : {}),
        };

        return apiRequest<OrdemServico>(`/ordens-servico/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },

    atualizar(
        id: number,
        payload: Partial<OrdemServicoInput>,
    ): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },
};
