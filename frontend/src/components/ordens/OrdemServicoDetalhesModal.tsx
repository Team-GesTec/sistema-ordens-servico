import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type {
    Cliente,
    Departamento,
    OrdemServico,
    StatusOrdemServico,
} from "../../types/api";
import {
    CRITICIDADE_LABELS,
    STATUS_LABELS,
    TIPO_LABELS,
} from "../../utils/ordemServicoUtils";

interface OrdemServicoDetalhesModalProps {
    aberto: boolean;
    ordem: OrdemServico | null;
    clientes: Cliente[];
    departamentos: Departamento[];
    carregando: boolean;
    erro: string | null;
    podeEditar: boolean;
    podeAlterarStatus: boolean;
    alterandoStatusId: number | null;
    onFechar: () => void;
    onEditar: (ordem: OrdemServico) => void;
    onAlterarStatus: (status: StatusOrdemServico) => void;
}

const STATUS_EDITAVEIS: StatusOrdemServico[] = [
    "em_andamento",
    "aguardando",
    "validacao_testes",
];

function formatarData(data: string | null | undefined): string {
    if (!data) return "Não definida";

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        return "Não definida";
    }

    return dataConvertida.toLocaleString("pt-BR");
}

function OrdemServicoDetalhesModal({
    aberto,
    ordem,
    carregando,
    erro,
    podeEditar,
    podeAlterarStatus,
    alterandoStatusId,
    clientes,
    departamentos,
    onFechar,
    onEditar,
    onAlterarStatus,
}: OrdemServicoDetalhesModalProps) {
    const [parecerTemporario, setParecerTemporario] = useState("");
    const [statusSelecionado, setStatusSelecionado] =
        useState<StatusOrdemServico>("em_andamento");

    // Descarta o rascunho ao fechar o modal ou trocar de OS.
    useEffect(() => {
        setParecerTemporario("");
    }, [aberto, ordem?.id]);

    // Sincroniza o seletor com o status atual da ordem.
    useEffect(() => {
        setStatusSelecionado(ordem?.status ?? "em_andamento");
    }, [aberto, ordem?.id, ordem?.status]);

    // Permite fechar o modal com a tecla Escape.
    useEffect(() => {
        if (!aberto) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onFechar();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [aberto, onFechar]);

    if (!aberto) return null;

    const podeEditarOrdem =
        podeEditar &&
        ordem !== null &&
        ordem.status !== "bloqueado" &&
        ordem.status !== "concluido";

    const cliente = ordem
        ? clientes.find((item) => item.id === ordem.cliente_id)
        : undefined;

    const departamento = ordem
        ? departamentos.find((item) => item.id === ordem.departamento_id)
        : undefined;

    return (
        <div
            className="ordem-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onFechar();
                }
            }}
        >
            <section
                className="ordem-modal ordem-modal--detalhes"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ordem-detalhes-titulo"
            >
                <header className="ordem-modal-header">
                    <div>
                        <span className="ordem-card-id">
                            {ordem ? `OS #${ordem.id}` : "Ordem de serviço"}
                        </span>

                        <h2 id="ordem-detalhes-titulo">
                            {ordem?.titulo ?? "Detalhes da ordem de serviço"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="ordem-modal-close"
                        onClick={onFechar}
                        aria-label="Fechar detalhes"
                    >
                        ×
                    </button>
                </header>

                <div className="ordem-modal-body">
                    {carregando && (
                        <p className="ordens-feedback" role="status">
                            Carregando detalhes...
                        </p>
                    )}

                    {erro && (
                        <p
                            className="ordens-feedback ordens-feedback--error"
                            role="alert"
                        >
                            {erro}
                        </p>
                    )}

                    {!ordem && !carregando && !erro && (
                        <p>Não há detalhes disponíveis para esta ordem.</p>
                    )}

                    {ordem && (
                        <>
                            <div className="ordem-detalhes-resumo">
                                <div className="ordem-detalhe">
                                    <span>Cliente</span>
                                    <strong>
                                        {cliente ? (
                                            <Link
                                                to={`/clientes?visualizar=${cliente.id}`}
                                                className="ordem-relacionamento-link"
                                            >
                                                {cliente.nome}
                                            </Link>
                                        ) : ordem.cliente_id ? (
                                            `Cliente #${ordem.cliente_id}`
                                        ) : (
                                            "Não associado"
                                        )}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Departamento</span>
                                    <strong>
                                        {departamento ? (
                                            <Link
                                                to={`/departamentos?visualizar=${departamento.id}`}
                                                className="ordem-relacionamento-link"
                                            >
                                                {departamento.nome}
                                            </Link>
                                        ) : (
                                            `Departamento #${ordem.departamento_id}`
                                        )}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Tipo</span>
                                    <strong>{TIPO_LABELS[ordem.tipo]}</strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Status</span>
                                    <strong
                                        className={`ordem-status-badge ordem-status-badge--${ordem.status}`}
                                    >
                                        {STATUS_LABELS[ordem.status]}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Criticidade</span>
                                    <strong>
                                        {ordem.criticidade
                                            ? CRITICIDADE_LABELS[ordem.criticidade]
                                            : "Não definida"}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Data de criação</span>
                                    <strong>
                                        {formatarData(ordem.data_criacao)}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Projeto</span>
                                    <strong>
                                        {ordem.projeto_id
                                            ? `Projeto #${ordem.projeto_id}`
                                            : "Sem projeto associado"}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Prazo do SLA</span>
                                    <strong>
                                        {"data_limite_sla" in ordem
                                            ? formatarData(
                                                  (
                                                      ordem as OrdemServico & {
                                                          data_limite_sla?:
                                                              | string
                                                              | null;
                                                      }
                                                  ).data_limite_sla,
                                              )
                                            : "Não informado"}
                                    </strong>
                                </div>
                            </div>

                            {podeAlterarStatus && (
                                <section className="ordem-detalhes-descricao ordem-status-edicao">
                                    <h3>Alterar status</h3>

                                    <select
                                        id="ordem-status-select"
                                        className="ordem-status-select"
                                        aria-label="Selecionar novo status"
                                        value={statusSelecionado}
                                        onChange={(event) =>
                                            setStatusSelecionado(
                                                event.target.value as StatusOrdemServico,
                                            )
                                        }
                                        disabled={alterandoStatusId !== null}
                                    >
                                        {STATUS_EDITAVEIS.map((status) => (
                                            <option key={status} value={status}>
                                                {STATUS_LABELS[status]}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        type="button"
                                        className="ordens-btn-primary ordem-status-atualizar"
                                        onClick={() => onAlterarStatus(statusSelecionado)}
                                        disabled={
                                            alterandoStatusId !== null ||
                                            statusSelecionado === ordem.status
                                        }
                                    >
                                        {alterandoStatusId === ordem.id
                                            ? "Atualizando..."
                                            : "Atualizar status"}
                                    </button>
                                </section>
                            )}

                            <section className="ordem-detalhes-descricao">
                                <h3>Descrição da solicitação</h3>
                                <p>
                                    {ordem.descricao || "Sem descrição."}
                                </p>
                            </section>

                            <section className="ordem-detalhes-descricao">
                                <h3>Parecer técnico registrado</h3>
                                <p>
                                    {ordem.parecer_tecnico ||
                                        "Nenhum parecer registrado."}
                                </p>
                            </section>

                            <section className="ordem-detalhes-descricao ordem-parecer-rascunho">
                                <h3>Parecer técnico — rascunho temporário</h3>

                                <label htmlFor="parecer-tecnico-temporario">
                                    Seu rascunho
                                </label>

                                <textarea
                                    id="parecer-tecnico-temporario"
                                    className="ordem-parecer-textarea"
                                    rows={6}
                                    value={parecerTemporario}
                                    onChange={(event) =>
                                        setParecerTemporario(event.target.value)
                                    }
                                    placeholder="Escreva aqui seu rascunho..."
                                />
                            </section>
                        </>
                    )}
                </div>

                <footer className="ordem-modal-actions">
                    <button
                        type="button"
                        className="ordens-btn-secondary"
                        onClick={onFechar}
                    >
                        Fechar
                    </button>

                    {podeEditarOrdem && ordem && (
                        <button
                            type="button"
                            className="ordens-btn-primary"
                            onClick={() => onEditar(ordem)}
                        >
                            Editar ordem
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
}

export default OrdemServicoDetalhesModal;