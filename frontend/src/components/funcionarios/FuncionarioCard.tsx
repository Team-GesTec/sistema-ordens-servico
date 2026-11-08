import type { Funcionario } from "../../types/api";
import type { Departamento } from "../../types/api";
import { getGestecAvatarTone, getGestecInitials } from "../../utils/gestecAvatar";

interface FuncionarioCardProps {
    funcionario: Funcionario;
    departamento?: Departamento;
    podeGerenciar: boolean;
    bloqueado: boolean;
    onAbrir: (funcionario: Funcionario) => void;
    onEditar: (funcionario: Funcionario) => void;
    onAlterarStatus: (funcionario: Funcionario, acao: "inativar") => void;
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
            <div
                className="funcionario-card-main"
                role="button"
                tabIndex={bloqueado ? -1 : 0}
                aria-label={`Abrir detalhes de ${funcionario.nome}`}
                aria-disabled={bloqueado}
                onClick={() => { if (!bloqueado) onAbrir(funcionario); }}
                onKeyDown={(event) => {
                    if (!bloqueado && (event.key === "Enter" || event.key === " ")) {
                        event.preventDefault();
                        onAbrir(funcionario);
                    }
                }}
            >
                <header className="projeto-card-header funcionario-card-header">
                    <span className={`funcionario-avatar gestec-avatar--${getGestecAvatarTone(Math.max(0, funcionario.id - 1))}`} aria-hidden="true">{getGestecInitials(funcionario.nome, "FU")}</span>
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
            </div>
            {podeGerenciar && (
                <div className="projeto-card-actions funcionario-card-actions">
                    {funcionario.ativo && <>
                        <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(funcionario)} disabled={bloqueado}>Editar</button>
                        <button type="button" className="projeto-btn-danger" onClick={() => onAlterarStatus(funcionario, "inativar")} disabled={bloqueado}>Inativar</button>
                    </>}
                </div>
            )}
        </article>
    );
}
