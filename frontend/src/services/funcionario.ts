import { apiRequest } from "./api";
import type { Funcionario, FuncionarioInput } from "../types/api";

export const funcionarioService = {
    listar(): Promise<Funcionario[]> {
        return apiRequest<Funcionario[]>("/funcionario");
    },

    criar(payload: FuncionarioInput): Promise<Funcionario> {
        return apiRequest<Funcionario>("/funcionario", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    atualizar(id: number, payload: Partial<FuncionarioInput>): Promise<Funcionario> {
        return apiRequest<Funcionario>(`/funcionario/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },

    excluir(id: number): Promise<void> {
        return apiRequest<void>(`/funcionario/${id}`, { method: "DELETE" });
    },
};
