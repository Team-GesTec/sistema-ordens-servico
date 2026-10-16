
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/filters.css";
import "../styles/cards.css";
import "../styles/details.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import "../styles/clientes.css";

import ClienteCard from "../components/clientes/ClienteCard";
import ClienteFormModal from "../components/clientes/ClienteFormModal";
import ClienteStatusModal from "../components/clientes/ClienteStatusModal";
import ClientesToolbar from "../components/clientes/ClientesToolbar";
import { useClientes } from "../hooks/useClientes";

function Clientes() {
    const clientes = useClientes();

    const modalStatusAberto = Boolean(
        clientes.clienteConfirmacao && clientes.acaoConfirmacao
    );

    return (
        <div className="layout">
            <main className="main">
                <div className="container clientes-container">
                    {clientes.mensagem && (
                        <div
                            className="clientes-feedback clientes-feedback--success"
                            role="status"
                        >
                            {clientes.mensagem}
                        </div>
                    )}

                    {clientes.erro &&
                        !clientes.modalAberto &&
                        !modalStatusAberto && (
                            <div
                                className="clientes-feedback clientes-feedback--error"
                                role="alert"
                            >
                                {clientes.erro}
                            </div>
                        )}

                    <ClientesToolbar
                        busca={clientes.busca}
                        onBuscaChange={clientes.setBusca}
                        filtroSituacao={clientes.filtroSituacao}
                        onFiltroChange={clientes.setFiltroSituacao}
                        clientes={clientes.clientesPorSituacao}
                        podeGerenciar={clientes.podeGerenciar}
                        onCadastrar={clientes.abrirCadastro}
                    />

                    {clientes.carregando ? (
                        <div className="clientes-empty">
                            Carregando clientes...
                        </div>
                    ) : (
                        <div className="clientes-grid">
                            {clientes.clientesFiltrados.length === 0 ? (
                                <div className="clientes-empty">
                                    {clientes.busca.trim()
                                        ? "Nenhum cliente corresponde à pesquisa e ao filtro selecionado."
                                        : clientes.filtroSituacao === "ativos"
                                          ? "Nenhum cliente ativo encontrado."
                                          : clientes.filtroSituacao === "inativos"
                                            ? "Nenhum cliente inativo encontrado."
                                            : "Nenhum cliente cadastrado."}
                                </div>
                            ) : (
                                clientes.clientesFiltrados.map((cliente) => (
                                    <ClienteCard
                                        key={cliente.id}
                                        cliente={cliente}
                                        podeGerenciar={clientes.podeGerenciar}
                                        bloqueado={
                                            clientes.salvando ||
                                            clientes.inativandoId !== null
                                        }
                                        onEditar={clientes.iniciarEdicao}
                                        onAlterarStatus={
                                            clientes.solicitarAlteracaoStatus
                                        }
                                    />
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            <aside className="details" />

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
