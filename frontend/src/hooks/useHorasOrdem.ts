import { useEffect, useState } from "react";
import { ApiError } from "../services/api";
import { horasService } from "../services/horas";
import type { HorasOrdem, OrdemServico, RegistroHorasInput } from "../types/api";

function mensagemErro(error: unknown, fallback: string): string {
    return error instanceof ApiError ? error.message : fallback;
}

export function useHorasOrdem(ordem: OrdemServico | null) {
    const osId = ordem?.id ?? null;
    const status = ordem?.status ?? null;

    const [lista, setLista] = useState<{ osId: number; horas: HorasOrdem | null; erro: string | null } | null>(null);

    const listaAtual = lista !== null && lista.osId === osId ? lista : null;
    const horas = listaAtual?.horas ?? null;
    const erroHoras = listaAtual?.erro ?? null;
    const carregandoHoras = osId !== null && listaAtual === null;

    async function recarregar(id: number): Promise<void> {
        try {
            const resultado = await horasService.listar(id);
            setLista({ osId: id, horas: resultado, erro: null });
        } catch (error) {
            setLista((atual) => ({
                osId: id,
                horas: atual?.osId === id ? atual.horas : null,
                erro: mensagemErro(error, "Não foi possível atualizar as horas desta O.S."),
            }));
        }
    }

    useEffect(() => {
        if (osId === null) return;

        let ativo = true;

        horasService
            .listar(osId)
            .then((resultado) => {
                if (ativo) setLista({ osId, horas: resultado, erro: null });
            })
            .catch((error: unknown) => {
                if (ativo) {
                    setLista((atual) => ({
                        osId,
                        horas: atual?.osId === osId ? atual.horas : null,
                        erro: mensagemErro(error, "Não foi possível carregar as horas desta O.S."),
                    }));
                }
            });

        return () => {
            ativo = false;
        };
    }, [osId, status]);

    async function registrarHoras(dados: RegistroHorasInput): Promise<void> {
        if (osId === null) return;

        try {
            await horasService.registrar(osId, dados);
        } catch (error) {
            throw new Error(mensagemErro(error, "Não foi possível registrar as horas. Tente novamente."));
        }
        await recarregar(osId);
    }

    return {
        horas,
        carregandoHoras,
        erroHoras,
        registrarHoras,
    };
}