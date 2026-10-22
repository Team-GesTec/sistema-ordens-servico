import type { Cliente } from "../../types/api";
import type { AcaoStatus } from "../../utils/clienteUtils";

interface ClienteStatusModalProps {
    cliente: Cliente | null;
    acao: AcaoStatus | null;
    processando: boolean;
    erro: string | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

function ClienteStatusModal({
    cliente,
    acao,
    processando,
    erro,
    onClose,
    onConfirm,
}: ClienteStatusModalProps) {
    if (!cliente || !acao) return null;


    return (
        <div
            className="projeto-modal-overlay cliente-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !processando) onClose();
            }}
        >
            <section
                className="projeto-modal projeto-confirm-modal cliente-status-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirmacao-cliente-titulo"
                aria-busy={processando}
            >
                <header className="projeto-modal-header">
                    <div>
                        <span className="projetos-eyebrow">GESTÃO DE CLIENTES</span>
                        <h2 id="confirmacao-cliente-titulo">
                            Inativar cliente?
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="projeto-modal-close"
                        aria-label="Fechar confirmação"
                        onClick={onClose}
                        disabled={processando}
                    >
                        ×
                    </button>
                </header>

                <div className="projeto-confirm-copy cliente-confirm-copy">
                    <p>
                        Confirma a ação para o cliente <strong>{cliente.nome}</strong>?
                    </p>
                    <p>
                        O registro será inativado permanentemente. O histórico e os vínculos existentes serão preservados; o cliente não poderá ser reativado.
                    </p>
                </div>

                {erro && <div className="projetos-feedback projetos-feedback--error" role="alert">{erro}</div>}

                <footer className="projeto-modal-actions">
                    <button type="button" className="projeto-btn-secondary" onClick={onClose} disabled={processando}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        className="projeto-btn-danger"
                        onClick={() => void onConfirm()}
                        disabled={processando}
                    >
                        {processando ? "Processando..." : "Confirmar inativação"}
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default ClienteStatusModal;
