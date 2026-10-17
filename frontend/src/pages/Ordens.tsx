import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import "../styles/autocomplete.css";
import "../styles/ordens.css";

import OrdensToolbar from "../components/ordens/OrdensToolbar";
import OrdemServicoAtivoModal from "../components/ordens/OrdemServicoAtivoModal";
import OrdemServicoCard from "../components/ordens/OrdemServicoCard";
import OrdemServicoDetalhesModal from "../components/ordens/OrdemServicoDetalhesModal";
import OrdemServicoFormModal from "../components/ordens/OrdemServicoFormModal";
import { useOrdens } from "../hooks/useOrdens";

function Ordens() {
    const ordens = useOrdens();

    return (
        <div className="layout">
            <main className="main">
                <div className="container ordens-container">
                    {ordens.mensagem && (
                        <div
                            className="ordens-feedback"
                            role="status"
                        >
                            {ordens.mensagem}
                        </div>
                    )}

                    {ordens.erro &&
                        !ordens.formularioAberto &&
                        !ordens.detalhesAbertos && (
                            <div
                                className="ordens-feedback ordens-feedback--error"
                                role="alert"
                            >
                                {ordens.erro}
                            </div>
                        )}

                    <OrdensToolbar
                        busca={ordens.busca}
                        onBuscaChange={ordens.setBusca}
                        filtroStatus={ordens.filtroStatus}
                        onFiltroStatusChange={ordens.setFiltroStatus}
                        ordens={
                            ordens.mostrarInativas
                                ? ordens.ordensInativas
                                : ordens.ordens
                        }

                        podeGerenciar={ordens.podeGerenciar}
                        mostrarInativas={ordens.mostrarInativas}
                        carregandoInativas={ordens.carregandoInativas}
                        onAlternarInativas={() => {
                            if (ordens.mostrarInativas) {
                                ordens.setMostrarInativas(false);
                            } else {
                                ordens.setMostrarInativas(true);
                                void ordens.carregarOrdensInativas();
                            }
                        }}

                        podeCriar={ordens.podeCriar}
                        onCadastrar={ordens.abrirCadastro}
                    />

                    {ordens.carregando ||
                    ordens.mostrarInativas && ordens.carregandoInativas ? (
                        <div className="ordens-empty" role="status">
                            Carregando ordens de serviço...
                            {ordens.mostrarInativas
                                ? "Carregando ordens inativas..."
                                : "Carregando ordens de serviço..."}
                        </div>
                    ) : ordens.ordensFiltradas.length === 0 ? (
                        <div className="ordens-empty">
                            {ordens.ordens.length === 0
                                ? "Nenhuma ordem de serviço cadastrada."
                                : "Nenhuma ordem corresponde à busca e aos filtros selecionados."}
                        </div>
                    ) : (
                        <div className="ordens-grid">
                            {ordens.ordensFiltradas.map((ordem) => (
                                <OrdemServicoCard
                                    key={ordem.id}
                                    ordem={ordem}
                                    onAlterarAtivo={ordens.solicitarAlteracaoAtivo}
                                    clientes={ordens.clientes}
                                    departamentos={ordens.departamentos}
                                    podeEditar={ordens.podeGerenciar}
                                    bloqueado={ordens.salvando}
                                    onAbrir={(selecionada) => {
                                        void ordens.abrirDetalhes(selecionada);
                                    }}
                                    onEditar={ordens.iniciarEdicao}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <OrdemServicoDetalhesModal
                aberto={ordens.detalhesAbertos}
                ordem={ordens.ordemSelecionada}
                carregando={ordens.carregandoDetalhes}
                erro={ordens.detalhesAbertos ? ordens.erro : null}
                podeEditar={ordens.podeGerenciar}
                clientes={ordens.clientes}
                departamentos={ordens.departamentos}
                onFechar={ordens.fecharDetalhes}
                onEditar={ordens.iniciarEdicao}
                podeAlterarStatus={ordens.podeAlterarStatus}
                alterandoStatusId={ordens.alterandoStatusId}
                onAlterarStatus={ordens.alterarStatusOrdem}
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
                podeCadastrarAntiga={ordens.podeGerenciar}
                onClose={ordens.fecharFormulario}
                onSave={ordens.salvarOrdem}
                onClearError={ordens.limparErro}
            />
        </div>
    );
}

export default Ordens;