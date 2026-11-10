/**
 * Cliente HTTP único do frontend: monta a URL da API, envia o token JWT e padroniza os erros
 * (`ApiError` com a `mensagem` devolvida pelo backend).
 *
 * US#2.6 (anexos): `apiRequest` aceita `FormData` (o navegador define o Content-Type multipart),
 * `apiUpload` envia arquivos com progresso e `apiDownload` baixa arquivos binários com o token.
 */
import { publishToast } from "./feedbackEvents";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
const TOKEN_KEY = "sgos.jwt";

type CorpoOperacao = { ativo?: unknown } | undefined;

function ehMutacao(method: string, path: string): boolean {
    return !["GET", "HEAD", "OPTIONS"].includes(method) && !/^\/auth(?:\/|$)/i.test(path);
}

function recursoDaRota(path: string): string {
    const rota = path.toLocaleLowerCase("pt-BR");
    if (rota.includes("ordens-servico")) return "Ordem de serviço";
    if (rota.includes("/cliente")) return "Cliente";
    if (rota.includes("/funcionario")) return "Funcionário";
    if (rota.includes("/projeto")) return "Projeto";
    if (rota.includes("/departamento")) return "Departamento";
    if (rota.includes("/anexos")) return "Anexo";
    if (rota.includes("/administracao/importacao")) return "Importação";
    if (rota.includes("/notificacoes")) return "Notificação";
    return "Operação";
}

function corpoDaRequisicao(body: BodyInit | null | undefined): CorpoOperacao {
    if (typeof body !== "string") return undefined;
    try {
        const parsed: unknown = JSON.parse(body);
        return parsed && typeof parsed === "object" ? parsed as CorpoOperacao : undefined;
    } catch {
        return undefined;
    }
}

function emitirSucessoDaOperacao(path: string, method: string, requestBody: BodyInit | null | undefined): void {
    const rota = path.toLocaleLowerCase("pt-BR");
    const recurso = recursoDaRota(path);
    const dados = corpoDaRequisicao(requestBody);

    if (rota.includes("/administracao/importacao") && rota.includes("/preview")) {
        publishToast({ title: "Prévia de importação pronta", message: "Confira os dados e as validações antes de confirmar a importação.", variant: "success" });
        return;
    }
    if (rota.includes("/administracao/importacao")) {
        publishToast({ title: "Importação concluída", message: "O processamento do arquivo foi concluído.", variant: "success" });
        return;
    }
    if (rota.includes("/notificacoes") && rota.includes("dispensar")) {
        publishToast({ title: "Notificação dispensada", message: "A notificação foi dispensada.", variant: "success" });
        return;
    }
    if (rota.includes("/anexos") && method === "POST") {
        publishToast({ title: "Anexo enviado", message: "O arquivo foi anexado à ordem de serviço.", variant: "success" });
        return;
    }
    if (rota.includes("/status")) {
        publishToast({ title: "Status atualizado", message: "O status da ordem de serviço foi atualizado com sucesso.", variant: "success" });
        return;
    }
    if (rota.includes("/sla-manual")) {
        publishToast({ title: "Prazo atualizado", message: "O prazo de atendimento foi atualizado com sucesso.", variant: "success" });
        return;
    }
    if (rota.includes("/atribuir/")) {
        publishToast({ title: "Responsável atualizado", message: "A atribuição da ordem de serviço foi atualizada.", variant: "success" });
        return;
    }
    if (rota.includes("/bloquear/")) {
        publishToast({ title: "Ordem bloqueada", message: "A ordem de serviço foi bloqueada com sucesso.", variant: "success" });
        return;
    }
    if (rota.endsWith("/ativar") || rota.endsWith("/ativo")) {
        const ativo = rota.endsWith("/ativar") ? true : dados && typeof dados.ativo === "boolean" ? dados.ativo : undefined;
        const verbo = ativo === undefined ? "Situação atualizada" : ativo ? "Registro ativado" : "Registro inativado";
        publishToast({ title: verbo, message: `${recurso} ${ativo === false ? "inativado" : ativo === true ? "ativado" : "atualizado"} com sucesso.`, variant: "success" });
        return;
    }
    if (method === "DELETE" && rota.includes("/funcionario/")) {
        publishToast({ title: "Funcionário inativado", message: "O funcionário foi inativado com sucesso.", variant: "success" });
        return;
    }
    if (method === "POST") {
        const titulo = recurso === "Ordem de serviço" ? "Ordem de serviço criada" : `${recurso} cadastrado`;
        const mensagem = recurso === "Ordem de serviço" ? "A ordem de serviço foi criada com sucesso." : `${recurso} cadastrado com sucesso.`;
        publishToast({ title: titulo, message: mensagem, variant: "success" });
        return;
    }
    if (method === "DELETE") {
        publishToast({ title: `${recurso} removido`, message: `${recurso} removido com sucesso.`, variant: "success" });
        return;
    }
    publishToast({ title: `${recurso} atualizado`, message: `${recurso} atualizado com sucesso.`, variant: "success" });
}

function emitirErroDaOperacao(path: string, message: string): void {
    const recurso = recursoDaRota(path);
    publishToast({
        title: `Não foi possível concluir a operação`,
        message: message || `Não foi possível atualizar ${recurso.toLocaleLowerCase("pt-BR")}. Tente novamente.`,
        variant: "error",
        duration: 8000,
    });
}

export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export function getAuthToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
}

function getApiUrl(): string {
    if (!API_URL) {
        throw new Error("VITE_API_URL não está configurada.");
    }
    return API_URL;
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
    requireAuth = true,
    notificarFalha = true,
): Promise<T> {
    const headers = new Headers(options.headers);
    const method = (options.method ?? "GET").toUpperCase();
    const notifyMutation = ehMutacao(method, path);
    const notifyFailure = notificarFalha && (notifyMutation || (method === "GET" && !/^\/auth(?:\/|$)/i.test(path)));

    // Com FormData o navegador define o Content-Type multipart (com o boundary) sozinho
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (requireAuth) {
        const token = getAuthToken();
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }
    }

    let response: Response;
    try {
        response = await fetch(`${getApiUrl()}${path}`, {
            ...options,
            headers,
        });
    } catch {
        const message = "Não foi possível conectar à API. Verifique se o backend está em execução.";
        if (notifyFailure) emitirErroDaOperacao(path, message);
        throw new ApiError(0, message);
    }

    const rawBody = await response.text();
    let body: unknown = undefined;
    if (rawBody) {
        try {
            body = JSON.parse(rawBody) as unknown;
        } catch {
            body = rawBody;
        }
    }

    if (!response.ok) {
        if (response.status === 401 && requireAuth) {
            clearAuthToken();
            sessionStorage.removeItem("sgos.user");
        }

        const message =
            typeof body === "object" && body !== null && "mensagem" in body && typeof body.mensagem === "string"
                ? body.mensagem
                : `Erro HTTP ${response.status}`;

        if (notifyFailure) emitirErroDaOperacao(path, message);
        throw new ApiError(response.status, message);
    }

    if (notifyMutation) emitirSucessoDaOperacao(path, method, options.body);

    if (response.status === 204 || rawBody.length === 0) {
        return undefined as T;
    }

    return body as T;
}


/** Lê a mensagem padronizada `{ mensagem }` de um corpo de erro da API. */
function mensagemDoCorpo(texto: string, status: number): string {
    try {
        const corpo = JSON.parse(texto) as unknown;
        if (typeof corpo === "object" && corpo !== null && "mensagem" in corpo && typeof corpo.mensagem === "string") {
            return corpo.mensagem;
        }
    } catch {
        // Corpo vazio ou que não é JSON: usa a mensagem genérica
    }
    return `Erro HTTP ${status}`;
}

/** Encerra a sessão local quando a API recusa o token (mesmo comportamento de `apiRequest`). */
function encerrarSessaoSeNaoAutorizado(status: number): void {
    if (status === 401) {
        clearAuthToken();
        sessionStorage.removeItem("sgos.user");
    }
}

/**
 * Envia um formulário multipart (ex.: arquivo de anexo) informando o progresso do upload.
 * Usa XMLHttpRequest porque o `fetch` não informa o progresso do envio.
 * @param onProgresso Recebe o percentual enviado (0 a 100).
 */
export function apiUpload<T>(
    path: string,
    formulario: FormData,
    onProgresso?: (percentual: number) => void,
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let url: string;
        try {
            url = `${getApiUrl()}${path}`;
        } catch {
            const message = "VITE_API_URL não está configurada.";
            publishToast({ title: "Falha no envio do anexo", message, variant: "error", duration: 8000 });
            reject(new ApiError(0, message));
            return;
        }
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url);

        const token = getAuthToken();
        if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.upload.onprogress = (evento) => {
            if (evento.lengthComputable && onProgresso) {
                onProgresso((evento.loaded / evento.total) * 100);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const resultado = (xhr.responseText ? JSON.parse(xhr.responseText) : undefined) as T;
                    publishToast({ title: "Anexo enviado", message: "O arquivo foi anexado à ordem de serviço.", variant: "success" });
                    resolve(resultado);
                } catch {
                    const message = "Resposta inválida da API.";
                    publishToast({ title: "Não foi possível enviar o anexo", message, variant: "error", duration: 8000 });
                    reject(new ApiError(xhr.status, message));
                }
                return;
            }
            encerrarSessaoSeNaoAutorizado(xhr.status);
            const message = mensagemDoCorpo(xhr.responseText, xhr.status);
            publishToast({ title: "Não foi possível enviar o anexo", message, variant: "error", duration: 8000 });
            reject(new ApiError(xhr.status, message));
        };

        xhr.onerror = () => {
            const message = "Não foi possível conectar à API. Verifique se o backend está em execução.";
            publishToast({ title: "Falha no envio do anexo", message, variant: "error", duration: 8000 });
            reject(new ApiError(0, message));
        };

        xhr.send(formulario);
    });
}

/** Arquivo baixado da API. */
export interface ArquivoBaixado {
    blob: Blob;
    /** Nome do arquivo informado pela API (Content-Disposition), ou null. */
    nomeArquivo: string | null;
}

/** Lê o nome do arquivo do cabeçalho Content-Disposition (prefere o `filename*` em UTF-8). */
function nomeDoContentDisposition(cabecalho: string | null): string | null {
    if (!cabecalho) return null;

    const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(cabecalho);
    if (utf8?.[1]) {
        try {
            return decodeURIComponent(utf8[1]);
        } catch {
            // Valor malformado: tenta o filename simples
        }
    }
    const simples = /filename="([^"]+)"/i.exec(cabecalho);
    return simples?.[1] ?? null;
}

/** Baixa um arquivo binário de uma rota protegida (o token vai no cabeçalho, não na URL). */
export async function apiDownload(path: string): Promise<ArquivoBaixado> {
    const headers = new Headers();
    const token = getAuthToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    let response: Response;
    try {
        response = await fetch(`${getApiUrl()}${path}`, { headers });
    } catch {
        const message = "Não foi possível conectar à API. Verifique se o backend está em execução.";
        publishToast({ title: "Falha no download", message, variant: "error", duration: 8000 });
        throw new ApiError(0, message);
    }

    if (!response.ok) {
        encerrarSessaoSeNaoAutorizado(response.status);
        const message = mensagemDoCorpo(await response.text(), response.status);
        publishToast({ title: "Não foi possível baixar o arquivo", message, variant: "error", duration: 8000 });
        throw new ApiError(response.status, message);
    }

    const blob = await response.blob();
    publishToast({ title: "Download iniciado", message: "O arquivo foi preparado para download.", variant: "success" });
    return {
        blob,
        nomeArquivo: nomeDoContentDisposition(response.headers.get("Content-Disposition")),
    };
}

/** URL absoluta de uma rota da API (ex.: link exibido para um anexo). */
export function urlDaApi(path: string): string {
    return `${getApiUrl()}${path}`;
}
