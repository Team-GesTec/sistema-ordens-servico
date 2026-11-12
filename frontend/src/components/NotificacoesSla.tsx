import { useEffect } from "react";
import { publishToast } from "../services/feedbackEvents";
import type { Notificacao } from "../types/notificacao";

interface NotificacoesSlaProps {
    notificacoes: Notificacao[];
    onDispensar: (id: string) => Promise<boolean>;
}

// Mantém uma única notificação visual por ID durante a sessão, inclusive ao navegar entre páginas.
const notificacoesApresentadas = new Set<string>();

export default function NotificacoesSla({ notificacoes, onDispensar }: NotificacoesSlaProps) {
    useEffect(() => {
        notificacoes.forEach((notificacao) => {
            if (notificacoesApresentadas.has(notificacao.id)) return;
            notificacoesApresentadas.add(notificacao.id);

            const vencida = notificacao.tipo === "sla_expirada";
            publishToast({
                title: vencida ? "SLA vencido" : "SLA em risco",
                message: notificacao.mensagem,
                variant: vencida ? "error" : "warning",
                persistent: true,
                onDismiss: () => onDispensar(notificacao.id),
            });
        });
    }, [notificacoes, onDispensar]);

    return null;
}
