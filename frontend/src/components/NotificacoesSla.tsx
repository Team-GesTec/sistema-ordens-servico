
import type { NotificacaoSla } from "../types/notificacao";

interface NotificacoesSlaProps {
    notificacoes: NotificacaoSla[];
    onDispensar: (id: string) => void;
}

export default function NotificacoesSla({
    notificacoes,
    onDispensar,
}: NotificacoesSlaProps) {
    return (
        <div className="toast-container" aria-live="polite">
            {notificacoes.map((notificacao) => (
                <article
                    key={notificacao.id}
                    className={`sla-toast sla-toast-${notificacao.tipo}`}
                    role="status"
                >

                    <span className="toast-simbolo" aria-hidden="true">
                        {notificacao.tipo === "em_risco" ? (
                            <svg viewBox="0 0 48 48" className="toast-icone">
                                <path d="M21 5 Q24 1 27 5 L45 39 Q47 43 42 43 H6 Q1 43 3 39 Z"
                                    fill="#ffd000" stroke="#000" strokeWidth="2.5"
                                    strokeLinejoin="round" />
                                <path d="M24 15 V28" stroke="#000" strokeWidth="3.5"
                                    strokeLinecap="round" />
                                <circle cx="24" cy="35" r="2" fill="#000" />
                            </svg>
                        ) : notificacao.tipo === "vencido" ? (
                            <svg viewBox="0 0 48 48" className="toast-icone">
                                <path d="M21 5 Q24 1 27 5 L45 39 Q47 43 42 43 H6 Q1 43 3 39 Z"
                                    fill="#f12727" stroke="#000" strokeWidth="2.5"
                                    strokeLinejoin="round" />
                                <path d="M24 15 V28" stroke="#000" strokeWidth="3.5"
                                    strokeLinecap="round" />
                                <circle cx="24" cy="35" r="2" fill="#000" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 48 48" className="toast-icone">
                                <circle cx="24" cy="24" r="21" fill="#f12727"
                                    stroke="#000" strokeWidth="2.5" />
                                <circle cx="24" cy="24" r="15" fill="none"
                                    stroke="#000" strokeWidth="2.5" />
                                <path d="M14 14 L34 34" stroke="#000" strokeWidth="4"
                                    strokeLinecap="round" />
                            </svg>
                        )}
                    </span>


                    <span className="toast-divisor" />

                    <div className="toast-conteudo">
                        <strong>
                            {notificacao.tipo === "em_risco"
                                ? "SLA em risco"
                                : "SLA vencido"}
                        </strong>
                        <p>{notificacao.mensagem}</p>
                    </div>

                    <button
                        type="button"
                        className="toast-fechar"
                        aria-label={`Fechar notificação da OS ${notificacao.os_id}`}
                        onClick={() => onDispensar(notificacao.id)}
                    >
                        ×
                    </button>
                </article>
            ))}
        </div>
    );
}
