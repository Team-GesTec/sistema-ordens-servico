import { apiRequest } from "./api";
import type { Projeto, ProjetoDetalhe, ProjetoInput } from "../types/api";

export const projetoService = {
    listar(): Promise<Projeto[]> {
        return apiRequest<Projeto[]>("/projeto");
    },

    listarInativos(): Promise<Projeto[]> {
        return apiRequest<Projeto[]>("/projeto/inativos");
    },

    buscarPorId(id: number): Promise<ProjetoDetalhe> {
        return apiRequest<ProjetoDetalhe>(`/projeto/${id}`);
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

    alterarAtivo(id: number, ativo: boolean): Promise<Projeto> {
        return apiRequest<Projeto>(`/projeto/${id}/ativo`, {
            method: "PATCH",
            body: JSON.stringify({ ativo }),
        });
    },
};
