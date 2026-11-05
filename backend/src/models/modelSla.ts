/**
 * models/modelSla.ts
 *
 * Tipos e parâmetros do cálculo automático do SLA da O.S. (US#3.1 — 3.1-BE01).
 *
 * Os DIAS ÚTEIS BASE por criticidade NÃO ficam aqui: vêm da tabela `sla_config` (tipo + criticidade),
 * para que alterar um valor no banco mude o cálculo de novas O.S. sem alterar código.
 * Os feriados também vêm do banco (tabela `feriados`, PE-09).
 *
 * Correspondência entre o nível numérico do Documento Mestre e o enum `nivel_criticidade`
 * (valores iniciais gravados pelo seed em `sla_config`, tipo `manutencao`):
 *   1 = baixo      → 7 dias úteis
 *   2 = medio      → 5 dias úteis
 *   3 = alto       → 3 dias úteis
 *   4 = muito_alto → 2 dias úteis
 *   5 = urgente    → 1 dia útil
 */

import type { sla_config, feriados } from '../prisma/generated/client';
import { nivel_criticidade } from '../prisma/generated/client';

export type SlaConfig = sla_config;
export type Feriado = feriados;

/** Nível numérico (1 a 5) de cada criticidade, usado nas mensagens e na auditoria. */
export const NIVEL_CRITICIDADE: Record<nivel_criticidade, number> = {
    [nivel_criticidade.baixo]: 1,
    [nivel_criticidade.medio]: 2,
    [nivel_criticidade.alto]: 3,
    [nivel_criticidade.muito_alto]: 4,
    [nivel_criticidade.urgente]: 5,
};

/** Fuso usado para saber o dia e a hora de abertura (horário de Brasília). */
export const FUSO_SLA = 'America/Sao_Paulo';

/** O.S. de Manutenção/Suporte aberta a partir desta hora (no FUSO_SLA) ganha +1 dia útil de tolerância. */
export const HORA_CORTE_TOLERANCIA = 16;

/** Prazo máximo, em meses após a abertura, da data limite informada para O.S. de Instalação (PE-07). */
export const MESES_MAXIMOS_INSTALACAO = 3;

/** Resultado da definição do SLA na criação de uma O.S. */
export interface DefinicaoSla {
    data_limite_sla: Date | null;
    sla_manual: boolean;
    sla_config_id: number | null;
    prazo_dias_uteis: number | null;
    /** Texto gravado na auditoria explicando como a data foi definida (null quando não há SLA). */
    descricao: string | null;
}
