import type { Cliente, Departamento, OrdemServico } from "../../types/api";
import { Link } from "react-router-dom";
import {
    CRITICIDADE_LABELS,
    STATUS_LABELS,
    TIPO_LABELS,
} from "../../utils/ordemServicoUtils";

interface OrdemServicoCardProps {
    ordem: OrdemServico;
    clientes: Cliente[];
    departamentos: Departamento[];
    podeEditar: boolean;
    bloqueado: boolean;
    onAbrir: (ordem: OrdemServico) => void;
    onEditar: (ordem: OrdemServico) => void;
    onAlterarAtivo: (ordem: OrdemServico, acao: "inativar" | "reativar") => void;
}

function OrdemServicoCard({
    ordem,
    clientes,
    departamentos,
    podeEditar,
    bloqueado,
    onAbrir,
    onEditar,
    onAlterarAtivo,
}: OrdemServicoCardProps) {
    const podeEditarEstaOrdem =
        podeEditar && ordem.status !== "concluido" && ordem.status !== "bloqueado";
    const criticidade = ordem.criticidade ?? "indefinida";
    const criticidadeLabel = ordem.criticidade
        ? CRITICIDADE_LABELS[ordem.criticidade]
        : "Sem criticidade";
    const cliente = clientes.find((item) => item.id === ordem.cliente_id);
    const departamento = departamentos.find((item) => item.id === ordem.departamento_id);

    return (
        <article className={`projeto-card ordem-card ordem-card--${criticidade}`}>
            <button
                type="button"
                className="ordem-card-main"
                onClick={() => onAbrir(ordem)}
                aria-haspopup="dialog"
                aria-label={`Abrir detalhes da O.S. #${ordem.id}: ${ordem.titulo}`}
                disabled={bloqueado}
            >
                <div className="ordem-card-header">
                    <span className="ordem-card-id">OS #{ordem.id}</span>
                    <span className="ordem-card-header-side">
                        <span className={`ordem-status-badge ordem-status-badge--${ordem.status}`}>
                            {STATUS_LABELS[ordem.status]}
                        </span>
                        <span
                            className={`ordem-card-priority-dot ordem-card-priority-dot--${criticidade}`}
                            role="img"
                            aria-label={`Prioridade: ${criticidadeLabel}`}
                            title={`Prioridade: ${criticidadeLabel}`}
                        />
                    </span>
                </div>

                <h2 className="ordem-card-title">{ordem.titulo}</h2>
                <p className="ordem-card-description">{ordem.descricao}</p>
                <div className="ordem-card-metadata">
                    <span>{TIPO_LABELS[ordem.tipo]}</span>
                    <span>{criticidadeLabel}</span>
                </div>
            </button>

            <div className="ordem-card-footer">
                <span>
                    Cliente:{" "}
                    {cliente ? (
                        <Link to={`/clientes?visualizar=${cliente.id}`} className="ordem-relacionamento-link">
                            {cliente.nome}
                        </Link>
                    ) : ordem.cliente_id ? (
                        `#${ordem.cliente_id}`
                    ) : (
                        "Não associado"
                    )}
                </span>
                <span>
                    Departamento:{" "}
                    {departamento ? (
                        <Link to={`/departamentos?visualizar=${departamento.id}`} className="ordem-relacionamento-link">
                            {departamento.nome}
                        </Link>
                    ) : (
                        `#${ordem.departamento_id}`
                    )}
                </span>
            </div>

            {podeEditar && (
                <div className="ordem-card-actions">
                    {podeEditarEstaOrdem && (
                        <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(ordem)} disabled={bloqueado}>
                            Editar
                        </button>
                    )}
                    {ordem.ativo ? (
                        <button type="button" className="projeto-btn-secondary" onClick={() => onAlterarAtivo(ordem, "inativar")} disabled={bloqueado}>
                            Inativar
                        </button>
                    ) : (
                        <button type="button" className="projeto-btn-primary" onClick={() => onAlterarAtivo(ordem, "reativar")} disabled={bloqueado}>
                            Reativar
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}

export default OrdemServicoCard;
