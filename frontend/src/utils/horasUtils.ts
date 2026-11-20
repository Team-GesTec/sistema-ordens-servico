
const MINUTOS_POR_DIA = 8 * 60;
const MINUTOS_POR_SEMANA = 5 * MINUTOS_POR_DIA;
const FORMATO_DURACAO = /^(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?$/i;

export function hojeNoBrasil(): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function validarDuracao(valor: string): string | null {
    const texto = valor.trim();
    const partes = texto.match(FORMATO_DURACAO);
    if (!texto || !partes) return "Use o formato 2w 4d 6h 45m (ex.: 2h 30m).";

    const [, semanas = "0", dias = "0", horas = "0", minutos = "0"] = partes;
    const total =
        Number(semanas) * MINUTOS_POR_SEMANA +
        Number(dias) * MINUTOS_POR_DIA +
        Number(horas) * 60 +
        Number(minutos);

    return total > 0 ? null : "A duração deve ser maior que zero.";
}

export function validarDataTrabalho(valor: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "Informe a data em que o trabalho foi feito.";
    if (valor > hojeNoBrasil()) return "A data do trabalho não pode estar no futuro.";
    return null;
}

export function formatarDataTrabalho(valor: string): string {
    const [ano, mes, dia] = valor.split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}