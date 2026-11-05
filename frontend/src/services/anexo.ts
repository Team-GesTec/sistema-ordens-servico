/**
 * Serviço de anexos da O.S. (US#2.6): regras do servidor, listagem, upload com progresso e download.
 * O download passa pela API com o token: o bucket do Supabase é privado e não tem URL pública.
 */
import { apiDownload, apiRequest, apiUpload, urlDaApi, type ArquivoBaixado } from "./api";
import type { Anexo, ConfiguracaoAnexos } from "../types/api";

const rotaAnexos = (osId: number) => `/ordens-servico/${osId}/anexos`;

export const anexoService = {
    /** GET /anexos/configuracao — tipos aceitos, tamanho e quantidade máximos (PE-12). */
    configuracao(): Promise<ConfiguracaoAnexos> {
        return apiRequest<ConfiguracaoAnexos>("/anexos/configuracao");
    },

    /** GET /ordens-servico/:id/anexos — anexos da O.S., mais recentes primeiro. */
    listar(osId: number): Promise<Anexo[]> {
        return apiRequest<Anexo[]>(rotaAnexos(osId));
    },

    /**
     * POST /ordens-servico/:id/anexos — envia UM arquivo (campo "arquivo") e o relato opcional.
     * @param onProgresso Percentual enviado deste arquivo (0 a 100).
     */
    enviar(
        osId: number,
        arquivo: File,
        relato: string,
        onProgresso?: (percentual: number) => void,
    ): Promise<Anexo> {
        const formulario = new FormData();
        if (relato) {
            formulario.append("relato", relato);
        }
        formulario.append("arquivo", arquivo, arquivo.name);
        return apiUpload<Anexo>(rotaAnexos(osId), formulario, onProgresso);
    },

    /** GET /ordens-servico/:id/anexos/:anexoId/download — conteúdo do arquivo. */
    baixar(osId: number, anexoId: number): Promise<ArquivoBaixado> {
        return apiDownload(`${rotaAnexos(osId)}/${anexoId}/download`);
    },

    /** Endereço do download (exibido no link; o clique baixa pela API, com o token). */
    urlDownload(osId: number, anexoId: number): string {
        return urlDaApi(`${rotaAnexos(osId)}/${anexoId}/download`);
    },
};
