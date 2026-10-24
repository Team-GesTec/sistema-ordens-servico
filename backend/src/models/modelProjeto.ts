/** Tipos de domínio e contratos da API para projetos (AJ-02). */
import type { projetos } from '../prisma/generated/client';
import { status_projeto as enumStatusProjeto } from '../prisma/generated/enums';
import type { status_projeto } from '../prisma/generated/enums';

export const STATUS_PROJETO = Object.values(enumStatusProjeto);
export type StatusProjeto = status_projeto;
export const STATUS_PADRAO: StatusProjeto = enumStatusProjeto.em_planejamento;

export interface OrdemServicoProjeto {
    id: number;
    titulo: string;
    status: string;
    ativo: boolean;
    data_criacao: Date;
    data_fim: Date | null;
    data_limite_sla: Date | null;
}

export interface RelacionamentoProjeto {
    id: number;
    nome: string;
    razao_social: string;
}

export interface DepartamentoProjeto {
    id: number;
    nome: string;
}

/** Contrato enxuto de listagem e de respostas das mutações; não inclui linhas de O.S. */
export type Projeto = projetos & {
    departamentos: number[];
    departamentos_detalhes: DepartamentoProjeto[];
    cliente: RelacionamentoProjeto;
    total_os_elegiveis: number;
    os_concluidas: number;
    percentual_conclusao: number | null;
};

/** Contrato de detalhes; contém O.S. conforme as permissões do perfil autenticado. */
export type ProjetoDetalhe = Projeto & {
    ordens_servico: OrdemServicoProjeto[];
};

export interface DadosCriacaoProjeto {
    nome: string;
    cliente_id: number;
    data_inicio: Date | null;
    data_fim: Date | null;
    status: StatusProjeto;
    departamentos: number[];
}

/** Dados válidos para atualização parcial. O campo `ativo` usa uma rota própria. */
export type DadosAtualizacaoProjeto = Partial<DadosCriacaoProjeto>;
