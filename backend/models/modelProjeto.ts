/**
 * models/modelProjeto.ts
 *
 * Tipos do objeto Projeto (US#1.2: projeto de implantação ligado a um cliente, com os
 * departamentos envolvidos).
 *
 * ALTERAÇÃO (16/09/2026): o model deixou de ser um array em memória com campos em camelCase.
 * Agora usa os nomes do schema.prisma (`id`, `cliente_id`, `data_prazo`, `status`) e ganhou o campo
 * `departamentos` (lista de ids), gravado na tabela de ligação `projetos_departamentos`.
 * O campo `nomeProjeto` foi REMOVIDO porque a tabela `projetos` não tem coluna de nome — para
 * voltar a tê-lo, o time precisa decidir e criar uma migration adicionando a coluna.
 */
import type { projetos } from '../prisma/generated/client';
import { status_projeto } from '../prisma/generated/enums';

/** Status válidos (espelho do enum `status_projeto`). */
export const STATUS_PROJETO = Object.values(status_projeto);

/** Um dos status de projeto. */
export type StatusProjeto = status_projeto;

/** Status atribuído quando o cadastro não informa `status` (mesmo default do schema). */
export const STATUS_PADRAO: StatusProjeto = status_projeto.pendente;

/** Projeto como a API devolve e como fica no cache: dados da tabela + ids dos departamentos. */
export type Projeto = projetos & { departamentos: number[] };

/** Dados validados para criar um projeto. */
export interface DadosCriacaoProjeto {
    cliente_id: number;
    data_prazo: Date | null;
    status: StatusProjeto;
    /** Ids dos departamentos envolvidos (sem repetição, pelo menos um). */
    departamentos: number[];
}

/** Dados validados para atualizar um projeto (só os campos presentes são alterados). */
export type DadosAtualizacaoProjeto = Partial<DadosCriacaoProjeto>;
