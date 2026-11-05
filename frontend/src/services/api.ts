/**
 * Cliente HTTP único do frontend: monta a URL da API, envia o token JWT e padroniza os erros
 * (`ApiError` com a `mensagem` devolvida pelo backend).
 *
 * US#2.6 (anexos): `apiRequest` aceita `FormData` (o navegador define o Content-Type multipart),
 * `apiUpload` envia arquivos com progresso e `apiDownload` baixa arquivos binários com o token.
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
const TOKEN_KEY = "sgos.jwt";

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
): Promise<T> {
    const headers = new Headers(options.headers);

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
        throw new ApiError(0, "Não foi possível conectar à API. Verifique se o backend está em execução.");
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

        throw new ApiError(response.status, message);
    }

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
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${getApiUrl()}${path}`);

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
                    resolve((xhr.responseText ? JSON.parse(xhr.responseText) : undefined) as T);
                } catch {
                    reject(new ApiError(xhr.status, "Resposta inválida da API."));
                }
                return;
            }
            encerrarSessaoSeNaoAutorizado(xhr.status);
            reject(new ApiError(xhr.status, mensagemDoCorpo(xhr.responseText, xhr.status)));
        };

        xhr.onerror = () => {
            reject(new ApiError(0, "Não foi possível conectar à API. Verifique se o backend está em execução."));
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
        throw new ApiError(0, "Não foi possível conectar à API. Verifique se o backend está em execução.");
    }

    if (!response.ok) {
        encerrarSessaoSeNaoAutorizado(response.status);
        throw new ApiError(response.status, mensagemDoCorpo(await response.text(), response.status));
    }

    return {
        blob: await response.blob(),
        nomeArquivo: nomeDoContentDisposition(response.headers.get("Content-Disposition")),
    };
}

/** URL absoluta de uma rota da API (ex.: link exibido para um anexo). */
export function urlDaApi(path: string): string {
    return `${getApiUrl()}${path}`;
}
