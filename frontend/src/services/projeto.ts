import { apiRequest } from "./api";
import type { Projeto, ProjetoInput } from "../types/api";

export const projetoService = {
    listar(): Promise<Projeto[]> {
        return apiRequest<Projeto[]>("/projeto");
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

    excluir(id: number): Promise<void> {
        return apiRequest<void>(`/projeto/${id}`, { method: "DELETE" });
    },
};
