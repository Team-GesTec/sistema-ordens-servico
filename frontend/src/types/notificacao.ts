/** Representa uma notificação de SLA recebida do backend. */
export type TipoNotificacaoSla = "risco" | "vencido" | "bloqueado";

/** US#3.2: Define os dados necessários para exibir e dispensar uma notificação. */
export interface NotificacaoSla {
    id: number;
    ordem_servico_id: number;
    tipo: TipoNotificacaoSla;
    titulo: string;
    mensagem: string;
    dispensada: boolean;
}