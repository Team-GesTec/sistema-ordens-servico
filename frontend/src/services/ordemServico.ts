import { apiRequest } from "./api";
import type { HistoricoOrdemServico, OrdemServico, OrdemServicoInput } from "../types/api";

export const ordemServicoService = {
    /** GET /ordens-servico — o backend não lê filtros de prazo; eles são aplicados no cliente. */
    listar(): Promise<OrdemServico[]> {
        return apiRequest<OrdemServico[]>("/ordens-servico");
    },

    /** GET /ordens-servico/inativas — somente gestor. */
    listarInativas(): Promise<OrdemServico[]> {
        return apiRequest<OrdemServico[]>("/ordens-servico/inativas");
    },

    /** PATCH /ordens-servico/:id/ativo — somente gestor. */
    alterarAtivo(id: number, ativo: boolean): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}/ativo`, {
            method: "PATCH",
            body: JSON.stringify({ ativo }),
        });
    },

    /** O bloqueio possui rota e autorização próprias no backend. */
    bloquear(id: number): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/bloquear/${id}`, {
            method: "PATCH",
        });
    },

    buscarPorId(id: number): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}`);
    },

    listarHistorico(id: number): Promise<HistoricoOrdemServico[]> {
        return apiRequest<HistoricoOrdemServico[]>(`/ordens-servico/${id}/historico`);
    },

    criar(payload: OrdemServicoInput): Promise<OrdemServico> {
        return apiRequest<OrdemServico>("/ordens-servico", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    /** PATCH /ordens-servico/:id/status — também registra o parecer técnico. */
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

    /** PATCH /ordens-servico/:id/sla-manual — altera o prazo final (somente gestor). */
    alterarPrazo(
        id: number,
        dataLimiteSla: string,
        justificativa: string,
    ): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}/sla-manual`, {
            method: "PATCH",
            body: JSON.stringify({
                data_limite_sla: dataLimiteSla,
                justificativa_sla_manual: justificativa,
            }),
        });
    },

    atribuirResponsavel(id: number, funcionarioId: number): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/atribuir/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ funcionario_id: funcionarioId }),
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