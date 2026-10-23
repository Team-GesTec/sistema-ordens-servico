
type DataPrazo = string | Date | null | undefined;

/**
 * Converte datas DD/MM/AAAA, AAAA-MM-DD ou Date
 * para uma data local, sem considerar o horário.
 */
function converterData(data: DataPrazo): Date | null {
    if (!data) return null;

    if (data instanceof Date) {
        if (Number.isNaN(data.getTime())) return null;

        return new Date(
            data.getFullYear(),
            data.getMonth(),
            data.getDate()
        );
    }

    const valor = data.trim();
    let ano: number;
    let mes: number;
    let dia: number;

    const dataBrasileira = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const dataISO = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dataBrasileira) {
        [, dia, mes, ano] = dataBrasileira.map(Number);
    } else if (dataISO) {
        [, ano, mes, dia] = dataISO.map(Number);
    } else {
        return null;
    }

    const resultado = new Date(ano, mes - 1, dia);

    // Evita aceitar datas inválidas, como 31/02/2026.
    if (
        resultado.getFullYear() !== ano ||
        resultado.getMonth() !== mes - 1 ||
        resultado.getDate() !== dia
    ) {
        return null;
    }

    return resultado;
}

export function calcularDiasUteisRestantes(dataPrazo: DataPrazo): number | null {
    const dataFinal = converterData(dataPrazo);

    if (!dataFinal) return null;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataFinal < hoje) return 0;

    let diasUteis = 0;
    const dataAtual = new Date(hoje);

    while (dataAtual <= dataFinal) {
        const diaSemana = dataAtual.getDay();

        if (diaSemana !== 0 && diaSemana !== 6) {
            diasUteis++;
        }

        dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return diasUteis;
}
