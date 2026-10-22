import { apiRequest } from "./api";
import type { Funcionario, FuncionarioAtualizacaoInput, FuncionarioInput } from "../types/api";

export const funcionarioService = {
    /** Lista apenas funcionários ativos, adequados para novas atribuições. */
    listar(): Promise<Funcionario[]> {
        return apiRequest<Funcionario[]>("/funcionario");
    },

    async listarInativos(): Promise<Funcionario[]> {
        const funcionarios = await apiRequest<Funcionario[]>("/funcionario");
        return funcionarios.filter((funcionario) => !funcionario.ativo);
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

};
