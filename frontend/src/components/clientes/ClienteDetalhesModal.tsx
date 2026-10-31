import type { Cliente } from "../../types/api";

interface ClienteDetalhesModalProps {
    cliente: Cliente | null;
    onClose: () => void;
    onEditar: (cliente: Cliente) => void;
}

export default function ClienteDetalhesModal({ cliente, onClose, onEditar }: ClienteDetalhesModalProps) {
    if (!cliente) return null;

    return (
        <div className="projeto-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="projeto-modal cliente-details-modal" role="dialog" aria-modal="true" aria-labelledby="cliente-details-title">
                <header className="projeto-modal-header">
                    <div>
                        <p className="projeto-modal-eyebrow">CADASTRO DE CLIENTE · #{cliente.id}</p>
                        <h2 id="cliente-details-title">{cliente.nome || `Cliente #${cliente.id}`}</h2>
                        <p>{cliente.razao_social || "Razão social não informada"}</p>
                    </div>
                    <button type="button" className="projeto-modal-close" onClick={onClose} aria-label="Fechar detalhes do cliente">×</button>
                </header>
                <section className="projeto-details-section">
                    <h3>Informações do cadastro</h3>
                    <div className="projeto-details-grid">
                        <div><span>Identificador</span><strong>Cliente #{cliente.id}</strong></div>
                        <div><span>Situação</span><strong>{cliente.ativo ? "Ativo" : "Inativo"}</strong></div>
                        <div className="projeto-details-full"><span>Nome / contato</span><strong>{cliente.nome || "Não informado"}</strong></div>
                        <div className="projeto-details-full"><span>Razão social</span><strong>{cliente.razao_social || "Não informada"}</strong></div>
                        <div className="projeto-details-full"><span>Ramo de atuação</span><strong>{cliente.ramo_atuacao || "Não informado"}</strong></div>
                    </div>
                </section>
                <footer className="projeto-modal-actions">
                    <button type="button" className="projeto-btn-secondary" onClick={onClose}>Fechar</button>
                    {cliente.ativo && <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(cliente)}>Editar cadastro</button>}
                </footer>
            </section>
        </div>
    );
}
