import type { OrdemServico } from "../../types/api";

export type AcaoAtivoOrdem = "inativar" | "reativar";

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

    const inativar = acao === "inativar";

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
                            {inativar
                                ? "Inativar ordem de serviço?"
                                : "Reativar ordem de serviço?"}
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
                        Confirma a {inativar ? "inativação" : "reativação"} da
                        OS <strong>#{ordem.id} — {ordem.titulo}</strong>?
                    </p>

                    <p>
                        {inativar
                            ? "A ordem será retirada da listagem ativa, mas seu registro e histórico serão preservados."
                            : "A ordem voltará a aparecer na listagem de ordens ativas."}
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
                        {processando
                            ? "Processando..."
                            : inativar
                              ? "Confirmar inativação"
                              : "Confirmar reativação"}
                    </button>
                </footer>
            </section>
        </div>
    );
}

export default OrdemServicoAtivoModal;