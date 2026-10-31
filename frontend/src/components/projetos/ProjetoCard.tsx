import type { Projeto, StatusProjeto } from "../../types/api";
import { getGestecAvatarTone, getGestecInitials } from "../../utils/gestecAvatar";

const STATUS_LABELS: Record<StatusProjeto, string> = {
    em_planejamento: "Em planejamento",
    em_andamento: "Em andamento",
    pausado: "Pausado",
    concluido: "Concluído",
};

function formatarData(valor: string): string {
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? "Data não definida"
        : data.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

interface ProjetoCardProps {
    projeto: Projeto;
    podeGerenciar: boolean;
    bloqueado: boolean;
    onAbrir: (projeto: Projeto) => void;
    onEditar: (projeto: Projeto) => void;
    onAlterarAtivo: (projeto: Projeto, acao: "inativar" | "reativar") => void;
}

export default function ProjetoCard({ projeto, podeGerenciar, bloqueado, onAbrir, onEditar, onAlterarAtivo }: ProjetoCardProps) {
    const percentual = projeto.percentual_conclusao;
    const clienteNome = projeto.cliente?.nome || projeto.cliente?.razao_social || `Cliente #${projeto.cliente_id}`;
    const departamentoVinculado = projeto.departamentos_detalhes[0]?.nome ?? "Nenhum departamento vinculado";
    const departamentoIniciais = projeto.departamentos_detalhes[0]
        ? getGestecInitials(departamentoVinculado, "DP")
        : getGestecInitials(clienteNome, "CL");
    const anoInicio = projeto.data_inicio ? new Date(projeto.data_inicio).getUTCFullYear() : Number.NaN;
    const referencia = Number.isFinite(anoInicio)
        ? `PRJ-${anoInicio}-${String(projeto.id).padStart(3, "0")}`
        : `PROJETO #${projeto.id}`;

    return (
        <article className={`projeto-card gestec-project-tile${projeto.ativo ? "" : " projeto-card--inativo"}`}>
            <button
                type="button"
                className="projeto-card-main gestec-project-main"
                onClick={() => onAbrir(projeto)}
                aria-haspopup="dialog"
                aria-label={`Abrir projeto ${projeto.nome || `#${projeto.id}`} e consultar ordens vinculadas`}
                disabled={bloqueado}
            >
                <div className="gestec-project-topline">
                    <span className="gestec-project-icon" aria-hidden="true"><i className="fa-regular fa-folder-open" /></span>
                    <span className="projeto-id gestec-project-id">{referencia}</span>
                </div>

                <h2 className="projeto-card-title gestec-project-title">{projeto.nome}</h2>
                <p className="projeto-card-client gestec-project-client"><i className="fa-solid fa-building" aria-hidden="true" />{clienteNome}</p>

                <div className="gestec-project-status-line">
                    <span className={`projeto-status projeto-status--${projeto.status}`}><i aria-hidden="true" />{STATUS_LABELS[projeto.status]}</span>
                    <strong>{percentual === null ? "—" : `${percentual}%`}</strong>
                </div>
                {percentual !== null ? (
                    <div className="projeto-progress-track gestec-project-progress" role="progressbar" aria-label={`Conclusão do projeto ${projeto.nome}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, percentual))}>
                        <span style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }} />
                    </div>
                ) : (
                    <p className="gestec-project-no-progress">Ainda não há ordens elegíveis para calcular o progresso.</p>
                )}

                <div className="gestec-project-metadata">
                    <span><i className="fa-solid fa-list-check" aria-hidden="true" />{projeto.total_os_elegiveis} {projeto.total_os_elegiveis === 1 ? "ordem" : "ordens"}</span>
                    <span><i className="fa-regular fa-clock" aria-hidden="true" />{projeto.data_fim ? `Prazo: ${formatarData(projeto.data_fim)}` : "Prazo não definido"}</span>
                </div>

                <div className="gestec-project-footer">
                    <span className={`gestec-project-affiliation-avatar gestec-avatar--${getGestecAvatarTone(Math.max(0, projeto.id - 1))}`} aria-hidden="true">{departamentoIniciais}</span>
                    <span className="gestec-project-affiliation-text">
                        <small>{projeto.departamentos_detalhes.length > 0 ? "Departamento vinculado" : "Cliente"}</small>
                        <strong>{projeto.departamentos_detalhes.length > 0 ? departamentoVinculado : clienteNome}</strong>
                    </span>
                    <span className="gestec-project-open-link">Ver ordens <i className="fa-solid fa-arrow-right" aria-hidden="true" /></span>
                </div>
            </button>

            {podeGerenciar && (
                <div className="gestec-project-admin-actions" aria-label={`Ações administrativas do projeto ${projeto.nome}`}>
                    <button type="button" className="gestec-icon-action" onClick={() => onEditar(projeto)} disabled={bloqueado} aria-label={`Editar projeto ${projeto.nome}`} title="Editar projeto">
                        <i className="fa-solid fa-pen" aria-hidden="true" />
                    </button>
                    <button type="button" className="gestec-icon-action is-danger" onClick={() => onAlterarAtivo(projeto, projeto.ativo ? "inativar" : "reativar")} disabled={bloqueado} aria-label={`${projeto.ativo ? "Inativar" : "Reativar"} projeto ${projeto.nome}`} title={projeto.ativo ? "Inativar projeto" : "Reativar projeto"}>
                        <i className={`fa-solid ${projeto.ativo ? "fa-box-archive" : "fa-rotate-left"}`} aria-hidden="true" />
                    </button>
                </div>
            )}
        </article>
    );
}
