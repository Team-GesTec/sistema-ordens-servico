/** SLA Opcional por enquanto: o SLA só entra na Sprint 2 (US#3.1). */

import type { ordens_servico } from '../../prisma/generated/client';

export type OrdemServico = ordens_servico;

/** Dados validados para criar uma O.S. */
export interface DadosCriacaoOrdemServico {
    tipo: 'instalacao' | 'manutencao';
    descricao: string;
    cliente_id: number;
    departamento_id: number;
    solicitante_id: number;
    projeto_id?: number | null;
    criticidade?: 'baixo' | 'medio' | 'alto' | 'muito_alto' | 'urgente';
    anterior_id?: number | null;
}

// conforme lista informada pelo P.O. em 09/10
export type StatusOrdemServico =
    | 'em_andamento'
    | 'aguardando'
    | 'validacao_testes'
    | 'bloqueado'
    | 'concluido';

export interface DadosAlteracaoStatus {
    status: StatusOrdemServico;
    parecer_tecnico?: string | null;
}