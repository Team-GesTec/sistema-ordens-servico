import { apiRequest } from "./api";

export type EntidadeImportacao = "clientes" | "locais_operacionais" | "departamentos" | "funcionarios" | "projetos" | "ordens_servico";
export interface ImportacaoPreview {
    entidade: EntidadeImportacao;
    nomeArquivo: string;
    total: number;
    validos: number;
    invalidos: number;
    erros: Array<{ linha: number; coluna: string; mensagem: string }>;
    amostra: Array<{ linha: number; dados: Record<string, unknown>; erros: Array<{ coluna: string; mensagem: string }> }>;
}
export interface ResultadoImportacao {
    entidade: EntidadeImportacao;
    total: number;
    importados: number;
    falhas: number;
    parcial: boolean;
    completo: boolean;
    mensagem: string;
    erros: Array<{ linha: number; coluna: string; mensagem: string }>;
}

async function enviarArquivo<T>(entidade: EntidadeImportacao, etapa: "preview" | "confirmar", arquivo: File): Promise<T> {
    return apiRequest<T>(`/administracao/importacao/${entidade}/${etapa}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "X-Import-Filename": encodeURIComponent(arquivo.name),
        },
        body: await arquivo.arrayBuffer(),
    });
}

export const administracaoService = {
    preverImportacao(entidade: EntidadeImportacao, arquivo: File): Promise<ImportacaoPreview> {
        return enviarArquivo<ImportacaoPreview>(entidade, "preview", arquivo);
    },
    confirmarImportacao(entidade: EntidadeImportacao, arquivo: File): Promise<ResultadoImportacao> {
        return enviarArquivo<ResultadoImportacao>(entidade, "confirmar", arquivo);
    },

};
