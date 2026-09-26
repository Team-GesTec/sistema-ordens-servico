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

export type StatusOrdemServico = StatusProjeto;

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
    categoria: string;
    razao_social: string | null;
    ramo_atuacao: string | null;
}

export interface LocalOperacionalInput {
    descricao: string;
    tipo: "offshore" | "terrestre" | "site";
}

export interface ClienteInput {
    nome: string;
    categoria: string;
    razao_social: string | null;
    ramo_atuacao: string | null;
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
    cliente_id: number;
    solicitante_id: number;
    responsavel_id: number | null;
    projeto_id: number | null;
    anterior_id: number | null;
    parecer_tecnico: string | null;
    tipo: TipoOrdemServico;
    criticidade: NivelCriticidade | null;
    prazo_horas: number;
    descricao: string;
    status: StatusOrdemServico;
    data_criacao: string;
}

export interface OrdemServicoInput {
    tipo: TipoOrdemServico;
    descricao: string;
    cliente_id: number;
    departamento_id: number;
    projeto_id: number | null;
    anterior_id: number | null;
    criticidade: string | null;
}
