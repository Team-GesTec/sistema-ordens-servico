import { apiRequest } from "./api";
import type { ComentarioOrdem } from "../types/api";

const rotaComentarios = (osId: number) => `/ordens-servico/${osId}/comentarios`;

export const comentarioService = {
    listar(osId: number): Promise<ComentarioOrdem[]> {
        return apiRequest<ComentarioOrdem[]>(rotaComentarios(osId));
    },

    criar(osId: number, conteudo: string): Promise<ComentarioOrdem> {
        return apiRequest<ComentarioOrdem>(rotaComentarios(osId), {
            method: "POST",
            body: JSON.stringify({ conteudo }),
        });
    },
};
