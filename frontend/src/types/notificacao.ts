/**
 * US#3.2: Define os tipos e os dados das notificações de SLA
 * recebidas do backend.
 */

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