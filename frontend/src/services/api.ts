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

    if (options.body && !headers.has("Content-Type")) {
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


/** Faz download autenticado de um arquivo gerado pelo backend, sem expor URLs internas. */
export async function apiDownload(path: string, nomeArquivoSugerido: string): Promise<void> {
    const headers = new Headers();
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let response: Response;
    try {
        response = await fetch(`${getApiUrl()}${path}`, { method: "GET", headers });
    } catch {
        throw new ApiError(0, "Não foi possível conectar à API para gerar o arquivo.");
    }

    if (!response.ok) {
        const body = await response.text();
        let message = `Erro HTTP ${response.status} ao gerar o arquivo.`;
        try {
            const parsed: unknown = body ? JSON.parse(body) : undefined;
            if (typeof parsed === "object" && parsed !== null && "mensagem" in parsed && typeof parsed.mensagem === "string") {
                message = parsed.mensagem;
            }
        } catch {
            // Mantém a mensagem HTTP quando a API não retorna JSON estruturado.
        }
        if (response.status === 401) {
            clearAuthToken();
            sessionStorage.removeItem("sgos.user");
        }
        throw new ApiError(response.status, message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const contentDisposition = response.headers.get("Content-Disposition");
    const match = contentDisposition?.match(/filename\*?=(?:UTF-8''|")?([^;"]+)/i);
    const nomeArquivo = match?.[1]?.trim() || nomeArquivoSugerido;
    link.href = url;
    link.download = decodeURIComponent(nomeArquivo.replace(/^"|"$/g, ""));
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
