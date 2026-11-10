/**
 * utils/duracao.ts
 * Converte a duração no formato Jira ("2w 4d 6h 45m") em minutos (1d = 8h, 1w = 5d).
 */
import { AppError } from '../errors/AppError';
import { INTEIRO_MAXIMO_POSTGRES } from './validacao';

const MINUTOS_POR_DIA = 8 * 60;
const MINUTOS_POR_SEMANA = 5 * MINUTOS_POR_DIA;
const FORMATO_DURACAO = /^(?:(\d+)w)?\s*(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?$/i;

export function duracaoParaMinutos(valor: unknown): number {
    const partes = typeof valor === 'string' ? valor.trim().match(FORMATO_DURACAO) : null;
    if (!partes) {
        throw new AppError('duracao inválida: use o formato 2w 4d 6h 45m', 422);
    }

    const [, semanas = '0', dias = '0', horas = '0', minutos = '0'] = partes;
    const total =
        Number(semanas) * MINUTOS_POR_SEMANA +
        Number(dias) * MINUTOS_POR_DIA +
        Number(horas) * 60 +
        Number(minutos);

    if (total <= 0) {
        throw new AppError('duracao deve ser maior que zero', 422);
    }
    if (total > INTEIRO_MAXIMO_POSTGRES) {
        throw new AppError('duracao é grande demais para ser registrada', 422);
    }
    return total;
}
