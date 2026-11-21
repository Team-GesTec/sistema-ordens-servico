import { apiRequest } from "./api";
import type { HorasOrdem, RegistroHorasInput } from "../types/api";

const rotaHoras = (osId: number) => `/ordens-servico/${osId}/horas`;

export const horasService = {
    listar(osId: number): Promise<HorasOrdem> {
        return apiRequest<HorasOrdem>(rotaHoras(osId));
    },

    async registrar(osId: number, dados: RegistroHorasInput): Promise<void> {
        await apiRequest<unknown>(rotaHoras(osId), {
            method: "POST",
            body: JSON.stringify(dados),
        });
    },
};