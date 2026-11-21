/**
 * Utilitários de download de arquivos no navegador.
 *
 * Centraliza o fluxo já usado no download de anexos (US#2.6) e do PDF da O.S. (US#2.8):
 * Blob → URL de objeto → link `<a>` temporário → clique → remoção do link → liberação da URL.
 * Reutilizado na exportação do relatório de cliente em PDF (US#2.9).
 */

/** Tempo para o navegador iniciar o download antes de liberar a URL do objeto. */
const ATRASO_LIBERACAO_URL_MS = 1000;

/** Faz o navegador salvar o Blob com o nome informado. */
export function salvarArquivo(blob: Blob, nome: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Dá tempo ao navegador de iniciar o download antes de liberar a memória
    setTimeout(() => window.URL.revokeObjectURL(url), ATRASO_LIBERACAO_URL_MS);
}

/**
 * Confere a assinatura `%PDF-` do arquivo recebido (mesma verificação da exportação da O.S., US#2.8).
 * @throws Error se o conteúdo não for um PDF.
 */
export async function garantirPdfValido(blob: Blob): Promise<void> {
    const assinatura = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
    if (String.fromCharCode(...assinatura) !== "%PDF-") {
        throw new Error("O arquivo recebido não é um PDF válido.");
    }
}

/** Nome padronizado do relatório de cliente (US#2.9): `Cliente-{id}.pdf`. */
export function nomeArquivoPdfCliente(clienteId: number): string {
    return `Cliente-${clienteId}.pdf`;
}

/** Salva o relatório em PDF do cliente com o nome `Cliente-{id}.pdf`. */
export function salvarPdfCliente(blob: Blob, clienteId: number): void {
    salvarArquivo(blob, nomeArquivoPdfCliente(clienteId));
}
