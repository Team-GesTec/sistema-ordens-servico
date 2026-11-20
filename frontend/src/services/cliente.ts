
import { apiDownload, apiRequest } from "./api";
import type { Cliente, ClienteInput } from "../types/api";

export const clienteService = {
    /**
     * GET /cliente/:id/relatorio.pdf — relatório do cliente com as O.S. feitas a ele
     * (US#2.9; Gestor ou Analista, 403 aos demais).
     * Baixa pelo `apiDownload` (token no cabeçalho); o nome do arquivo é definido no frontend.
     * O aviso de sucesso é emitido pela tela, com o nome do arquivo (mesmo fluxo da US#2.8).
     */
    async exportarPdf(id: number): Promise<Blob> {
        const { blob } = await apiDownload(`/cliente/${id}/relatorio.pdf`, false);
        return blob;
    },

    listar(): Promise<Cliente[]> {
        return apiRequest<Cliente[]>("/cliente");
    },

    listarInativos(): Promise<Cliente[]> {
        return apiRequest<Cliente[]>("/cliente/inativos");
    },

    criar(payload: ClienteInput): Promise<Cliente> {
        return apiRequest<Cliente>("/cliente", {
            method: "POST",
            body: JSON.stringify(payload),
        });
    },

    atualizar(
        id: number,
        payload: Partial<ClienteInput>
    ): Promise<Cliente> {
        return apiRequest<Cliente>(`/cliente/${id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
    },

    excluir(id: number): Promise<void> {
        return apiRequest<void>(`/cliente/${id}`, {
            method: "DELETE",
        });
    },

    ativar(
        id: number
    ): Promise<{ mensagem: string; cliente: Cliente }> {
        return apiRequest<{ mensagem: string; cliente: Cliente }>(
            `/cliente/${id}/ativar`,
            { method: "PATCH" }
        );
    },

};
