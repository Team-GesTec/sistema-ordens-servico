import { apiRequest } from "./api";
import type { Cliente, ClienteInput } from "../types/api";

export const clienteService = {
    listar(): Promise<Cliente[]> {
        return apiRequest<Cliente[]>("/cliente");
    },

    criar(payload: ClienteInput): Promise<Cliente> {
        return apiRequest<Cliente>("/cliente", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    atualizar(id: number, payload: Partial<ClienteInput>): Promise<Cliente> {
        return apiRequest<Cliente>(`/cliente/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },

    excluir(id: number): Promise<void> {
        return apiRequest<void>(`/cliente/${id}`, { method: "DELETE" });
    },
};
