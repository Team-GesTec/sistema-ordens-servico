/**
 * utils/dataHora.ts
 *
 * Funções puras de data/hora para exibição (US#2.10): formato "dd/mm/aaaa hh:mm" e início do
 * dia no fuso de Brasília. Reaproveita as funções de calendário de `diasUteis.ts`.
 *
 * ALTERAÇÕES (05/11/2026):
 *  - 2.10-BE02: criado para o histórico de atividades e os logs de auditoria.
 *
 * ALTERAÇÕES (06/11/2026):
 *  - filtro por período dos logs: `inicioDoDia` e `lerDiaCalendario`.
 */
import { diaNoFuso, fimDoDiaNoFuso, partesNoFuso, somarDiasCorridos } from './diasUteis';

/** Fuso usado nas datas exibidas ao usuário. */
export const FUSO_EXIBICAO = 'America/Sao_Paulo';

const doisDigitos = (valor: number): string => String(valor).padStart(2, '0');

/**
 * Formata um instante como "dd/mm/aaaa hh:mm" no fuso informado.
 * @example formatarDataHora(new Date('2026-11-05T17:30:00Z')) // "05/11/2026 14:30"
 */
export function formatarDataHora(instante: Date, fuso: string = FUSO_EXIBICAO): string {
    const { ano, mes, dia, hora, minuto } = partesNoFuso(instante, fuso);
    return `${doisDigitos(dia)}/${doisDigitos(mes)}/${ano} ${doisDigitos(hora)}:${doisDigitos(minuto)}`;
}

/** Primeiro instante (00:00:00.000) do dia "AAAA-MM-DD" no fuso informado. */
export function inicioDoDia(dia: string, fuso: string = FUSO_EXIBICAO): Date {
    const ontem = somarDiasCorridos(dia, -1);
    return new Date(fimDoDiaNoFuso(ontem, fuso).getTime() + 1);
}

/** Primeiro instante (00:00:00.000) do dia de `instante`, visto no fuso informado. */
export function inicioDoDiaNoFuso(instante: Date, fuso: string = FUSO_EXIBICAO): Date {
    return inicioDoDia(diaNoFuso(instante, fuso), fuso);
}

/**
 * Valida um dia do calendário no formato "AAAA-MM-DD" (o mesmo do `<input type="date">`).
 * @returns O próprio dia, ou `null` se o texto não for uma data real (ex.: "2026-02-30").
 */
export function lerDiaCalendario(valor: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const data = new Date(`${valor}T00:00:00Z`);
    return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor ? valor : null;
}
