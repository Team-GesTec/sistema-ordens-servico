import { useEffect, useMemo, useRef, useState } from "react";
import { calcularDiasUteisRestantes } from "../utils/filtroPrazo";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import OrdensToolbar from "../components/ordens/OrdensToolbar";
import Pagination from "../components/common/Pagination";
import usePaginatedList from "../hooks/usePaginatedList";
import OrdemServicoAtivoModal from "../components/ordens/OrdemServicoAtivoModal";
import OrdemServicoCard from "../components/ordens/OrdemServicoCard";
import OrdemServicoDetalhesModal from "../components/ordens/OrdemServicoDetalhesModal";
import OrdemServicoFormModal from "../components/ordens/OrdemServicoFormModal";
import OrdemServicoKanban from "../components/ordens/OrdemServicoKanban";
import OrdemServicoVisualizacoesSalvas, { type TipoVisualizacaoOrdens } from "../components/ordens/OrdemServicoVisualizacoesSalvas";
import { useOrdens } from "../hooks/useOrdens";
import { useAnexosOrdem } from "../hooks/useAnexosOrdem";

import type { NivelCriticidade } from "../types/api";
import { CRITICIDADE_LABELS, STATUS_LABELS, formatarDataOrdem, parseDataOrdem } from "../utils/ordemServicoUtils";

type FiltroPrazo = "todos" | "proximos3" | "proximos5" | "proximos7";

// Quanto maior o peso, maior a prioridade da O.S.
const PESO_CRITICIDADE: Record<NivelCriticidade, number> = {
    baixo: 1,
    medio: 2,
    alto: 3,
    muito_alto: 4,
    urgente: 5,
};

function pesoCriticidade(
    criticidade: NivelCriticidade | null | undefined,
): number {
    return criticidade ? PESO_CRITICIDADE[criticidade] : 0;
}

function Ordens() {
    const ordens = useOrdens();
    const navigate = useNavigate();
    const anexosOrdem = useAnexosOrdem(
        ordens.detalhesAbertos ? ordens.ordemSelecionada : null,
    );
    const [visualizacao, setVisualizacao] = useState<TipoVisualizacaoOrdens>("tabela");

    const [filtroPrazo, setFiltroPrazo] = useState<FiltroPrazo>("todos");

    const ordensExibidas = useMemo(() => {
        const limiteDias =
            filtroPrazo === "todos"
                ? null
                : {
                      proximos3: 3,
                      proximos5: 5,
                      proximos7: 7,
                  }[filtroPrazo];

        // Calcula os dias úteis restantes para cada O.S.
        const resultado = ordens.ordensFiltradas
            .map((ordem) => ({
                ordem,
                dias: calcularDiasUteisRestantes(ordem.data_limite_sla),
            }))
            // Primeiro, prazo mais próximo.
            // Em empate, maior criticidade.
            // Persistindo o empate, menor ID.
            .sort((a, b) => {
                const diasA = a.dias ?? Number.POSITIVE_INFINITY;
                const diasB = b.dias ?? Number.POSITIVE_INFINITY;

                return (
                    diasA - diasB ||
                    pesoCriticidade(b.ordem.criticidade) -
                        pesoCriticidade(a.ordem.criticidade) ||
                    a.ordem.id - b.ordem.id
                );
            });

        // "Todos os prazos" mantém todas as O.S.,
        // inclusive as vencidas e as que não possuem prazo válido.
        if (limiteDias === null) {
            return resultado.map((item) => item.ordem);
        }

        // Os filtros de prazo mostram apenas O.S. com prazo
        // entre 1 e o limite selecionado, em dias úteis.
        return resultado
            .filter(
                (item) =>
                    item.dias !== null &&
                    item.dias >= 1 &&
                    item.dias <= limiteDias,
            )
            .map((item) => item.ordem);
    }, [ordens.ordensFiltradas, filtroPrazo]);
    const paginacaoOrdens = usePaginatedList(ordensExibidas, 10);

    const [searchParams] = useSearchParams();
    const idVisualizar = searchParams.get("visualizar");
    const idVisualizarProcessado = useRef<string | null>(null);

    useEffect(() => {
        if (!idVisualizar) {
            idVisualizarProcessado.current = null;
            return;
        }
        if (idVisualizarProcessado.current === idVisualizar) return;
        idVisualizarProcessado.current = idVisualizar;
        const id = Number(idVisualizar);
        if (Number.isSafeInteger(id) && id > 0) {
            navigate(`/ordens/${id}`, { replace: true });
        }
    }, [idVisualizar, navigate]);

    const fonteAtual = ordens.mostrarInativas ? ordens.ordensInativas : ordens.ordens;
    const inicioHoje = new Date();
    inicioHoje.setHours(0, 0, 0, 0);
    const ordensSlaEmRisco = fonteAtual.filter((item) => {
        const prazo = parseDataOrdem(item.data_limite_sla);
        return item.status !== "concluido" && !item.data_fim && prazo !== null && prazo.getTime() < inicioHoje.getTime();
    }).length;
    const carregamentoAtual = ordens.carregando || (ordens.mostrarInativas && ordens.carregandoInativas);

    return (
        <div className="layout">
            <main className="main ordens-main">
                <div className="container projetos-container ordens-container gestec-page-content">
                    <header className="projetos-page-header page-heading">
                        <div>
                            <p className="projetos-eyebrow eyebrow">OPERAÇÃO</p>
                            <h1>Ordens de serviço</h1>
                            <p className="projetos-subtitle">Centralize solicitações, prioridades, responsáveis e prazos em um único lugar.</p>
                        </div>
                        <div className="heading-actions">{ordens.podeCriar && <button type="button" className="projeto-btn-primary btn btn-primary" onClick={ordens.abrirCadastro}>＋ Nova ordem de serviço</button>}</div>
                    </header>

                    {ordens.mensagem && (
                        <div className="projetos-feedback projetos-feedback--success" role="status">
                            {ordens.mensagem}
                        </div>
                    )}
                    {ordens.erro && !ordens.formularioAberto && !ordens.detalhesAbertos && (
                        <div className="projetos-feedback projetos-feedback--error" role="alert">{ordens.erro}</div>
                    )}

                    <section className="gestec-kpi-grid" aria-label="Indicadores de ordens de serviço">
                        <article className="gestec-kpi-card"><span className="gestec-kpi-label">Total de ordens</span><strong>{fonteAtual.length}</strong><small>{ordens.mostrarInativas ? "Registros inativos" : "Ordens ativas"}</small><span className="gestec-kpi-icon">▤</span></article>
                        <article className="gestec-kpi-card"><span className="gestec-kpi-label">Aguardando ação</span><strong>{fonteAtual.filter((item) => item.status === "aguardando").length}</strong><small>Conforme o status informado pela API</small><span className="gestec-kpi-icon gestec-kpi-icon--amber">◷</span></article>
                        <article className="gestec-kpi-card"><span className="gestec-kpi-label">SLA em risco</span><strong>{ordensSlaEmRisco}</strong><small>Ordens abertas com prazo vencido</small><span className="gestec-kpi-icon gestec-kpi-icon--purple">⚑</span></article>
                        <article className="gestec-kpi-card"><span className="gestec-kpi-label">Alta criticidade</span><strong>{fonteAtual.filter((item) => item.criticidade === "alto" || item.criticidade === "muito_alto" || item.criticidade === "urgente").length}</strong><small>Alta, muito alta ou urgente</small><span className="gestec-kpi-icon gestec-kpi-icon--purple">⚑</span></article>
                    </section>

                    <OrdensToolbar
                        busca={ordens.busca}
                        onBuscaChange={(valor) => { ordens.setBusca(valor); paginacaoOrdens.setPage(1); }}
                        filtroStatus={ordens.filtroStatus}
                        onFiltroStatusChange={(valor) => { ordens.setFiltroStatus(valor); paginacaoOrdens.setPage(1); }}
                        ordens={fonteAtual}
                        funcionarios={ordens.funcionariosConhecidos}
                        filtroResponsavelId={ordens.filtroResponsavelId}
                        onFiltroResponsavelChange={(valor) => { ordens.setFiltroResponsavelId(valor); paginacaoOrdens.setPage(1); }}
                        podeGerenciar={ordens.podeGerenciar}
                        mostrarInativas={ordens.mostrarInativas}
                        carregandoInativas={ordens.carregandoInativas}
                        filtroPrazo={filtroPrazo}
                        onFiltroPrazoChange={(valor) => { setFiltroPrazo(valor); paginacaoOrdens.setPage(1); }}
                        onAlternarInativas={() => {
                            paginacaoOrdens.setPage(1);
                            if (ordens.mostrarInativas) {
                                ordens.setMostrarInativas(false);
                            } else {
                                ordens.setMostrarInativas(true);
                                void ordens.carregarOrdensInativas();
                            }
                        }}
                        visualizacoesSalvas={
                            <OrdemServicoVisualizacoesSalvas
                                usuarioId={ordens.usuarioAtualId}
                                busca={ordens.busca}
                                status={ordens.filtroStatus}
                                responsavelId={ordens.filtroResponsavelId}
                                visualizacao={visualizacao}
                                onAplicar={(salva) => {
                                    ordens.setBusca(salva.busca);
                                    paginacaoOrdens.setPage(1);
                                    ordens.setFiltroStatus(salva.status);
                                    ordens.setFiltroResponsavelId(salva.responsavelId);
                                    setVisualizacao(salva.visualizacao);
                                    ordens.limparErro();
                                }}
                            />
                        }
                    />

                    <div className="projetos-list-header ordens-list-header">
                        <div>
                            <h2>{ordens.mostrarInativas ? "Ordens de serviço inativas" : "Ordens de serviço ativas"}</h2>
                            <p>{ordensExibidas.length} resultado(s)</p>
                        </div>
                        <div className="ordens-list-header-actions">
                            <div className="ordens-view-switch" role="group" aria-label="Visualização das ordens de serviço">
                                <button type="button" className={visualizacao === "tabela" ? "active" : ""} aria-pressed={visualizacao === "tabela"} onClick={() => setVisualizacao("tabela")}>Tabela</button>
                                <button type="button" className={visualizacao === "cartoes" ? "active" : ""} aria-pressed={visualizacao === "cartoes"} onClick={() => setVisualizacao("cartoes")}>Cartões</button>
                                <button type="button" className={visualizacao === "kanban" ? "active" : ""} aria-pressed={visualizacao === "kanban"} onClick={() => setVisualizacao("kanban")}>Kanban</button>
                            </div>
                            {carregamentoAtual && <span className="projetos-loading" role="status">Carregando…</span>}
                        </div>
                    </div>

                    {carregamentoAtual ? (
                        <div className="projetos-empty" role="status">
                            <span className="projetos-loading-mark" aria-hidden="true" />
                            {ordens.mostrarInativas ? "Carregando ordens inativas..." : "Carregando ordens de serviço..."}
                        </div>
                    ) : ordensExibidas.length === 0 ? (
                        <div className="projetos-empty">
                            <strong>{fonteAtual.length === 0
                                ? ordens.mostrarInativas ? "Nenhuma O.S. inativa cadastrada" : "Nenhuma O.S. cadastrada"
                                : filtroPrazo !== "todos"
                                    ? "Nenhuma ordem corresponde ao filtro de prazo selecionado."
                                    : "Nenhuma ordem corresponde à busca e aos filtros selecionados."}</strong>
                            <p>{fonteAtual.length === 0
                                ? ordens.mostrarInativas ? "Não há registros inativos para exibir." : "Cadastre uma ordem de serviço para começar."
                                : filtroPrazo !== "todos"
                                    ? "Tente selecionar outro intervalo de prazo para visualizar mais ordens."
                                    : "Altere a pesquisa ou os filtros para ver outros resultados."}</p>
                        </div>
                    ) : visualizacao === "tabela" ? (
                        <section className="card table-card gestec-data-card" aria-labelledby="ordens-table-heading">
                            <div className="gestec-table-heading"><div><h2 id="ordens-table-heading">{ordens.mostrarInativas ? "Ordens inativas" : "Ordens de serviço"}</h2><p>Solicitação, responsável, status, prioridade e prazo da O.S.</p></div><span className="gestec-record-count">{ordensExibidas.length} registro(s)</span></div>
                            <div className="table-scroll gestec-table-scroll"><table className="table gestec-data-table gestec-orders-table">
                                <thead><tr><th>OS / identificação</th><th>Solicitação</th><th>Responsável</th><th>Status</th><th>Prioridade</th><th>Prazo / SLA</th><th className="gestec-actions-cell">Ações</th></tr></thead>
                                <tbody>{paginacaoOrdens.pageItems.map((ordem) => {
                                    const cliente = ordens.clientes.find((item) => item.id === ordem.cliente_id);
                                    const responsavel = ordens.funcionariosConhecidos.find((item) => item.id === ordem.responsavel_id);
                                    const prazo = parseDataOrdem(ordem.data_limite_sla);
                                    const hoje = new Date();
                                    hoje.setHours(0, 0, 0, 0);
                                    const atrasada = Boolean(prazo && prazo.getTime() < hoje.getTime() && ordem.status !== "concluido");
                                    const prioridade = ordem.criticidade ? CRITICIDADE_LABELS[ordem.criticidade] : "Não definida";
                                    return <tr key={ordem.id}>
                                        <td><div className="gestec-order-title"><span><Link className="gestec-table-link" to={`/ordens/${ordem.id}`}>OS #{ordem.id}</Link><small>{formatarDataOrdem(ordem.data_criacao)} · {ordem.tipo === "instalacao" ? "Instalação" : "Manutenção"}</small></span></div></td>
                                        <td><strong className="gestec-dashboard-order-title">{ordem.titulo}</strong><small className="gestec-cell-subtitle">{cliente ? (cliente.nome || cliente.razao_social || `Cliente #${cliente.id}`) : ordem.cliente_id === null ? "Não associado" : `Cliente #${ordem.cliente_id}`}</small></td>
                                        <td>{responsavel ? responsavel.nome || `Funcionário #${responsavel.id}` : ordem.responsavel_id === null ? "Não atribuído" : `Funcionário #${ordem.responsavel_id}`}</td>
                                        <td><span className={`gestec-status-pill gestec-os-status status-${ordem.status}`}><i aria-hidden="true" />{STATUS_LABELS[ordem.status]}</span>{!ordem.ativo && <small className="gestec-inline-note">Inativa</small>}</td>
                                        <td><span className={`gestec-priority-pill priority-${ordem.criticidade ?? "indefinida"}`}>{prioridade}</span></td>
                                        <td><span className={atrasada ? "gestec-deadline is-late" : "gestec-deadline"}>{formatarDataOrdem(ordem.data_limite_sla)}{atrasada && <small>Vencida</small>}</span></td>
                                        <td className="gestec-actions-cell"><div className="gestec-row-actions">
                                            <button type="button" className="gestec-icon-action" onClick={() => navigate(`/ordens/${ordem.id}`)} aria-label={`Ver detalhes da O.S. ${ordem.id}`} title="Ver detalhes">◉</button>
                                            {ordens.podeOperarDepartamento && ordem.ativo && ordem.status !== "concluido" && ordem.status !== "bloqueado" && <button type="button" className="gestec-icon-action" onClick={() => ordens.iniciarEdicao(ordem)} disabled={ordens.salvando} aria-label={`Editar O.S. ${ordem.id}`} title="Editar">✎</button>}
                                            {ordens.podeGerenciar && <button type="button" className="gestec-icon-action is-danger" onClick={() => ordens.solicitarAlteracaoAtivo(ordem, ordem.ativo ? "inativar" : "reativar")} disabled={ordens.inativandoId !== null} aria-label={`${ordem.ativo ? "Inativar" : "Reativar"} O.S. ${ordem.id}`} title={ordem.ativo ? "Inativar" : "Reativar"}>{ordem.ativo ? "−" : "↻"}</button>}
                                        </div></td>
                                    </tr>;
                                })}</tbody>
                            </table></div>
                            <footer className="gestec-table-footer"><span>Exibindo {paginacaoOrdens.pageItems.length} de {ordensExibidas.length} O.S.</span><span>Dados apresentados conforme o escopo e as permissões da sessão atual.</span></footer>
                        </section>
                    ) : visualizacao === "kanban" ? (
                        <OrdemServicoKanban
                            ordens={paginacaoOrdens.pageItems}
                            clientes={ordens.clientes}
                            departamentos={ordens.departamentos}
                            funcionarios={ordens.funcionariosConhecidos}
                            podeEditar={ordens.podeOperarDepartamento}
                            bloqueado={ordens.salvando || ordens.alterandoStatusId !== null}
                            podeMoverParaStatus={ordens.podeMoverOrdemParaStatus}
                            onAbrir={(selecionada) => navigate(`/ordens/${selecionada.id}`)}
                            onEditar={ordens.iniciarEdicao}
                            onAlterarAtivo={ordens.solicitarAlteracaoAtivo}
                            onMoverStatus={ordens.moverOrdemKanban}
                        />
                    ) : (
                        <div className="projetos-grid ordens-grid">
                            {paginacaoOrdens.pageItems.map((ordem) => (
                                <OrdemServicoCard
                                    key={ordem.id}
                                    ordem={ordem}
                                    onAlterarAtivo={ordens.solicitarAlteracaoAtivo}
                                    clientes={ordens.clientes}
                                    departamentos={ordens.departamentos}
                                    funcionarios={ordens.funcionariosConhecidos}
                                    podeEditar={ordens.podeOperarDepartamento}
                                    bloqueado={ordens.salvando || ordens.alterandoStatusId === ordem.id}
                                    onAbrir={(selecionada) => navigate(`/ordens/${selecionada.id}`)}
                                    onEditar={ordens.iniciarEdicao}
                                />
                            ))}
                        </div>
                    )}
                    {!carregamentoAtual && ordensExibidas.length > 0 && (
                        <Pagination page={paginacaoOrdens.page} totalPages={paginacaoOrdens.totalPages} totalItems={ordensExibidas.length} pageSize={10} onPageChange={paginacaoOrdens.setPage} />
                    )}
                </div>
            </main>

            <OrdemServicoDetalhesModal
                aberto={ordens.detalhesAbertos}
                ordem={ordens.ordemSelecionada}
                carregando={ordens.carregandoDetalhes}
                erro={ordens.detalhesAbertos ? ordens.erro : null}
                podeEditar={ordens.podeOperarDepartamento}
                clientes={ordens.clientes}
                departamentos={ordens.departamentos}
                funcionarios={ordens.funcionariosConhecidos}
                funcionariosElegiveis={ordens.podeOperarDepartamento
                    ? ordens.funcionariosAtivos
                    : ordens.funcionariosAtivos.filter((funcionario) =>
                        funcionario.id === ordens.usuarioAtualId &&
                        funcionario.departamento_id === ordens.ordemSelecionada?.departamento_id
                    )}
                atribuindoResponsavel={ordens.atribuindoResponsavel}
                podeReatribuirResponsavel={ordens.podeAtribuirResponsavel}
                onAtribuirResponsavel={(funcionarioId) => void ordens.atribuirResponsavelOrdem(funcionarioId)}
                onFechar={ordens.fecharDetalhes}
                onEditar={ordens.iniciarEdicao}
                podeAlterarStatus={ordens.podeAlterarStatus}
                podeConcluir={ordens.podeConcluir}
                alterandoStatusId={ordens.alterandoStatusId}
                onAlterarStatus={ordens.alterarStatusOrdem}
                statusSugerido={ordens.statusSolicitadoDetalhes}
                anexos={anexosOrdem.anexos}
                carregandoAnexos={anexosOrdem.carregandoAnexos}
                erroAnexos={anexosOrdem.erroAnexos}
                tiposPermitidos={anexosOrdem.tiposPermitidos}
                onEnviarAnexo={anexosOrdem.enviarAnexo}
                onBaixarAnexo={anexosOrdem.baixarAnexo}
                podeAlterarPrazo={ordens.podeGerenciar}
                alterandoPrazo={ordens.alterandoPrazo}
                onAlterarPrazo={ordens.alterarPrazoOrdem}
            />

            <OrdemServicoAtivoModal
                ordem={ordens.confirmacaoAtivo?.ordem ?? null}
                acao={ordens.confirmacaoAtivo?.acao ?? null}
                processando={ordens.inativandoId !== null}
                erro={ordens.confirmacaoAtivo ? ordens.erro : null}
                onFechar={ordens.fecharConfirmacaoAtivo}
                onConfirmar={ordens.confirmarAlteracaoAtivo}
            />

            <OrdemServicoFormModal
                aberto={ordens.formularioAberto}
                ordem={ordens.ordemEmEdicao}
                clientes={ordens.clientes}
                departamentos={ordens.departamentos}
                projetos={ordens.projetos}
                salvando={ordens.salvando}
                erro={ordens.formularioAberto ? ordens.erro : null}
                carregandoOpcoes={ordens.carregando}
                podeCadastrarAntiga={ordens.podeGerenciar}
                onClose={ordens.fecharFormulario}
                onSave={ordens.salvarOrdem}
                onClearError={ordens.limparErro}
            />
        </div>
    );
}

export default Ordens;
