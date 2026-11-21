import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../services/api";
import { comentarioService } from "../services/comentario";
import type { ComentarioOrdem } from "../types/api";

function mensagemErro(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback;
}

export function useComentariosOrdem(osId: number | null, habilitado: boolean) {
    const [comentarios, setComentarios] = useState<ComentarioOrdem[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const recarregar = useCallback(async () => {
        if (osId === null || !habilitado) return;
        setCarregando(true);
        setErro(null);
        try {
            setComentarios(await comentarioService.listar(osId));
        } catch (error: unknown) {
            setErro(mensagemErro(error, "Não foi possível carregar os comentários."));
        } finally {
            setCarregando(false);
        }
    }, [osId, habilitado]);

    useEffect(() => {
        setComentarios([]);
        setErro(null);
        if (!habilitado || osId === null) {
            setCarregando(false);
            return;
        }

        let vigente = true;
        setCarregando(true);
        comentarioService.listar(osId)
            .then((resultado) => {
                if (vigente) setComentarios(resultado);
            })
            .catch((error: unknown) => {
                if (vigente) setErro(mensagemErro(error, "Não foi possível carregar os comentários."));
            })
            .finally(() => {
                if (vigente) setCarregando(false);
            });

        return () => { vigente = false; };
    }, [osId, habilitado]);

    const enviar = useCallback(async (conteudo: string): Promise<void> => {
        if (osId === null || !habilitado) return;
        setEnviando(true);
        setErro(null);
        try {
            const criado = await comentarioService.criar(osId, conteudo);
            setComentarios((atuais) => [...atuais, criado]);
        } catch (error: unknown) {
            const mensagem = mensagemErro(error, "Não foi possível enviar o comentário.");
            setErro(mensagem);
            throw new Error(mensagem);
        } finally {
            setEnviando(false);
        }
    }, [osId, habilitado]);

    return { comentarios, carregando, enviando, erro, enviar, recarregar };
}
