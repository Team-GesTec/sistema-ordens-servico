import { apiDownload, apiRequest } from "./api";
import type { HistoricoOrdemServico, OrdemServico, OrdemServicoInput, StatusOrdemServico } from "../types/api";
import type { FiltrosPrazoOrdem } from "../utils/prazoOrdem";

type FiltrosExportacaoOrdens = {
    busca?: string;
    status?: StatusOrdemServico | "todos";
    responsavel_id?: number | "sem_responsavel" | "todos";
    inativas?: boolean;
} & Partial<FiltrosPrazoOrdem>;

function adicionarFiltrosPrazo(params: URLSearchParams, filtros: Partial<FiltrosPrazoOrdem>): void {
    if (filtros.dataEntregaInicio) params.set("dataEntregaInicio", filtros.dataEntregaInicio);
    if (filtros.dataEntregaFim) params.set("dataEntregaFim", filtros.dataEntregaFim);
    if (filtros.diasRestantesMin !== undefined && filtros.diasRestantesMin !== "") params.set("diasRestantesMin", filtros.diasRestantesMin);
    if (filtros.diasRestantesMax !== undefined && filtros.diasRestantesMax !== "") params.set("diasRestantesMax", filtros.diasRestantesMax);
}

export const ordemServicoService = {
    listar(filtros: Partial<FiltrosPrazoOrdem> = {}): Promise<OrdemServico[]> {
        const params = new URLSearchParams();
        adicionarFiltrosPrazo(params, filtros);
        const query = params.toString();
        return apiRequest<OrdemServico[]>(`/ordens-servico${query ? `?${query}` : ""}`);
    },

    listarInativas(): Promise<OrdemServico[]> {
        return apiRequest<OrdemServico[]>("/ordens-servico/inativas");
    },

    inativar(id: number): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}/inativar`, { method: 'PATCH' });
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

    baixarRelatorioPDF(id: number): Promise<void> {
        return apiDownload(`/ordens-servico/${id}/relatorio.pdf`, `ordem-servico-${id}.pdf`);
    },

    exportarCSV(filtros: FiltrosExportacaoOrdens): Promise<void> {
        const params = new URLSearchParams();
        if (filtros.busca?.trim()) params.set("busca", filtros.busca.trim());
        if (filtros.status && filtros.status !== "todos") params.set("status", filtros.status);
        if (filtros.responsavel_id !== undefined && filtros.responsavel_id !== "todos") params.set("responsavel_id", String(filtros.responsavel_id));
        if (filtros.inativas) params.set("inativas", "1");
        adicionarFiltrosPrazo(params, filtros);
        const suffix = params.toString();
        return apiDownload(`/ordens-servico/exportar.csv${suffix ? `?${suffix}` : ""}`, "sgos-ordens.csv");
    },

    exportarXLSX(filtros: FiltrosExportacaoOrdens): Promise<void> {
        const params = new URLSearchParams();
        if (filtros.busca?.trim()) params.set("busca", filtros.busca.trim());
        if (filtros.status && filtros.status !== "todos") params.set("status", filtros.status);
        if (filtros.responsavel_id !== undefined && filtros.responsavel_id !== "todos") params.set("responsavel_id", String(filtros.responsavel_id));
        if (filtros.inativas) params.set("inativas", "1");
        adicionarFiltrosPrazo(params, filtros);
        const suffix = params.toString();
        return apiDownload(`/ordens-servico/exportar.xlsx${suffix ? `?${suffix}` : ""}`, "sgos-ordens.xlsx");
    },

    criar(payload: OrdemServicoInput): Promise<OrdemServico> {
        return apiRequest<OrdemServico>("/ordens-servico", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

        salvarParecerTecnico(id: number, parecerTecnico: string): Promise<OrdemServico> {
        return apiRequest<OrdemServico>(`/ordens-servico/${id}/parecer-tecnico`, {
            method: "PATCH",
            body: JSON.stringify({ parecer_tecnico: parecerTecnico }),
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

            return apiRequest<OrdemServico>(
                `/ordens-servico/${id}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                },
            );
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
