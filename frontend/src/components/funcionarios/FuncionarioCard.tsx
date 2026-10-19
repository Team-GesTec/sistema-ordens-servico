import type { Funcionario } from "../../types/api";
import type { Departamento } from "../../types/api";

interface FuncionarioCardProps {
    funcionario: Funcionario;
    departamento?: Departamento;
    podeGerenciar: boolean;
    bloqueado: boolean;
    onAbrir: (funcionario: Funcionario) => void;
    onEditar: (funcionario: Funcionario) => void;
    onAlterarStatus: (funcionario: Funcionario, acao: "inativar" | "reativar") => void;
}

function iniciais(nome: string): string {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return "F";
    return `${partes[0][0]}${partes.length > 1 ? partes[partes.length - 1][0] : ""}`.toLocaleUpperCase("pt-BR");
}

const PERFIL_LABELS = { gestor: "Gestor", analista: "Analista", tecnico: "Técnico" } as const;

export default function FuncionarioCard({
    funcionario,
    departamento,
    podeGerenciar,
    bloqueado,
    onAbrir,
    onEditar,
    onAlterarStatus,
}: FuncionarioCardProps) {
    return (
        <article className={`projeto-card funcionario-card${funcionario.ativo ? "" : " projeto-card--inativo funcionario-card--inativo"}`}>
            <button type="button" className="funcionario-card-main" onClick={() => onAbrir(funcionario)} aria-label={`Ver detalhes de ${funcionario.nome}`}>
                <header className="projeto-card-header funcionario-card-header">
                    <span className="funcionario-avatar" aria-hidden="true">{iniciais(funcionario.nome)}</span>
                    <div className="funcionario-identificacao">
                        <span className="cliente-id">FUNCIONÁRIO #{funcionario.id}</span>
                        <h2 className="projeto-card-title">{funcionario.nome || `Funcionário #${funcionario.id}`}</h2>
                        <span className="funcionario-usuario">{funcionario.usuario}</span>
                    </div>
                    <span className={`projeto-status${funcionario.ativo ? "" : " funcionario-status--inativo"}`}>{funcionario.ativo ? "Ativo" : "Inativo"}</span>
                </header>
                <div className="projeto-card-metadata funcionario-card-metadata">
                    <span>{departamento?.nome ?? `Departamento #${funcionario.departamento_id}`}</span>
                    <span className={`funcionario-perfil funcionario-perfil--${funcionario.tipo}`}>{PERFIL_LABELS[funcionario.tipo]}</span>
                </div>
            </button>
            {podeGerenciar && (
                <div className="projeto-card-actions funcionario-card-actions">
                    {funcionario.ativo ? (
                        <>
                            <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(funcionario)} disabled={bloqueado}>Editar</button>
                            <button type="button" className="projeto-btn-danger" onClick={() => onAlterarStatus(funcionario, "inativar")} disabled={bloqueado}>Inativar</button>
                        </>
                    ) : (
                        <>
                            <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(funcionario)} disabled={bloqueado}>Editar</button>
                            <button type="button" className="projeto-btn-primary" onClick={() => onAlterarStatus(funcionario, "reativar")} disabled={bloqueado}>Reativar</button>
                        </>
                    )}
                </div>
            )}
        </article>
    );
}
