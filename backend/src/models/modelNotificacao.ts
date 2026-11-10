/**
 * models/modelNotificacao.ts
 *
 * Formato das notificações. O arquivo continua compatível com o MVP de SLA:
 * campos novos são opcionais na leitura e recebem defaults no repositório.
 */

export type TipoNotificacao = 'em_risco' | 'vencido' | 'status_alterado' | 'responsavel_atribuido';

/** Uma notificação, do jeito que fica guardada no arquivo JSON. */
export interface Notificacao {
    /** Código aleatório que identifica a notificação. */
    id: string;
    /** A O.S. sobre a qual é o aviso. */
    os_id: number;
    /** Quem recebe o aviso. */
    funcionario_id: number;
    /** O que aconteceu. */
    tipo: TipoNotificacao;
    /** O texto que aparece na barra lateral. */
    mensagem: string;
    /** Quando o aviso foi criado, como texto (formato ISO). JSON não tem tipo de data. */
    data_criacao: string;
    /** Chave idempotente: um evento só pode criar uma notificação por destinatário. */
    evento_id?: string;
    lida?: boolean;
}
