import type { OrdemServico } from "../../types/api";

export type AcaoAtivoOrdem = "inativar";

interface OrdemServicoAtivoModalProps {
    ordem: OrdemServico | null;
    acao: AcaoAtivoOrdem | null;
    processando: boolean;
    erro: string | null;
    onFechar: () => void;
    onConfirmar: () => Promise<void>;
}

function OrdemServicoAtivoModal({
    ordem,
    acao,
    processando,
    erro,
    onFechar,
    onConfirmar,
}: OrdemServicoAtivoModalProps) {
    if (!ordem || !acao) {
        return null;
    }


    return (
        <div
            className="ordem-modal-overlay"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !processando
                ) {
                    onFechar();
                }
            }}
        >
            <section
                className="ordem-modal"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="ordem-ativo-titulo"
            >
                <header className="ordem-modal-header">
                    <div>
                        <span className="ordem-card-id">
                            OS #{ordem.id}
                        </span>

                        <h2 id="ordem-ativo-titulo">
                            Inativar ordem de serviço?
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="ordem-modal-close"
                        onClick={onFechar}
                        disabled={processando}
                        aria-label="Fechar confirmação"
                    >
                        ×
                    </button>
                </header>

                <div className="ordem-modal-body">
                    <p>
                        Confirma a inativação da OS <strong>#{ordem.id} — {ordem.titulo}</strong>?
                    </p>

                    <p>
                        A ordem será inativada permanentemente e retirada da listagem ativa. O registro e o histórico serão preservados; a inativação não poderá ser desfeita.
                    </p>

                    {erro && (
                        <p
                            className="ordens-feedback ordens-feedback--error"
                            role="alert"
                        >
                            {erro}
                        </p>
                    )}
                </div>

                <footer className="ordem-modal-actions">
                    <button
                        type="button"
                        className="ordens-btn-secondary"
                        onClick={onFechar}
                        disabled={processando}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className="ordens-btn-primary"
                        onClick={() => void onConfirmar()}
                        disabled={processando}
                    >
                        {processando ? "Processando..." : "Confirmar inativação"}
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default OrdemServicoAtivoModal;