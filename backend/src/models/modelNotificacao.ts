export type TipoNotificacao =
    | 'status_alterado'
    | 'sla_critica'
    | 'sla_expirada'
    | 'responsavel_definido'
    | 'departamento_definido';

export interface Notificacao {
    id: string;
    os_id: number;
    funcionario_id: number;
    tipo: TipoNotificacao;
    titulo: string;
    mensagem: string;
    lida: boolean;
    data_criacao: Date;
}

export interface FiltrosNotificacao {
    pagina: number;
    limite: number;
    lida?: boolean;
}
