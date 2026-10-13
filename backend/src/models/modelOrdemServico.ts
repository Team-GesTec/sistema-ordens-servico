/** SLA Opcional por enquanto: o SLA só entra na Sprint 2 (US#3.1). 
 * 
 * ALTERAÇÃO (08/10/26): adicionado os dados de atualizção da OS.
 * 
 * NOTA (08/10/26): SLA ainda a fazer, é necessário criação da SLA no banco de dados.
*/

import type { ordens_servico } from '../prisma/generated/client';
import { status_enum, nivel_criticidade } from '../prisma/generated/client';

/** Status válidos (espelho do enum `status_enum`). */
export const STATUS_ORDEM = Object.values(status_enum);

/** Um dos status de Ordem. */
export type StatusOrdemServico = status_enum;

/** Status atribuído quando o cadastro não informa `status` (mesmo default do schema). */
export const STATUS_PADRAO: StatusOrdemServico = status_enum.em_andamento;

export type OrdemServico = ordens_servico;

/** Dados validados para criar uma O.S. */
export interface DadosCriacaoOrdemServico {
    tipo: 'instalacao' | 'manutencao';
    titulo: string;
    descricao: string;
    sla_config_id: number | null;
    cliente_id: number | null;
    departamento_id: number;
    solicitante_id: number;
    responsavel_id: number | null;
    projeto_id: number | null;
    ativo_id: number | null;
    criticidade: nivel_criticidade;
    anterior_id: number | null;
    parecer_tecnico: string | null;
    status: status_enum;
    data_criacao: Date;
    prazo_dias_uteis: number | null;
    data_inicio: Date | null;
    data_fim: Date | null;
    data_limite_sla: Date | null;
    sla_manual: boolean;
    justificativa_sla_manual: string | null;
}

/** Dados validados para atualizar uma OS (só os campos presentes são alterados.) */
export type DadosAtualizacaoOrdemServico = Partial<DadosCriacaoOrdemServico>;