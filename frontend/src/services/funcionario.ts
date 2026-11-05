import { apiRequest } from "./api";
import type { Funcionario, FuncionarioAtualizacaoInput, FuncionarioInput } from "../types/api";

export const funcionarioService = {
    /** Lista apenas funcionários ativos, adequados para novas atribuições. */
    listar(): Promise<Funcionario[]> {
        return apiRequest<Funcionario[]>("/funcionario");
    },

    /** Lista inativos para administração; o backend limita o endpoint a Gestores. */
    listarInativos(): Promise<Funcionario[]> {
        return apiRequest<Funcionario[]>("/funcionario/inativos");
    },

    buscarPorId(id: number): Promise<Funcionario> {
        return apiRequest<Funcionario>(`/funcionario/${id}`);
    },

    criar(payload: FuncionarioInput): Promise<Funcionario> {
        return apiRequest<Funcionario>("/funcionario", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    atualizar(id: number, payload: FuncionarioAtualizacaoInput): Promise<Funcionario> {
        return apiRequest<Funcionario>(`/funcionario/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },

    /** A convenção histórica da API usa DELETE para inativação lógica. */
    inativar(id: number): Promise<{ mensagem: string; funcionario: Funcionario }> {
        return apiRequest<{ mensagem: string; funcionario: Funcionario }>(`/funcionario/${id}`, {
            method: "DELETE",
        });
    },

    reativar(id: number): Promise<{ mensagem: string; funcionario: Funcionario }> {
        return apiRequest<{ mensagem: string; funcionario: Funcionario }>(`/funcionario/${id}/ativar`, {
            method: "PATCH",
        });
    },

};
