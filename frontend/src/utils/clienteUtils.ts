
import type { Cliente } from "../types/api";
import { ApiError } from "../services/api";

export type FiltroSituacao = "ativos" | "inativos" | "todos";

export type AcaoStatus = "inativar";

export interface DadosFormularioCliente {
    nome: string;
    razao_social: string;
    ramo_atuacao: string;
}

export function mensagemErro(
    error: unknown,
    alternativa: string
): string {
    if (error instanceof ApiError) {
        if (error.status === 403) {
            return "Você não tem permissão para realizar esta ação.";
        }

        if (error.status === 409) {
            return error.message;
        }

        return error.message;
    }

    return alternativa;
}

export function correspondeBusca(
    cliente: Cliente,
    termo: string
): boolean {
    const consulta = termo.trim().toLocaleLowerCase("pt-BR");

    if (!consulta) {
        return true;
    }

    const valores = [
        cliente.nome,
        cliente.razao_social,
        cliente.ramo_atuacao,
        String(cliente.id),
        cliente.ativo ? "ativo" : "inativo",
    ];

    return valores.some((valor) =>
        valor.toLocaleLowerCase("pt-BR").includes(consulta)
    );
}

export function gerarIniciais(nome: string): string {
    return nome
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toLocaleUpperCase("pt-BR"))
        .join("");
}
