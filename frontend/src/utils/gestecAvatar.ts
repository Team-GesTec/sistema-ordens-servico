export const GESTEC_AVATAR_TONES = ["green", "blue", "yellow"] as const;

export type GestecAvatarTone = (typeof GESTEC_AVATAR_TONES)[number];

/** Retorna duas iniciais: primeira e última palavra; para nome único, usa as duas primeiras letras. */
export function getGestecInitials(value: string | null | undefined, fallback = "US"): string {
    const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toLocaleUpperCase("pt-BR");
    }
    if (words.length === 1) {
        return words[0].slice(0, 2).toLocaleUpperCase("pt-BR");
    }
    return fallback.slice(0, 2).padEnd(2, "?").toLocaleUpperCase("pt-BR");
}

/** Ciclo visual fixo usado nas listas: verde, azul e amarelo. */
export function getGestecAvatarTone(index: number): GestecAvatarTone {
    const normalizedIndex = Number.isFinite(index) ? Math.max(0, Math.trunc(index)) : 0;
    return GESTEC_AVATAR_TONES[normalizedIndex % GESTEC_AVATAR_TONES.length];
}
