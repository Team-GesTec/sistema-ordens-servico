
import type { NotificacaoSla } from "../types/notificacao";

/** US#3.2: Exibe notificações persistentes de SLA com fechamento manual. */
interface NotificacoesSlaProps {
    notificacoes: NotificacaoSla[];
    onDispensar: (id: number) => void;
}

/** US#3.2: Apresenta os avisos de SLA recebidos do backend. */
export default function NotificacoesSla({
    notificacoes,
    onDispensar,
}: NotificacoesSlaProps) {
    return (
        <div className="toast-container" aria-live="polite">
            {notificacoes
                .filter((notificacao) => !notificacao.dispensada)
                .map((notificacao) => (
                    <article
                        key={notificacao.id}
                        className={`sla-toast sla-toast-${notificacao.tipo}`}
                        role="status"
                    >
                        <span
                            className="toast-simbolo"
                            aria-hidden="true"
                        >
                            {notificacao.tipo === "risco"
                                ? "⚠"
                                : notificacao.tipo === "vencido"
                                  ? "!"
                                  : "⊘"}
                        </span>

                        <span className="toast-divisor" />

                        <div className="toast-conteudo">
                            <strong>{notificacao.titulo}</strong>
                            <p>{notificacao.mensagem}</p>
                        </div>

                        <button
                            type="button"
                            className="toast-fechar"
                            aria-label={`Fechar notificação da OS ${notificacao.ordem_servico_id}`}
                            onClick={() => onDispensar(notificacao.id)}
                        >
                            ×
                        </button>
                    </article>
                ))}
        </div>
    );
}
