import type { Projeto, StatusProjeto } from "../../types/api";

const STATUS_LABELS: Record<StatusProjeto, string> = {
    em_planejamento: "Em planejamento",
    em_andamento: "Em andamento",
    pausado: "Pausado",
    concluido: "Concluído",
};

interface ProjetoCardProps {
    projeto: Projeto;
    podeGerenciar: boolean;
    bloqueado: boolean;
    onAbrir: (projeto: Projeto) => void;
    onEditar: (projeto: Projeto) => void;
    onAlterarAtivo: (projeto: Projeto, acao: "inativar" | "reativar") => void;
}

export default function ProjetoCard({ projeto, podeGerenciar, bloqueado, onAbrir, onEditar, onAlterarAtivo }: ProjetoCardProps) {
    return (
        <article className={`projeto-card${projeto.ativo ? "" : " projeto-card--inativo"}`}>
            <button
                type="button"
                className="projeto-card-main"
                onClick={() => onAbrir(projeto)}
                aria-haspopup="dialog"
                aria-label={`Abrir detalhes do projeto ${projeto.nome || `#${projeto.id}`}`}
                disabled={bloqueado}
            >
                <div className="projeto-card-header">
                    <span className="projeto-id">Projeto #{projeto.id}</span>
                    <span className={`projeto-status projeto-status--${projeto.status}`}>{STATUS_LABELS[projeto.status]}</span>
                </div>
                <h2 className="projeto-card-title">{projeto.nome}</h2>
                <p className="projeto-card-client">Cliente: {projeto.cliente?.nome ?? `#${projeto.cliente_id}`}</p>
                <div className="projeto-progress-heading">
                    <span>Conclusão</span>
                    <strong>{projeto.percentual_conclusao === null ? "Sem ordens de serviço" : `${projeto.percentual_conclusao}%`}</strong>
                </div>
                {projeto.percentual_conclusao !== null && (
                    <div className="projeto-progress-track" role="progressbar" aria-label="Percentual de conclusão" aria-valuemin={0} aria-valuemax={100} aria-valuenow={projeto.percentual_conclusao}>
                        <span style={{ width: `${Math.min(100, Math.max(0, projeto.percentual_conclusao))}%` }} />
                    </div>
                )}
                <div className="projeto-card-metadata">
                    <span>{projeto.departamentos_detalhes.length} departamento(s)</span>
                    <span>{projeto.total_os_elegiveis} O.S. {projeto.total_os_elegiveis === 1 ? "ativa vinculada" : "ativas vinculadas"}</span>
                </div>
                {!projeto.ativo && <span className="projeto-inativo-label">Projeto inativo</span>}
            </button>

            {podeGerenciar && (
                <footer className="projeto-card-actions">
                    <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(projeto)} disabled={bloqueado}>Editar</button>
                    {projeto.ativo ? (
                        <button type="button" className="projeto-btn-danger" onClick={() => onAlterarAtivo(projeto, "inativar")} disabled={bloqueado}>Inativar</button>
                    ) : (
                        <button type="button" className="projeto-btn-primary" onClick={() => onAlterarAtivo(projeto, "reativar")} disabled={bloqueado}>Reativar</button>
                    )}
                </footer>
            )}
        </article>
    );
}