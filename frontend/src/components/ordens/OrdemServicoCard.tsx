import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type {
    Cliente,
    Departamento,
    Funcionario,
    OrdemServico,
    StatusOrdemServico,
} from "../../types/api";
import type { AcaoAtivoOrdem } from "./OrdemServicoAtivoModal";
import {
    CRITICIDADE_LABELS,
    STATUS_LABELS,
    TIPO_LABELS,
    formatarDataOrdem,
    ordemEstaAtrasada,
} from "../../utils/ordemServicoUtils";

interface OrdemServicoCardProps {
    ordem: OrdemServico;
    clientes: Cliente[];
    departamentos: Departamento[];
    podeEditar: boolean;
    bloqueado: boolean;
    funcionarios?: Funcionario[];
    modoKanban?: boolean;
    opcoesStatusMovimentacao?: StatusOrdemServico[];
    onMoverStatus?: (
        ordem: OrdemServico,
        status: StatusOrdemServico,
    ) => void | Promise<void>;
    onInicioArrasto?: (ordem: OrdemServico) => void;
    onFimArrasto?: () => void;
    onAbrir: (ordem: OrdemServico) => void;
    onEditar: (ordem: OrdemServico) => void;
    onAlterarAtivo: (ordem: OrdemServico, acao: AcaoAtivoOrdem) => void;
}

function OrdemServicoCard({
    ordem,
    clientes,
    departamentos,
    podeEditar,
    bloqueado,
    funcionarios = [],
    modoKanban = false,
    opcoesStatusMovimentacao = [],
    onMoverStatus,
    onInicioArrasto,
    onFimArrasto,
    onAbrir,
    onEditar,
    onAlterarAtivo,
}: OrdemServicoCardProps) {
    const [statusDestino, setStatusDestino] = useState<StatusOrdemServico | "">("");
    const seletorDestinoRef = useRef<HTMLSelectElement>(null);

    const podeEditarEstaOrdem =
        podeEditar && ordem.ativo && ordem.status !== "concluido" && ordem.status !== "bloqueado";
    const criticidade = ordem.criticidade ?? "indefinida";
    const criticidadeLabel = ordem.criticidade
        ? CRITICIDADE_LABELS[ordem.criticidade]
        : "Sem criticidade";
    const cliente = clientes.find((item) => item.id === ordem.cliente_id);
    const departamento = departamentos.find((item) => item.id === ordem.departamento_id);
    const responsavel = funcionarios.find((item) => item.id === ordem.responsavel_id);
    const atrasada = ordemEstaAtrasada(ordem);
    const podeMoverNesteQuadro =
        modoKanban && ordem.ativo && opcoesStatusMovimentacao.length > 0 && Boolean(onMoverStatus);

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
                        {!ordem.ativo && <span className="ordem-responsavel-inativo">Inativa</span>}
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

                <div className={`ordem-card-temporal${atrasada ? " ordem-card-temporal--atrasada" : ""}`}>
                    <span className="ordem-card-temporal-item">
                        <span>Abertura</span>
                        <strong>{formatarDataOrdem(ordem.data_criacao)}</strong>
                    </span>
                    <span className="ordem-card-temporal-item">
                        <span>Prazo</span>
                        <strong>{formatarDataOrdem(ordem.data_limite_sla)}</strong>
                    </span>
                    {ordem.data_fim && (
                        <span className="ordem-card-temporal-item ordem-card-temporal-item--conclusao">
                            <span>Concluída</span>
                            <strong>{formatarDataOrdem(ordem.data_fim)}</strong>
                        </span>
                    )}
                    {atrasada && <span className="ordem-prazo-vencido" role="status">Prazo vencido</span>}
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
                <span>
                    Responsável: {responsavel
                        ? `${responsavel.nome || `Funcionário #${responsavel.id}`}${!responsavel.ativo ? " (inativo)" : ""}`
                        : ordem.responsavel_id !== null
                          ? `Funcionário #${ordem.responsavel_id}`
                          : "Não atribuído"}
                </span>
            </div>

            {(podeEditar || podeMoverNesteQuadro) && (
                <div className={`ordem-card-actions${modoKanban ? " ordem-card-actions--kanban" : ""}`}>
                    {podeEditar && (
                        <>
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
                        </>
                    )}

                    {podeMoverNesteQuadro && (
                        <div className="ordem-kanban-mover">
                            <button
                                type="button"
                                className="ordem-kanban-drag-handle"
                                draggable={!bloqueado}
                                disabled={bloqueado}
                                aria-label={`Arrastar O.S. #${ordem.id} para outra coluna; use também o seletor de destino por teclado`}
                                title="Arraste para outra coluna ou escolha um destino no seletor"
                                onClick={() => seletorDestinoRef.current?.focus()}
                                onDragStart={(event) => {
                                    event.dataTransfer.setData("text/plain", String(ordem.id));
                                    event.dataTransfer.effectAllowed = "move";
                                    onInicioArrasto?.(ordem);
                                }}
                                onDragEnd={() => onFimArrasto?.()}
                            >
                                ⠿ Arrastar
                            </button>
                            <label className="ordem-kanban-sr-only" htmlFor={`ordem-kanban-destino-${ordem.id}`}>
                                Mover O.S. #{ordem.id} para status
                            </label>
                            <select
                                ref={seletorDestinoRef}
                                id={`ordem-kanban-destino-${ordem.id}`}
                                value={statusDestino}
                                onChange={(event) => setStatusDestino(event.target.value as StatusOrdemServico | "")}
                                disabled={bloqueado}
                            >
                                <option value="">Mover para…</option>
                                {opcoesStatusMovimentacao.map((status) => (
                                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="projeto-btn-secondary"
                                disabled={bloqueado || !statusDestino}
                                onClick={() => {
                                    if (!statusDestino || !onMoverStatus) return;
                                    void onMoverStatus(ordem, statusDestino);
                                    setStatusDestino("");
                                }}
                            >
                                Mover
                            </button>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

export default OrdemServicoCard;