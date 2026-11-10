import { useEffect } from "react";
import { publishToast } from "../services/feedbackEvents";
import type { NotificacaoSla } from "../types/notificacao";

interface NotificacoesSlaProps {
    notificacoes: NotificacaoSla[];
    onDispensar: (id: string) => Promise<boolean>;
}

// Mantém uma única notificação visual por ID durante a sessão, inclusive ao navegar entre páginas.
const notificacoesApresentadas = new Set<string>();

export default function NotificacoesSla({ notificacoes, onDispensar }: NotificacoesSlaProps) {
    useEffect(() => {
        notificacoes.forEach((notificacao) => {
            if (notificacoesApresentadas.has(notificacao.id)) return;
            notificacoesApresentadas.add(notificacao.id);

            const vencida = notificacao.tipo === "vencido";
            publishToast({
                title: vencida ? "SLA vencido" : "SLA em risco",
                message: notificacao.mensagem,
                variant: vencida ? "error" : "warning",
                duration: 5000,
                // Fechar o aviso visual não marca nem remove a notificação do sininho.
                onDismiss: () => true,
            });
        });
    }, [notificacoes, onDispensar]);

    return null;
}
