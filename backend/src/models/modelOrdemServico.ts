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
    criticidade_id: number | null;
    anterior_id?: number | null;
}