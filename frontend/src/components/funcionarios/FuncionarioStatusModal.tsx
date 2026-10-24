import type { Funcionario } from "../../types/api";

interface FuncionarioStatusModalProps {
    funcionario: Funcionario | null;
    acao: "inativar" | "reativar" | null;
    processando: boolean;
    erro: string | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export default function FuncionarioStatusModal({ funcionario, acao, processando, erro, onClose, onConfirm }: FuncionarioStatusModalProps) {
    if (!funcionario || !acao) return null;

    return (
        <div className="projeto-modal-overlay funcionario-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !processando) onClose(); }}>
            <section className="projeto-modal funcionario-status-modal" role="alertdialog" aria-modal="true" aria-labelledby="funcionario-status-title">
                <header className="projeto-modal-header">
                    <div>
                        <span className="projetos-eyebrow">GESTÃO DE ACESSOS</span>
                        <h2 id="funcionario-status-title">Inativar funcionário?</h2>
                    </div>
                    <button type="button" className="projeto-modal-close" onClick={onClose} disabled={processando} aria-label="Fechar confirmação">×</button>
                </header>
                <div className="funcionario-detail-body">
                    <p>Confirma a ação para <strong>{funcionario.nome}</strong> (usuário <strong>{funcionario.usuario}</strong>)?</p>
                    <p>O funcionário perderá acesso ao sistema nas próximas requisições. Ordens de serviço, atribuições, auditoria e histórico serão preservados. A inativação es permanente e não poderá ser desfeita.</p>
                    {erro && <div className="projetos-feedback projetos-feedback--error" role="alert">{erro}</div>}
                </div>
                <footer className="projeto-modal-actions">
                    <button type="button" className="projeto-btn-secondary" onClick={onClose} disabled={processando}>Cancelar</button>
                    <button type="button" className="projeto-btn-danger" onClick={() => void onConfirm()} disabled={processando}>
                        {processando ? "Processando..." : "Confirmar inativação"}
                    </button>
                </footer>
            </section>
        </div>
    );
}