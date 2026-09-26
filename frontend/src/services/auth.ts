import { apiRequest, clearAuthToken, getAuthToken, setAuthToken } from "./api";
import type { Funcionario, LoginResponse } from "../types/api";

const USER_KEY = "sgos.user";

function saveUser(user: Funcionario): void {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): Funcionario | null {
    const raw = sessionStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw) as Funcionario;
    } catch {
        sessionStorage.removeItem(USER_KEY);
        return null;
    }
}

export const authService = {
    async login(usuario: string, senha: string): Promise<LoginResponse> {
        const resposta = await apiRequest<LoginResponse>(
            "/auth/login",
            {
                method: "POST",
                body: JSON.stringify({ usuario, senha }),
            },
            false,
        );

        setAuthToken(resposta.token);
        saveUser(resposta.funcionario);
        return resposta;
    },

    async me(): Promise<Funcionario> {
        const token = getAuthToken();
        if (!token) {
            throw new Error("Sessão ausente.");
        }

        const usuario = await apiRequest<Funcionario>("/auth/me");
        saveUser(usuario);
        return usuario;
    },

    logout(): void {
        clearAuthToken();
        sessionStorage.removeItem(USER_KEY);
    },

    hasSession(): boolean {
        return Boolean(getAuthToken());
    },
};
