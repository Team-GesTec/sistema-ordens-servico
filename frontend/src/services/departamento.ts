import { apiRequest } from "./api";
import type { Departamento, DepartamentoInput } from "../types/api";

export const departamentoService = {
    listar(): Promise<Departamento[]> {
        return apiRequest<Departamento[]>("/departamento");
    },

    criar(payload: DepartamentoInput): Promise<Departamento> {
        return apiRequest<Departamento>("/departamento", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    atualizar(id: number, payload: Partial<DepartamentoInput>): Promise<Departamento> {
        return apiRequest<Departamento>(`/departamento/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },

    excluir(id: number): Promise<void> {
        return apiRequest<void>(`/departamento/${id}`, { method: "DELETE" });
    },
};
