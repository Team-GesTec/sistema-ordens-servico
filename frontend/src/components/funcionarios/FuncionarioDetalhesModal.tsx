import type { Departamento, Funcionario } from "../../types/api";

interface FuncionarioDetalhesModalProps {
    funcionario: Funcionario | null;
    departamento?: Departamento;
    aberto: boolean;
    carregando: boolean;
    erro: string | null;
    podeGerenciar: boolean;
    onClose: () => void;
    onEditar: (funcionario: Funcionario) => void;
    onAlterarStatus: (funcionario: Funcionario, acao: "inativar") => void;
}

const PERFIL_LABELS = { gestor: "Gestor", analista: "Analista", tecnico: "Técnico" } as const;

export default function FuncionarioDetalhesModal({
    funcionario,
    departamento,
    aberto,
    carregando,
    erro,
    podeGerenciar,
    onClose,
    onEditar,
    onAlterarStatus,
}: FuncionarioDetalhesModalProps) {
    if (!aberto) return null;

    return (
        <div className="projeto-modal-overlay funcionario-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
            <section className="projeto-modal funcionario-detail-modal" role="dialog" aria-modal="true" aria-labelledby="funcionario-detail-title">
                <header className="projeto-modal-header">
                    <div>
                        <span className="projetos-eyebrow">CADASTRO DE COLABORADOR</span>
                        <h2 id="funcionario-detail-title">{funcionario?.nome ?? "Detalhes do funcionário"}</h2>
                        {funcionario && <p>Funcionário #{funcionario.id}</p>}
                    </div>
                    <button type="button" className="projeto-modal-close" onClick={onClose} aria-label="Fechar detalles">×</button>
                </header>
                <div className="funcionario-detail-body">
                    {carregando && <p className="projetos-loading" role="status">Carregando dados atualizados...</p>}
                    {erro && <div className="projetos-feedback projetos-feedback--error" role="alert">{erro}</div>}
                    {funcionario && !carregando && (
                        <>
                            <div className="funcionario-detail-identity">
                                <span className="funcionario-avatar funcionario-avatar--large" aria-hidden="true">{funcionario.nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("pt-BR") || "F"}</span>
                                <div>
                                    <strong>{funcionario.nome}</strong>
                                    <span>{funcionario.usuario}</span>
                                </div>
                                <span className={`projeto-status${funcionario.ativo ? "" : " funcionario-status--inativo"}`}>{funcionario.ativo ? "Ativo" : "Inativo"}</span>
                            </div>
                            <dl className="funcionario-detail-grid">
                                <div><dt>ID</dt><dd>#{funcionario.id}</dd></div>
                                <div><dt>Usuário</dt><dd>{funcionario.usuario}</dd></div>
                                <div><dt>Departamento</dt><dd>{departamento?.nome ?? `Departamento #${funcionario.departamento_id}`}</dd></div>
                                <div><dt>Perfil</dt><dd>{PERFIL_LABELS[funcionario.tipo]}</dd></div>
                                <div><dt>Situação</dt><dd>{funcionario.ativo ? "Ativo" : "Inativo"}</dd></div>
                            </dl>
                            <p className="funcionario-security-note">Senhas e hashes nunca são disponibilizados para consulta.</p>
                        </>
                    )}
                </div>
                <footer className="projeto-modal-actions">
                    <button type="button" className="projeto-btn-secondary" onClick={onClose}>Fechar</button>
                    {funcionario && podeGerenciar && funcionario.ativo && <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(funcionario)}>Editar</button>}
                    {funcionario && podeGerenciar && funcionario.ativo && <button type="button" className="projeto-btn-danger" onClick={() => onAlterarStatus(funcionario, "inativar")}>Inativar</button>}
                </footer>
            </section>
        </div>
    );
}
