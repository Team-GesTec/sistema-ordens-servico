import { useMemo, useState, type DragEvent } from "react";
import type { Cliente, Departamento, Funcionario, OrdemServico, StatusOrdemServico } from "../../types/api";
import { STATUS_LABELS } from "../../utils/ordemServicoUtils";
import OrdemServicoCard from "./OrdemServicoCard";
import type { AcaoAtivoOrdem } from "./OrdemServicoAtivoModal";

const COLUNAS_KANBAN: StatusOrdemServico[] = [
    "em_andamento",
    "aguardando",
    "validacao_testes",
    "bloqueado",
    "concluido",
];

interface OrdemServicoKanbanProps {
    ordens: OrdemServico[];
    clientes: Cliente[];
    departamentos: Departamento[];
    funcionarios: Funcionario[];
    podeEditar: boolean;
    bloqueado: boolean;
    podeMoverParaStatus: (ordem: OrdemServico, status: StatusOrdemServico) => boolean;
    onAbrir: (ordem: OrdemServico) => void;
    onAlterarAtivo: (ordem: OrdemServico, acao: AcaoAtivoOrdem) => void;
    onMoverStatus: (ordem: OrdemServico, status: StatusOrdemServico) => void | Promise<void>;
    /** US#2.11 — quando informado, a última coluna alterna entre Concluídas e Arquivadas (nunca as duas juntas). */
    arquivadasSelecionadas?: boolean;
    onAlternarArquivadas?: (arquivadas: boolean) => void;
    carregandoArquivadas?: boolean;
    falhaArquivadas?: boolean;
    onTentarNovamenteArquivadas?: () => void;
}

function OrdemServicoKanban({
    ordens,
    clientes,
    departamentos,
    funcionarios,
    podeEditar,
    bloqueado,
    podeMoverParaStatus,
    onAbrir,
    onAlterarAtivo,
    onMoverStatus,
    arquivadasSelecionadas = false,
    onAlternarArquivadas,
    carregandoArquivadas = false,
    falhaArquivadas = false,
    onTentarNovamenteArquivadas,
}: OrdemServicoKanbanProps) {
    const [ordemArrastadaId, setOrdemArrastadaId] = useState<number | null>(null);
    const [statusAlvo, setStatusAlvo] = useState<StatusOrdemServico | null>(null);

    const porColuna = useMemo(() => {
        const grupos = new Map<StatusOrdemServico, OrdemServico[]>(
            COLUNAS_KANBAN.map((status) => [status, []]),
        );
        for (const ordem of ordens) grupos.get(ordem.status)?.push(ordem);
        return grupos;
    }, [ordens]);

    function podeSoltar(status: StatusOrdemServico): boolean {
        if (bloqueado || ordemArrastadaId === null) return false;
        const origem = ordens.find((ordem) => ordem.id === ordemArrastadaId);
        return Boolean(origem && podeMoverParaStatus(origem, status));
    }

    function soltar(event: DragEvent<HTMLElement>, destino: StatusOrdemServico) {
        event.preventDefault();
        const idTransferido = Number(event.dataTransfer.getData("text/plain"));
        const id = Number.isSafeInteger(idTransferido) && idTransferido > 0
            ? idTransferido
            : ordemArrastadaId;
        const origem = ordens.find((ordem) => ordem.id === id);
        setStatusAlvo(null);
        setOrdemArrastadaId(null);
        if (!origem || !podeMoverParaStatus(origem, destino)) return;
        void onMoverStatus(origem, destino);
    }

    return (
        <div className="ordens-kanban" aria-label="Quadro Kanban de ordens de serviço">
            {COLUNAS_KANBAN.map((status) => {
                const ordensDaColuna = porColuna.get(status) ?? [];
                const recebeArrasto = statusAlvo === status && podeSoltar(status);
                const alternaArquivadas = status === "concluido" && Boolean(onAlternarArquivadas);
                // Última coluna exibindo arquivadas: sem ação de inativar nos cartões.
                const arquivadasNaColuna = alternaArquivadas && arquivadasSelecionadas;
                return (
                    <section
                        key={status}
                        className={`ordens-kanban-column ordens-kanban-column--${status}${recebeArrasto ? " ordens-kanban-column--alvo" : ""}`}
                        aria-labelledby={alternaArquivadas ? undefined : `ordens-kanban-title-${status}`}
                        aria-label={alternaArquivadas ? "Ordens concluídas ou arquivadas" : undefined}
                        onDragEnter={(event) => {
                            if (podeSoltar(status)) {
                                event.preventDefault();
                                setStatusAlvo(status);
                            }
                        }}
                        onDragOver={(event) => {
                            if (podeSoltar(status)) {
                                event.preventDefault();
                                event.dataTransfer.dropEffect = "move";
                                setStatusAlvo(status);
                            }
                        }}
                        onDragLeave={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                setStatusAlvo((atual) => atual === status ? null : atual);
                            }
                        }}
                        onDrop={(event) => soltar(event, status)}
                    >
                        <header className="ordens-kanban-column-header">
                            {alternaArquivadas ? (
                                <div className="ordens-view-switch" role="group" aria-label="Exibir concluídas ou arquivadas">
                                    <button type="button" className={arquivadasSelecionadas ? "" : "active"} aria-pressed={!arquivadasSelecionadas} onClick={() => onAlternarArquivadas?.(false)}>Concluídas</button>
                                    <button type="button" className={arquivadasSelecionadas ? "active" : ""} aria-pressed={arquivadasSelecionadas} onClick={() => onAlternarArquivadas?.(true)}>Arquivadas</button>
                                </div>
                            ) : (
                                <h3 id={`ordens-kanban-title-${status}`}>{STATUS_LABELS[status]}</h3>
                            )}
                            <span aria-label={`${ordensDaColuna.length} ordens`} className="ordens-kanban-count">
                                {ordensDaColuna.length}
                            </span>
                        </header>
                        <div className="ordens-kanban-column-body">
                            {ordensDaColuna.length === 0 ? (
                                arquivadasNaColuna && falhaArquivadas ? (
                                    <div className="ordens-kanban-empty" role="alert">
                                        <p>Não foi possível carregar as arquivadas.</p>
                                        <button type="button" className="projeto-btn-secondary btn" onClick={onTentarNovamenteArquivadas}>Tentar novamente</button>
                                    </div>
                                ) : (
                                    <p className="ordens-kanban-empty">{arquivadasNaColuna ? (carregandoArquivadas ? "Carregando arquivadas..." : "Nenhuma O.S. arquivada.") : "Nenhuma O.S. nesta coluna."}</p>
                                )
                            ) : ordensDaColuna.map((ordem) => {
                                const opcoes = COLUNAS_KANBAN.filter((destino) => destino !== ordem.status && podeMoverParaStatus(ordem, destino));
                                return (
                                    <OrdemServicoCard
                                        key={ordem.id}
                                        ordem={ordem}
                                        clientes={clientes}
                                        departamentos={departamentos}
                                        funcionarios={funcionarios}
                                        podeEditar={podeEditar && !arquivadasNaColuna}
                                        bloqueado={bloqueado}
                                        modoKanban
                                        opcoesStatusMovimentacao={opcoes}
                                        onMoverStatus={onMoverStatus}
                                        onInicioArrasto={(arrastada) => {
                                            setOrdemArrastadaId(arrastada.id);
                                            setStatusAlvo(null);
                                        }}
                                        onFimArrasto={() => {
                                            setOrdemArrastadaId(null);
                                            setStatusAlvo(null);
                                        }}
                                        onAbrir={onAbrir}
                                        onAlterarAtivo={onAlterarAtivo}
                                    />
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

export default OrdemServicoKanban;
