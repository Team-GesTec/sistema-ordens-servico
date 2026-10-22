/**
 * utils/estadoSla.ts
 * 
 * Cálculo do estado de SLA de uma O.S. (US#3.2-BE01).
 * Fila, detalhe e dashboard utilizam esta função
 * 
 * Regras:
 * - O.S. concluída ou bloqueada: nao retorna erro. Retorna sem_sla
 * - sem data_limite_sla: retorna sem_sla (sem_erro)
 * - depois da data limite: vencido
 * - instalação: em risco depois de passado 80% do tempo (inicio = data_criacao)
 * - manutenção: em risco nas últimas 24 horas
 * - tempo contado em horas de calendário, sem descontar fim de semana ou feriados
 */

export type EstadoSla = 'sem_sla' | 'normal' | 'em_risco' | 'vencido' | 'encerrada';

export interface DadosSla {
    status: string;
    tipo: string;
    data_criacao: Date;
    data_limite_sla: Date | null;
}

/** Em instalacao o risco começa depois de passados 80% do tempo total */
const PERCENTUAL_RISCO_INSTALACAO = 0.8;

/** Em manutencao o risco começa 24 horas antes do limite */
const HORAS_RISCO_MANUTENCAO = 24;

const MS_POR_HORA = 60*60*1000;

/**
 * Calcula o estado do SLA de uma O.S. num determinado momento.
 * @param ordem A O.S. (ou qualquer objeto com os campos de DadosSla).
 * @param agora O momento de referência. Na API, `new Date()`; nos testes, uma data fixa.
 */
export function calcularEstadoSla(ordem: DadosSla, agora: Date): EstadoSla {    // 1. Concluída ou bloqueada: encerrada, não alerta
    if (ordem.status === 'concluido' || ordem.status === 'bloqueado') {
        return 'encerrada';
    }

    if (ordem.data_limite_sla === null) {
        return 'sem_sla';
    }

    const inicio = ordem.data_criacao.getTime();
    const limite = ordem.data_limite_sla.getTime();
    const momento = agora.getTime();

    if (momento > limite) {
        return 'vencido'
    }

    const limiarRisco = 
        ordem.tipo === 'instalacao'
            ? inicio + PERCENTUAL_RISCO_INSTALACAO * (limite - inicio)
            : limite - HORAS_RISCO_MANUTENCAO * MS_POR_HORA

    if (momento >= limiarRisco) {
        return 'em_risco'
    }

    return 'normal'
}