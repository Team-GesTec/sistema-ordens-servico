import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/filters.css";
import "../styles/cards.css";
import "../styles/details.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import "../styles/projetos.css";
import "../styles/clientes.css";

import ClienteCard from "../components/clientes/ClienteCard";
import ClienteFormModal from "../components/clientes/ClienteFormModal";
import ClienteStatusModal from "../components/clientes/ClienteStatusModal";
import ClientesToolbar from "../components/clientes/ClientesToolbar";
import { useClientes } from "../hooks/useClientes";
import { Link, useSearchParams } from "react-router-dom";

function Clientes() {
    const clientes = useClientes();
    const [searchParams] = useSearchParams();
    const clienteParam = searchParams.get("visualizar");
    const clienteVisualizadoId = Number(clienteParam);

    const modoVisualizacao =
        clienteParam !== null &&
        Number.isInteger(clienteVisualizadoId) &&
        clienteVisualizadoId > 0;

    const clientesExibidos = modoVisualizacao
        ? clientes.clientes.filter((cliente) => cliente.id === clienteVisualizadoId)
        : clientes.clientesFiltrados;
    const podeGerenciarTela = !modoVisualizacao && clientes.podeGerenciar;
    const modalStatusAberto = Boolean(clientes.clienteConfirmacao && clientes.acaoConfirmacao);

    const tituloLista = modoVisualizacao
        ? "Cliente selecionado"
        : clientes.filtroSituacao === "ativos"
          ? "Clientes ativos"
          : clientes.filtroSituacao === "inativos"
            ? "Clientes inativos"
            : "Todos os clientes";

    return (
        <div className="layout">
            <main className="main">
                <div className="container projetos-container clientes-container">
                    <header className="projetos-page-header">
                        <div>
                            <p className="projetos-eyebrow">GESTÃO DO SGOS</p>
                            <h1>{modoVisualizacao ? "Visualização do cliente" : "Clientes"}</h1>
                            <p className="projetos-subtitle">
                                {modoVisualizacao
                                    ? "Consulta dos dados do cliente relacionado à ordem de serviço."
                                    : "Gerencie os cadastros de clientes e acompanhe sua situação no sistema."}
                            </p>
                        </div>
                        {modoVisualizacao ? (
                            <Link to="/ordens" className="projeto-btn-secondary">Voltar às ordens</Link>
                        ) : podeGerenciarTela ? (
                            <button type="button" className="projeto-btn-primary" onClick={clientes.abrirCadastro}>
                                + Novo cliente
                            </button>
                        ) : null}
                    </header>

                    {clientes.mensagem && (
                        <div className="projetos-feedback projetos-feedback--success" role="status">
                            {clientes.mensagem}
                        </div>
                    )}

                    {clientes.erro && !clientes.modalAberto && !modalStatusAberto && (
                        <div className="projetos-feedback projetos-feedback--error" role="alert">
                            {clientes.erro}
                        </div>
                    )}

                    {!modoVisualizacao && (
                        <ClientesToolbar
                            busca={clientes.busca}
                            onBuscaChange={clientes.setBusca}
                            filtroSituacao={clientes.filtroSituacao}
                            onFiltroChange={clientes.setFiltroSituacao}
                            clientes={clientes.clientesPorSituacao}
                        />
                    )}

                    <div className="projetos-list-header">
                        <div>
                            <h2>{tituloLista}</h2>
                            <p>{clientesExibidos.length} resultado(s)</p>
                        </div>
                        {clientes.carregando && <span className="projetos-loading" role="status">Carregando…</span>}
                    </div>

                    {clientes.carregando ? (
                        <div className="projetos-empty" role="status">
                            <span className="projetos-loading-mark" aria-hidden="true" />
                            Carregando clientes...
                        </div>
                    ) : clientesExibidos.length === 0 ? (
                        <div className="projetos-empty">
                            <strong>{modoVisualizacao ? `Cliente #${clienteVisualizadoId} não encontrado` : "Nenhum cliente encontrado"}</strong>
                            <p>
                                {modoVisualizacao
                                    ? "Verifique se o cliente ainda está disponível para consulta."
                                    : clientes.busca.trim()
                                      ? "Altere a pesquisa ou os filtros para ver outros resultados."
                                      : clientes.filtroSituacao === "ativos"
                                        ? "Não há clientes ativos para exibir."
                                        : clientes.filtroSituacao === "inativos"
                                          ? "Não há clientes inativos para exibir."
                                          : "Cadastre um cliente para começar a utilizar o sistema."}
                            </p>
                        </div>
                    ) : (
                        <div className="projetos-grid clientes-grid">
                            {clientesExibidos.map((cliente) => (
                                <ClienteCard
                                    key={cliente.id}
                                    cliente={cliente}
                                    podeGerenciar={podeGerenciarTela}
                                    bloqueado={clientes.salvando || clientes.inativandoId !== null}
                                    onEditar={clientes.iniciarEdicao}
                                    onAlterarStatus={clientes.solicitarAlteracaoStatus}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <ClienteFormModal
                aberto={clientes.modalAberto}
                cliente={clientes.clienteEmEdicao}
                salvando={clientes.salvando}
                erro={clientes.erro}
                onClose={clientes.fecharModal}
                onSave={clientes.salvarCliente}
                onClearError={clientes.limparErro}
            />

            <ClienteStatusModal
                cliente={clientes.clienteConfirmacao}
                acao={clientes.acaoConfirmacao}
                processando={clientes.inativandoId !== null}
                erro={clientes.erro}
                onClose={clientes.fecharConfirmacao}
                onConfirm={clientes.confirmarAlteracaoStatus}
            />
        </div>
    );
}

export default Clientes;
