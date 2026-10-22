import { apiDownload, apiRequest } from "./api";
import type { Projeto, ProjetoDetalhe, ProjetoInput } from "../types/api";

export const projetoService = {
    listar(): Promise<Projeto[]> {
        return apiRequest<Projeto[]>("/projeto");
    },

    async listarInativos(): Promise<Projeto[]> {
        const projetos = await apiRequest<Projeto[]>("/projeto");
        return projetos.filter((projeto) => !projeto.ativo);
    },

    buscarPorId(id: number): Promise<ProjetoDetalhe> {
        return apiRequest<ProjetoDetalhe>(`/projeto/${id}`);
    },

    baixarRelatorioPDF(id: number): Promise<void> {
        return apiDownload(`/projeto/${id}/relatorio.pdf`, `projeto-${id}-relatorio.pdf`);
    },

    criar(payload: ProjetoInput): Promise<Projeto> {
        return apiRequest<Projeto>("/projeto", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    atualizar(id: number, payload: ProjetoInput): Promise<Projeto> {
        return apiRequest<Projeto>(`/projeto/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
        });
    },

    inativar(id: number): Promise<Projeto> {
        return apiRequest<Projeto>(`/projeto/${id}/inativar`, { method: 'PATCH' });
    },
};
