import { apiRequest } from "./api";
import type { Departamento, DepartamentoInput, VisaoEquipe } from "../types/api";

export const departamentoService = {
    listar(): Promise<Departamento[]> {
        return apiRequest<Departamento[]>("/departamento");
    },

    buscarEquipe(id: number, incluirHistorico = false): Promise<VisaoEquipe> {
        const historico = incluirHistorico ? "?historico=true" : "";
        return apiRequest<VisaoEquipe>(`/departamento/${id}/equipe${historico}`);
    },

    buscarPorId(id: number): Promise<Departamento> {
        return apiRequest<Departamento>(`/departamento/${id}`);
    },

    criar(payload: DepartamentoInput): Promise<Departamento> {
        return apiRequest<Departamento>("/departamento", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    listarInativos(): Promise<Departamento[]> {
        return apiRequest<Departamento[]>("/departamento/inativos");
    },

    alterarAtivo(id: number, ativo: boolean): Promise<Departamento> {
        return apiRequest<Departamento>(`/departamento/${id}/ativo`, {
            method: "PATCH",
            body: JSON.stringify({ ativo }),
        });
    },

    atualizar(id: number, payload: Partial<DepartamentoInput>): Promise<Departamento> {
        return apiRequest<Departamento>(`/departamento/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },

};
