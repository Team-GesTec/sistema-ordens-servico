/**
 * Hook dos anexos da O.S. (US#2.6): carrega as regras do servidor (tipos, tamanho e quantidade),
 * lista os anexos da O.S. aberta no modal de detalhes, envia arquivos com progresso e baixa anexos.
 *
 * O relato digitado no modal acompanha cada arquivo enviado. Os arquivos são enviados um por vez
 * (a API recebe um arquivo por requisição); se algum falhar, os que já foram enviados são informados
 * em `ErroEnvioAnexos.enviados` para o modal tirá-los da seleção e não duplicar em um novo envio.
 */

import { useEffect, useState } from "react";
import { ApiError } from "../services/api";
import { anexoService } from "../services/anexo";
import type { Anexo, ConfiguracaoAnexos, OrdemServico } from "../types/api";
import type { AnexoOrdem, AnexoOrdemPayload } from "../components/ordens/OrdemServicoDetalhesModal";

function mensagemErro(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
}

/** Erro de um envio em que parte dos arquivos já foi gravada. */
export class ErroEnvioAnexos extends Error {
    readonly enviados: File[];

    constructor(mensagem: string, enviados: File[]) {
        super(mensagem);
        this.name = "ErroEnvioAnexos";
        this.enviados = enviados;
    }
}

/** Converte o anexo da API para o formato exibido no modal. */
function paraAnexoOrdem(anexo: Anexo): AnexoOrdem {
    return {
        id: anexo.id,
        nome: anexo.nome,
        tamanho_bytes: anexo.tamanho,
        data_envio: anexo.data,
        url: anexoService.urlDownload(anexo.os_id, anexo.id),
        autor: anexo.autor.nome,
        relato: anexo.relato,
    };
}

/** Faz o navegador salvar o arquivo baixado com o nome original. */
function salvarArquivo(blob: Blob, nome: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Dá tempo ao navegador de iniciar o download antes de liberar a memória
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * @param ordem O.S. aberta no modal de detalhes (null quando o modal está fechado).
 */
export function useAnexosOrdem(ordem: OrdemServico | null) {
    const osId = ordem?.id ?? null;

    const [configuracao, setConfiguracao] = useState<ConfiguracaoAnexos | null>(null);
    // Última lista carregada, com a O.S. a que pertence (evita mostrar anexos de outra O.S.).
    const [lista, setLista] = useState<{ osId: number; anexos: AnexoOrdem[]; erro: string | null } | null>(null);

    const listaAtual = lista !== null && lista.osId === osId ? lista : null;
    const anexos = listaAtual?.anexos ?? [];
    const erroAnexos = listaAtual?.erro ?? null;
    const carregandoAnexos = osId !== null && listaAtual === null;

    // Regras do servidor: carregadas uma vez. Se falhar, a tela não restringe e o backend valida.
    useEffect(() => {
        let ativo = true;

        anexoService
            .configuracao()
            .then((resultado) => {
                if (ativo) setConfiguracao(resultado);
            })
            .catch(() => {
                if (ativo) setConfiguracao(null);
            });

        return () => {
            ativo = false;
        };
    }, []);

    async function recarregar(id: number): Promise<void> {
        try {
            const resultado = await anexoService.listar(id);
            setLista({ osId: id, anexos: resultado.map(paraAnexoOrdem), erro: null });
        } catch (error) {
            setLista((atual) => ({
                osId: id,
                anexos: atual?.osId === id ? atual.anexos : [],
                erro: mensagemErro(error, "Não foi possível atualizar a lista de anexos."),
            }));
        }
    }

    // Lista os anexos sempre que uma O.S. é aberta nos detalhes.
    useEffect(() => {
        if (osId === null) return;

        let ativo = true;

        anexoService
            .listar(osId)
            .then((resultado) => {
                if (ativo) setLista({ osId, anexos: resultado.map(paraAnexoOrdem), erro: null });
            })
            .catch((error: unknown) => {
                if (ativo) {
                    setLista({
                        osId,
                        anexos: [],
                        erro: mensagemErro(error, "Não foi possível carregar os anexos desta O.S."),
                    });
                }
            });

        return () => {
            ativo = false;
        };
    }, [osId]);

    /**
     * Envia os arquivos selecionados, um por vez, com o relato junto de cada um.
     * O progresso informado é o total de bytes já enviados de todos os arquivos.
     */
    async function enviarAnexo(
        dados: AnexoOrdemPayload,
        onProgresso: (percentual: number) => void,
    ): Promise<void> {
        if (osId === null) return;

        if (dados.arquivos.length === 0) {
            throw new Error("Selecione ao menos um arquivo. O relato é enviado junto com os anexos.");
        }

        const maximo = configuracao?.quantidade_maxima_por_os;
        if (maximo !== undefined && anexos.length + dados.arquivos.length > maximo) {
            throw new Error(
                `Esta O.S. aceita no máximo ${maximo} anexo(s) e já possui ${anexos.length}. ` +
                "Remova arquivos da seleção para continuar.",
            );
        }

        const totalBytes = dados.arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0) || 1;
        let bytesConcluidos = 0;
        const enviados: File[] = [];

        try {
            for (const arquivo of dados.arquivos) {
                try {
                    await anexoService.enviar(osId, arquivo, dados.relato, (percentual) => {
                        onProgresso(((bytesConcluidos + (arquivo.size * percentual) / 100) / totalBytes) * 100);
                    });
                } catch (error) {
                    const motivo = mensagemErro(error, "Não foi possível enviar o arquivo. Tente novamente.");
                    const prefixo = enviados.length > 0
                        ? `${enviados.length} arquivo(s) enviado(s). `
                        : "";
                    throw new ErroEnvioAnexos(`${prefixo}"${arquivo.name}": ${motivo}`, [...enviados]);
                }

                enviados.push(arquivo);
                bytesConcluidos += arquivo.size;
                onProgresso((bytesConcluidos / totalBytes) * 100);
            }
        } finally {
            // Atualiza a lista mesmo quando só parte dos arquivos foi enviada
            if (enviados.length > 0) {
                await recarregar(osId);
            }
        }
    }

    /** Baixa o anexo pela API (com o token) e salva com o nome original. */
    async function baixarAnexo(anexo: AnexoOrdem): Promise<void> {
        if (osId === null) return;

        try {
            const { blob, nomeArquivo } = await anexoService.baixar(osId, anexo.id);
            salvarArquivo(blob, nomeArquivo ?? anexo.nome);
        } catch (error) {
            throw new Error(mensagemErro(error, `Não foi possível baixar "${anexo.nome}".`));
        }
    }

    return {
        anexos,
        carregandoAnexos,
        erroAnexos,
        /** Extensões aceitas (sem ponto), vindas do servidor. Vazio = sem restrição na tela. */
        tiposPermitidos: configuracao?.extensoes_permitidas ?? [],
        enviarAnexo,
        baixarAnexo,
    };
}
