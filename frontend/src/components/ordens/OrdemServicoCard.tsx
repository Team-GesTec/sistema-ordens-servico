
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
    onAlterarAtivo: (
    ordem: OrdemServico,
    acao: "inativar" | "reativar",
) => void;
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
        podeEditar &&
        ordem.status !== "concluido" &&
        ordem.status !== "bloqueado";

    const criticidade = ordem.criticidade ?? "indefinida";

    const cliente = clientes.find(
        (item) => item.id === ordem.cliente_id,
    );

    const departamento = departamentos.find(
        (item) => item.id === ordem.departamento_id,
    );

    return (
        <article className={`ordem-card ordem-card--${criticidade}`}>
            <button
                type="button"
                className="ordem-card-main"
                onClick={() => onAbrir(ordem)}
                aria-haspopup="dialog"
                disabled={bloqueado}
            >
                <div className="ordem-card-header">
                    <span className="ordem-card-id">OS #{ordem.id}</span>

                    <span
                        className={`ordem-status-badge ordem-status-badge--${ordem.status}`}
                    >
                        {STATUS_LABELS[ordem.status]}
                    </span>
                </div>

                <h2 className="ordem-card-title">{ordem.titulo}</h2>

                <p className="ordem-card-description">{ordem.descricao}</p>

                                <div className="ordem-card-metadata">
                    <span>{TIPO_LABELS[ordem.tipo]}</span>
                    <span>
                        {ordem.criticidade
                            ? CRITICIDADE_LABELS[ordem.criticidade]
                            : "Sem criticidade"}
                    </span>
                </div>
            </button>

            <div className="ordem-card-footer">
                <span>
                    Cliente:{" "}
                    {cliente ? (
                        <Link
                            to={`/clientes?visualizar=${cliente.id}`}
                            className="ordem-relacionamento-link"
                        >
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
                        <Link
                            to={`/departamentos?visualizar=${departamento.id}`}
                            className="ordem-relacionamento-link"
                        >
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
                        <button
                            type="button"
                            className="ordens-btn-secondary"
                            onClick={() => onEditar(ordem)}
                            disabled={bloqueado}
                        >
                            Editar
                        </button>
                    )}

                    {ordem.ativo ? (
                        <button
                            type="button"
                            className="ordens-btn-secondary"
                            onClick={() => onAlterarAtivo(ordem, "inativar")}
                            disabled={bloqueado}
                        >
                            Inativar
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="ordens-btn-primary"
                            onClick={() => onAlterarAtivo(ordem, "reativar")}
                            disabled={bloqueado}
                        >
                            Reativar
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}

export default OrdemServicoCard;