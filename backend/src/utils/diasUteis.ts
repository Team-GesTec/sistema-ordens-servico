/**
 * utils/diasUteis.ts
 *
 * Funções puras de calendário usadas no cálculo do SLA (3.1-BE01): ler data/hora num fuso,
 * somar dias úteis pulando sábados, domingos e feriados, e montar o fim do dia no fuso.
 *
 * Os dias são representados como texto "AAAA-MM-DD" (dia do calendário no fuso), o mesmo
 * formato da coluna `feriados.data`. Não acessa banco: quem chama passa os feriados.
 */

/** Partes de data/hora de um instante, vistas num fuso. */
export interface PartesDataHora {
    ano: number;
    mes: number;
    dia: number;
    hora: number;
    minuto: number;
    segundo: number;
}

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Lê ano, mês, dia, hora, minuto e segundo de um instante no fuso informado. */
export function partesNoFuso(instante: Date, fuso: string): PartesDataHora {
    const partes = new Intl.DateTimeFormat('en-CA', {
        timeZone: fuso,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(instante);

    const ler = (tipo: Intl.DateTimeFormatPartTypes): number =>
        Number(partes.find((parte) => parte.type === tipo)?.value ?? Number.NaN);

    return {
        ano: ler('year'),
        mes: ler('month'),
        dia: ler('day'),
        hora: ler('hour'),
        minuto: ler('minute'),
        segundo: ler('second'),
    };
}

/** Dia do calendário ("AAAA-MM-DD") de um instante no fuso informado. */
export function diaNoFuso(instante: Date, fuso: string): string {
    const { ano, mes, dia } = partesNoFuso(instante, fuso);
    return formatarDia(Date.UTC(ano, mes - 1, dia));
}

/** Soma `quantidade` dias corridos a um dia "AAAA-MM-DD". */
export function somarDiasCorridos(dia: string, quantidade: number): string {
    return formatarDia(lerDia(dia) + quantidade * UM_DIA_MS);
}

/** Indica se o dia "AAAA-MM-DD" é útil: não é sábado, domingo nem feriado. */
export function ehDiaUtil(dia: string, feriados: ReadonlySet<string>): boolean {
    const diaDaSemana = new Date(lerDia(dia)).getUTCDay();
    return diaDaSemana !== 0 && diaDaSemana !== 6 && !feriados.has(dia);
}

/**
 * Soma dias úteis a partir de um dia, sem contar o próprio dia de início.
 * Ex.: sexta + 1 dia útil = segunda (ou terça, se segunda for feriado).
 * @param inicio Dia de início "AAAA-MM-DD".
 * @param quantidade Quantidade de dias úteis (inteiro >= 0).
 * @param feriados Dias "AAAA-MM-DD" que não contam como úteis.
 * @returns O dia "AAAA-MM-DD" em que o prazo termina.
 */
export function somarDiasUteis(inicio: string, quantidade: number, feriados: ReadonlySet<string>): string {
    let dia = inicio;
    let contados = 0;
    while (contados < quantidade) {
        dia = somarDiasCorridos(dia, 1);
        if (ehDiaUtil(dia, feriados)) {
            contados += 1;
        }
    }
    return dia;
}

/**
 * Instante correspondente a 23:59:59.999 do dia "AAAA-MM-DD" no fuso informado.
 * Funciona para qualquer deslocamento do fuso (inclusive se houver horário de verão).
 */
export function fimDoDiaNoFuso(dia: string, fuso: string): Date {
    const [ano = 0, mes = 1, diaDoMes = 1] = dia.split('-').map(Number);
    const comoUtc = Date.UTC(ano, mes - 1, diaDoMes, 23, 59, 59, 999);

    let instante = comoUtc - deslocamentoMs(new Date(comoUtc), fuso);
    const ajuste = deslocamentoMs(new Date(instante), fuso);
    instante = comoUtc - ajuste;

    return new Date(instante);
}

/** Diferença (ms) entre o horário local do fuso e o UTC naquele instante (ex.: -3h em Brasília). */
function deslocamentoMs(instante: Date, fuso: string): number {
    const p = partesNoFuso(instante, fuso);
    const localComoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
    return localComoUtc - Math.floor(instante.getTime() / 1000) * 1000;
}

function lerDia(dia: string): number {
    const [ano = 0, mes = 1, diaDoMes = 1] = dia.split('-').map(Number);
    return Date.UTC(ano, mes - 1, diaDoMes);
}

function formatarDia(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10);
}
