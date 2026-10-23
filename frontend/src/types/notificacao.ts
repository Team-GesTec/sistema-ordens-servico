
export type TipoNotificacaoSla = "em_risco" | "vencido";

export interface NotificacaoSla {
    id: string;
    os_id: number;
    funcionario_id: number;
    tipo: TipoNotificacaoSla;
    mensagem: string;
    data_criacao: string;
}
