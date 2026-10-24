import type { OrdemServico } from "../types/api";

/** Filtros de entrega: intervalo de data e quantidade de dias corridos restantes. */
export interface FiltrosPrazoOrdem {
    dataEntregaInicio: string;
    dataEntregaFim: string;
    diasRestantesMin: string;
    diasRestantesMax: string;
}

function dataISO(valor: string | null | undefined): string | null {
    if (!valor) return null;
    const somenteData = /^(\d{4}-\d{2}-\d{2})$/.exec(valor);
    if (somenteData) return somenteData[1];
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return null;
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(data);
    const obter = (tipo: "year" | "month" | "day") => partes.find((parte) => parte.type === tipo)?.value ?? "";
    return `${obter("year")}-${obter("month")}-${obter("day")}`;
}

function diaUTC(valorISO: string): number {
    const [ano, mes, dia] = valorISO.split("-").map(Number);
    return Date.UTC(ano, mes - 1, dia);
}

function diferencaDias(inicioISO: string, fimISO: string): number {
    return Math.round((diaUTC(fimISO) - diaUTC(inicioISO)) / 86_400_000);
}

function hojeLocalISO(): string {
    return dataISO(new Date().toISOString()) ?? new Date().toISOString().slice(0, 10);
}

function dentroIntervalo(valor: number, minimo: string, maximo: string): boolean {
    if (minimo !== "" && valor < Number(minimo)) return false;
    if (maximo !== "" && valor > Number(maximo)) return false;
    return true;
}

function inteiroSinalizadoValido(valor: string): boolean {
    return valor === "" || (/^-?\d+$/.test(valor) && Number.isSafeInteger(Number(valor)));
}

export function prazoFiltrosValidos(filtros: FiltrosPrazoOrdem): boolean {
    if (filtros.dataEntregaInicio && filtros.dataEntregaFim && filtros.dataEntregaInicio > filtros.dataEntregaFim) return false;
    return inteiroSinalizadoValido(filtros.diasRestantesMin) &&
        inteiroSinalizadoValido(filtros.diasRestantesMax) &&
        !(filtros.diasRestantesMin !== "" && filtros.diasRestantesMax !== "" && Number(filtros.diasRestantesMin) > Number(filtros.diasRestantesMax));
}

/** Dias restantes negativos significam vencida; zero vence hoje; positivos ainda estão no prazo. */
export function correspondeFiltrosPrazo(ordem: OrdemServico, filtros: FiltrosPrazoOrdem): boolean {
    if (!prazoFiltrosValidos(filtros)) return false;
    const temFiltroEntrega = Boolean(filtros.dataEntregaInicio || filtros.dataEntregaFim);
    const temFiltroDiasRestantes = filtros.diasRestantesMin !== "" || filtros.diasRestantesMax !== "";
    if (!temFiltroEntrega && !temFiltroDiasRestantes) return true;

    // Vencimento é uma fila operacional: ordens concluídas/inativas não devem aparecer nela.
    if (!ordem.ativo || ordem.status === "concluido") return false;

    const entrega = dataISO(ordem.data_limite_sla);
    if (!entrega) return false;
    if (filtros.dataEntregaInicio && entrega < filtros.dataEntregaInicio) return false;
    if (filtros.dataEntregaFim && entrega > filtros.dataEntregaFim) return false;
    if (temFiltroDiasRestantes) {
        const restantes = diferencaDias(hojeLocalISO(), entrega);
        if (!dentroIntervalo(restantes, filtros.diasRestantesMin, filtros.diasRestantesMax)) return false;
    }
    return true;
}

export function diasCorridosRestantes(entrega: string | null | undefined, hojeISO = hojeLocalISO()): number | null {
    const dataEntrega = dataISO(entrega);
    if (!dataEntrega) return null;
    return diferencaDias(hojeISO, dataEntrega);
}
