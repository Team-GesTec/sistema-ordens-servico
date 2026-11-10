import { useMemo, useState } from "react";
import type { Cliente } from "../types/api";
import ClienteFormModal from "../components/clientes/ClienteFormModal";
import ClienteDetalhesModal from "../components/clientes/ClienteDetalhesModal";
import ClienteStatusModal from "../components/clientes/ClienteStatusModal";
import ClientesToolbar from "../components/clientes/ClientesToolbar";
import Pagination from "../components/common/Pagination";
import usePaginatedList from "../hooks/usePaginatedList";
import { useClientes } from "../hooks/useClientes";
import { getGestecAvatarTone, getGestecInitials } from "../utils/gestecAvatar";
import { Link, useSearchParams } from "react-router-dom";

function Clientes() {
    const clientes = useClientes();
    const [clienteDetalhes, setClienteDetalhes] = useState<Cliente | null>(null);
    const [searchParams] = useSearchParams();
    const clienteParam = searchParams.get("visualizar");
    const clienteVisualizadoId = Number(clienteParam);

    const modoVisualizacao =
        clienteParam !== null &&
        Number.isInteger(clienteVisualizadoId) &&
        clienteVisualizadoId > 0;

    const clientesExibidos = useMemo(() => modoVisualizacao
        ? clientes.clientes.filter((cliente) => cliente.id === clienteVisualizadoId)
        : clientes.clientesFiltrados,
        [modoVisualizacao, clienteVisualizadoId, clientes.clientes, clientes.clientesFiltrados]);
    const paginacaoClientes = usePaginatedList(clientesExibidos, 10);
    const podeGerenciarTela = !modoVisualizacao && clientes.podeGerenciar;
    const modalStatusAberto = Boolean(clientes.clienteConfirmacao && clientes.acaoConfirmacao);

    const tituloLista = modoVisualizacao
        ? "Cliente selecionado"
        : clientes.filtroSituacao === "ativos"
            ? "Clientes ativos"
            : clientes.filtroSituacao === "inativos"
                ? "Clientes inativos"
                : "Todos os clientes";

    const totalClientes = clientes.clientes.length;
    const totalAtivos = clientes.clientes.filter((cliente) => cliente.ativo).length;
    const totalInativos = totalClientes - totalAtivos;
    const percentualAtivos = totalClientes > 0 ? `${Math.round((totalAtivos / totalClientes) * 100)}%` : "—";

    return (
        <div className="layout gestec-page-shell">
            <main className="main">
                <div className="container projetos-container clientes-container gestec-page-content">
                    <header className="projetos-page-header page-heading">
                        <div>
                            <p className="projetos-eyebrow eyebrow">CADASTROS</p>
                            <h1>{modoVisualizacao ? "Visualização do cliente" : "Clientes"}</h1>
                            <p className="projetos-subtitle">{modoVisualizacao
                                ? "Consulta dos dados do cliente relacionado à ordem de serviço."
                                : "Mantenha os dados de contato, contratos e histórico de atendimento organizados."}</p>
                        </div>
                        <div className="heading-actions">
                            {modoVisualizacao ? (
                                <Link to="/ordens" className="projeto-btn-secondary btn btn-secondary">Voltar às ordens</Link>
                            ) : podeGerenciarTela ? <button type="button" className="projeto-btn-primary btn btn-primary" onClick={clientes.abrirCadastro}>＋ Novo cliente</button> : null}
                        </div>
                    </header>

                    {clientes.mensagem && <div className="projetos-feedback projetos-feedback--success" role="status">{clientes.mensagem}</div>}
                    {clientes.erro && !clientes.modalAberto && !modalStatusAberto && <div className="projetos-feedback projetos-feedback--error" role="alert">{clientes.erro}</div>}

                    {!modoVisualizacao && (
                        <section className="gestec-kpi-grid" aria-label="Indicadores de clientes">
                            <article className="gestec-kpi-card"><span className="gestec-kpi-label">Clientes cadastrados</span><strong>{totalClientes}</strong><small>Total disponível no seu escopo</small><span className="gestec-kpi-icon">♙</span></article>
                            <article className="gestec-kpi-card"><span className="gestec-kpi-label">Clientes ativos</span><strong>{totalAtivos}</strong><small>Cadastros disponíveis</small><span className="gestec-kpi-icon gestec-kpi-icon--green">✓</span></article>
                            <article className="gestec-kpi-card"><span className="gestec-kpi-label">Clientes inativos</span><strong>{totalInativos}</strong><small>Histórico preservado</small><span className="gestec-kpi-icon gestec-kpi-icon--amber">◷</span></article>
                            <article className="gestec-kpi-card"><span className="gestec-kpi-label">Taxa de atividade</span><strong>{percentualAtivos}</strong><small>Proporção de cadastros ativos</small><span className="gestec-kpi-icon gestec-kpi-icon--purple">%</span></article>
                        </section>
                    )}

                    {!modoVisualizacao && <ClientesToolbar
                        busca={clientes.busca}
                        onBuscaChange={(valor) => { clientes.setBusca(valor); paginacaoClientes.setPage(1); }}
                        filtroSituacao={clientes.filtroSituacao}
                        onFiltroChange={(valor) => { clientes.setFiltroSituacao(valor); paginacaoClientes.setPage(1); }}
                        clientes={clientes.clientesPorSituacao}
                    />}

                    <section className="card table-card gestec-data-card" aria-labelledby="clientes-list-title">
                        <div className="gestec-table-heading">
                            <div><h2 id="clientes-list-title">{tituloLista}</h2><p>Consulte os cadastros e acesse as ações disponíveis por cliente.</p></div>
                            <span className="gestec-record-count">{clientesExibidos.length} registro(s)</span>
                        </div>
                        {clientes.carregando ? (
                            <div className="projetos-empty" role="status"><span className="projetos-loading-mark" aria-hidden="true" />Carregando clientes...</div>
                        ) : clientesExibidos.length === 0 ? (
                            <div className="projetos-empty">
                                <strong>{modoVisualizacao ? `Cliente #${clienteVisualizadoId} não encontrado` : "Nenhum cliente encontrado"}</strong>
                                <p>{modoVisualizacao ? "Verifique se o cliente ainda está disponível para consulta." : clientes.busca.trim() ? "Altere a pesquisa ou os filtros para ver outros resultados." : clientes.filtroSituacao === "ativos" ? "Não há clientes ativos para exibir." : clientes.filtroSituacao === "inativos" ? "Não há clientes inativos para exibir." : "Cadastre um cliente para começar a utilizar o sistema."}</p>
                            </div>
                        ) : (
                            <div className="table-scroll gestec-table-scroll">
                                <table className="table gestec-data-table">
                                    <thead><tr><th>Cliente</th><th>Razão social</th><th>Ramo de atuação</th><th>Status</th><th className="gestec-actions-cell">Ações</th></tr></thead>
                                    <tbody>{paginacaoClientes.pageItems.map((cliente, itemIndex) => {
                                        const nomeAvatar = cliente.nome.trim() || cliente.razao_social.trim();
                                        const iniciais = getGestecInitials(nomeAvatar, "CL");
                                        const corAvatar = getGestecAvatarTone((paginacaoClientes.page - 1) * 10 + itemIndex);
                                        return (
                                            <tr
                                                key={cliente.id}
                                                className="gestec-clickable-row"
                                                tabIndex={0}
                                                aria-label={`Abrir detalhes de ${cliente.nome || `cliente ${cliente.id}`}`}
                                                onClick={() => setClienteDetalhes(cliente)}
                                                onKeyDown={(event) => {
                                                    if (event.target !== event.currentTarget) return;
                                                    if (event.key === "Enter" || event.key === " ") {
                                                        event.preventDefault();
                                                        setClienteDetalhes(cliente);
                                                    }
                                                }}
                                            >
                                                <td><div className="gestec-entity-cell"><span className={`gestec-avatar gestec-avatar--${corAvatar}`}>{iniciais}</span><span><strong>{cliente.nome.trim() || `Cliente #${cliente.id}`}</strong><small>CLIENTE #{cliente.id}</small></span></div></td>
                                                <td>{cliente.razao_social || <span className="gestec-muted">Não informada</span>}</td>
                                                <td>{cliente.ramo_atuacao || <span className="gestec-muted">Não informado</span>}</td>
                                                <td><span className={`gestec-status-pill ${cliente.ativo ? "is-active" : "is-inactive"}`}><i aria-hidden="true" />{cliente.ativo ? "Ativo" : "Inativo"}</span></td>
                                                <td className="gestec-actions-cell"><div className="gestec-row-actions">
                                                    {podeGerenciarTela && cliente.ativo && <button type="button" className="gestec-icon-action" onClick={(event) => { event.stopPropagation(); clientes.iniciarEdicao(cliente); }} disabled={clientes.salvando || clientes.inativandoId !== null} aria-label={`Editar ${cliente.nome || `cliente ${cliente.id}`}`} title="Editar">✎</button>}
                                                    {podeGerenciarTela && (cliente.ativo ? <button type="button" className="gestec-icon-action is-danger" onClick={(event) => { event.stopPropagation(); clientes.solicitarAlteracaoStatus(cliente, "inativar"); }} disabled={clientes.salvando || clientes.inativandoId !== null} aria-label={`Inativar ${cliente.nome || `cliente ${cliente.id}`}`} title="Inativar">−</button> : <button type="button" className="gestec-icon-action" onClick={(event) => { event.stopPropagation(); clientes.solicitarAlteracaoStatus(cliente, "reativar"); }} disabled={clientes.salvando || clientes.inativandoId !== null} aria-label={`Reativar ${cliente.nome || `cliente ${cliente.id}`}`} title="Reativar">↻</button>)}
                                                </div></td>
                                            </tr>
                                        );
                                    })}</tbody>
                                </table>
                            </div>
                        )}
                        {!clientes.carregando && clientesExibidos.length > 0 && <footer className="gestec-table-footer"><span>Exibindo {paginacaoClientes.pageItems.length} registro(s) nesta página de {clientesExibidos.length}</span>{!modoVisualizacao && <span className="gestec-muted">A pesquisa e os filtros são aplicados aos dados reais carregados.</span>}</footer>}
                    </section>
                    {!clientes.carregando && !modoVisualizacao && clientesExibidos.length > 0 && (
                        <Pagination page={paginacaoClientes.page} totalPages={paginacaoClientes.totalPages} totalItems={clientesExibidos.length} pageSize={10} onPageChange={paginacaoClientes.setPage} />
                    )}
                </div>
            </main>
            <ClienteDetalhesModal
                cliente={clienteDetalhes}
                onClose={() => setClienteDetalhes(null)}
                salvando={clientes.salvando}
                erro={clientes.erro}
                podeGerenciar={clientes.podeGerenciar && !modoVisualizacao}
                onSalvar={async (clienteId, dados) => {
                    const atualizado = await clientes.salvarEdicaoDireta(clienteId, dados);

                    if (atualizado) {
                        setClienteDetalhes(atualizado);
                    }

                    return atualizado;
                }}
            />
            <ClienteFormModal aberto={clientes.modalAberto} cliente={clientes.clienteEmEdicao} salvando={clientes.salvando} erro={clientes.erro} onClose={clientes.fecharModal} onSave={clientes.salvarCliente} onClearError={clientes.limparErro} />
            <ClienteStatusModal cliente={clientes.clienteConfirmacao} acao={clientes.acaoConfirmacao} processando={clientes.inativandoId !== null} erro={clientes.erro} onClose={clientes.fecharConfirmacao} onConfirm={clientes.confirmarAlteracaoStatus} />
        </div>
    );
}

export default Clientes;
