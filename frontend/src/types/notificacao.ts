export type TipoNotificacao =
    | "status_alterado"
    | "sla_critica"
    | "sla_expirada"
    | "responsavel_definido"
    | "departamento_definido";

export interface Notificacao {
    id: string;
    os_id: number;
    funcionario_id: number;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
    lida: boolean;
    data_criacao: string;
    ordens_servico?: { id: number; titulo: string; status: string };
}

export interface ResultadoNotificacoes {
    dados: Notificacao[];
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
}
