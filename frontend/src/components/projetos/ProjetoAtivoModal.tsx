import type { Projeto } from "../../types/api";

interface ProjetoAtivoModalProps {
    projeto: Projeto | null;
    acao: "inativar" | null;
    processando: boolean;
    erro: string | null;
    onClose: () => void;
    onConfirmar: () => void;
}

export default function ProjetoAtivoModal({ projeto, acao, processando, erro, onClose, onConfirmar }: ProjetoAtivoModalProps) {
    if (!projeto || !acao) return null;
    return (
        <div className="projeto-modal-overlay" role="presentation">
            <section className="projeto-modal projeto-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="projeto-confirm-title">
                <header className="projeto-modal-header">
                    <div>
                        <h2 id="projeto-confirm-title">Inativar projeto?</h2>
                        <p>Projeto #{projeto.id} — {projeto.nome}</p>
                    </div>
                    <button type="button" className="projeto-modal-close" onClick={onClose} disabled={processando} aria-label="Fechar">×</button>
                </header>
                <p className="projeto-confirm-copy">O projeto será inativado permanentemente. O registro e as ordens de serviço vinculadas serão preservados; a inativação não poderá ser desfeita.</p>
                {erro && <div className="projetos-feedback projetos-feedback--error" role="alert">{erro}</div>}
                <footer className="projeto-modal-actions">
                    <button type="button" className="projeto-btn-secondary" onClick={onClose} disabled={processando}>Cancelar</button>
                    <button type="button" className="projeto-btn-danger" onClick={onConfirmar} disabled={processando}>{processando ? "Processando…" : "Confirmar inativação"}</button>
                </footer>
            </section>
        </div>
    );
}
