
export type TipoNotificacao = "em_risco" | "vencido" | "status_alterado" | "responsavel_atribuido";
export type TipoNotificacaoSla = TipoNotificacao;

export interface NotificacaoSla {
    id: string;
    os_id: number;
    funcionario_id: number;
    tipo: TipoNotificacaoSla;
    mensagem: string;
    data_criacao: string;
    evento_id?: string;
    lida?: boolean;
}
