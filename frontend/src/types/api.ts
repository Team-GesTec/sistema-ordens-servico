/**
 * Tipos das entidades e dos payloads trocados com a API (formato snake_case do backend).
 * AJ-06: OrdemServicoInput aceita os campos opcionais do cadastro de O.S. antiga.
 */

export type PerfilFuncionario = "gestor" | "analista" | "tecnico";

export type StatusProjeto =
    | "pendente"
    | "em_andamento"
    | "aguardando_embarque"
    | "validacao_testes"
    | "bloqueado"
    | "review"
    | "concluido";

export type TipoOrdemServico = "instalacao" | "manutencao";

export type NivelCriticidade = "baixo" | "medio" | "alto" | "muito_alto" | "urgente";

export type StatusOrdemServico =
    | "em_andamento"
    | "aguardando"
    | "validacao_testes"
    | "bloqueado"
    | "concluido";

export interface Funcionario {
    id: number;
    departamento_id: number;
    usuario: string;
    nome: string;
    tipo: PerfilFuncionario;
}

export interface LoginResponse {
    token: string;
    tipo_token: "Bearer";
    expira_em: string;
    funcionario: Funcionario;
}

export interface Cliente {
    id: number;
    nome: string;
    razao_social: string;
    ramo_atuacao: string;
    ativo: boolean;
}

export interface LocalOperacionalInput {
    descricao: string;
    tipo: "offshore" | "terrestre" | "site";
}

export interface ClienteInput {
    nome: string;
    razao_social: string;
    ramo_atuacao: string;
    locais_operacionais: LocalOperacionalInput[];
}

export interface Departamento {
    id: number;
    nome: string;
    responsavel_id: number | null;
}

export interface DepartamentoInput {
    nome: string;
    responsavel_id: number | null;
}

export interface FuncionarioInput {
    departamento_id: number;
    usuario: string;
    senha: string;
    nome: string;
    tipo: PerfilFuncionario;
}

export interface Projeto {
    id: number;
    cliente_id: number;
    data_prazo: string | null;
    status: StatusProjeto;
    departamentos: number[];
}

export interface ProjetoInput {
    cliente_id: number;
    data_prazo: string | null;
    status: StatusProjeto;
    departamentos: number[];
}

export interface OrdemServico {
    id: number;
    departamento_id: number;
    cliente_id: number | null;
    solicitante_id: number;
    responsavel_id: number | null;
    projeto_id: number | null;
    anterior_id: number | null;
    parecer_tecnico: string | null;
    tipo: TipoOrdemServico;
    titulo: string;
    criticidade: NivelCriticidade | null;
    prazo_horas: number;
    descricao: string;
    status: StatusOrdemServico;
    ativo: boolean;
    data_criacao: string;
}

export interface OrdemServicoInput {
    titulo: string;
    tipo: TipoOrdemServico;
    descricao: string;
    cliente_id: number;
    departamento_id: number;
    projeto_id: number | null;
    anterior_id: number | null;
    criticidade: string | null;
    responsavel_id?: number;
    /** AJ-06 — cadastro de O.S. antiga (somente gestor): data de abertura no passado, em ISO. */
    data_criacao?: string;
    /** AJ-06 — status atual da O.S. antiga. */
    status?: StatusOrdemServico;
    /** AJ-06 — obrigatório quando a O.S. antiga já está concluída. */
    parecer_tecnico?: string;
    /** AJ-06 — data de conclusão (ISO), obrigatória quando a O.S. antiga já está concluída. */
    data_fim?: string;
}
