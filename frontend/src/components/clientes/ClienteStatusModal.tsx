
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
    if (!cliente || !acao) {
        return null;
    }

    const inativar = acao === "inativar";

    return (
        <div
            className="cliente-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className="cliente-modal cliente-confirmacao"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirmacao-cliente-titulo"
            >
                <header className="cliente-modal-header">
                    <h2 id="confirmacao-cliente-titulo">
                        {inativar ? "Inativar cliente?" : "Reativar cliente?"}
                    </h2>

                    <button
                        type="button"
                        className="cliente-modal-close"
                        aria-label="Fechar confirmação"
                        onClick={onClose}
                        disabled={processando}
                    >
                        ×
                    </button>
                </header>

                <div className="cliente-confirmacao-conteudo">
                    <p>
                        Confirma a ação para o cliente{" "}
                        <strong>{cliente.nome}</strong>?
                    </p>

                    <p>
                        {inativar
                            ? "O registro e seu histórico serão preservados. Projetos ou ordens de serviço não concluídos impedem a inativação."
                            : "O cliente voltará a aparecer na listagem de ativos."}
                    </p>

                    {erro && (
                        <div
                            className="clientes-feedback clientes-feedback--error"
                            role="alert"
                        >
                            {erro}
                        </div>
                    )}

                    <div className="cliente-modal-actions">
                        <button
                            type="button"
                            className="clientes-btn-secondary"
                            onClick={onClose}
                            disabled={processando}
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            className={
                                inativar
                                    ? "clientes-btn-danger"
                                    : "clientes-btn-primary"
                            }
                            onClick={() => void onConfirm()}
                            disabled={processando}
                        >
                            {processando
                                ? "Processando..."
                                : inativar
                                  ? "Confirmar inativação"
                                  : "Confirmar reativação"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default ClienteStatusModal;
