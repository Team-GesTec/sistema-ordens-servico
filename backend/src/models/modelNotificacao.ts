/**
 * models/modelNotificacao.ts
 *
 * Formato das notificações de SLA (MVP da Sprint 2).
 * Guardadas em arquivo JSON, não no banco. Sem controle de lida/não lida.
 */

/** O que aconteceu com o SLA da O.S. Só esses dois estados geram notificação. */
export type TipoNotificacao = 'em_risco' | 'vencido';

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
}