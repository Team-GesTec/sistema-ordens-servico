/**
 * Página de O.S.: monta a toolbar, a grade de cards e os modais (detalhes, ativar/inativar e formulário)
 * a partir do estado do hook useOrdens. O cadastro de O.S. antiga (AJ-06) só é liberado para o gestor.
 * US#2.6: os anexos da O.S. aberta nos detalhes vêm do hook useAnexosOrdem.
 */

import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import "../styles/autocomplete.css";
import "../styles/details.css";
import "../styles/ordens.css";
import "../styles/projetos.css";

import OrdensToolbar from "../components/ordens/OrdensToolbar";
import OrdemServicoAtivoModal from "../components/ordens/OrdemServicoAtivoModal";
import OrdemServicoCard from "../components/ordens/OrdemServicoCard";
import OrdemServicoDetalhesModal from "../components/ordens/OrdemServicoDetalhesModal";
import OrdemServicoFormModal from "../components/ordens/OrdemServicoFormModal";
import { useOrdens } from "../hooks/useOrdens";
import { useAnexosOrdem } from "../hooks/useAnexosOrdem";

function Ordens() {
    const ordens = useOrdens();
    const anexosOrdem = useAnexosOrdem(ordens.detalhesAbertos ? ordens.ordemSelecionada : null);
    const [searchParams, setSearchParams] = useSearchParams();
    const idVisualizar = searchParams.get("visualizar");
    const idVisualizarProcessado = useRef<string | null>(null);

    useEffect(() => {
        if (!idVisualizar) {
            idVisualizarProcessado.current = null;
            return;
        }
        if (ordens.carregando || idVisualizarProcessado.current === idVisualizar) return;

        idVisualizarProcessado.current = idVisualizar;
        const id = Number(idVisualizar);
        if (Number.isSafeInteger(id) && id > 0) {
            void ordens.abrirDetalhesPorId(id);
        }

        // Consome o parâmetro uma única vez sem criar uma nova entrada no histórico.
        setSearchParams((atuais) => {
            const proximos = new URLSearchParams(atuais);
            proximos.delete("visualizar");
            return proximos;
        }, { replace: true });
    }, [idVisualizar, ordens.carregando, ordens.abrirDetalhesPorId, setSearchParams]);

    const fonteAtual = ordens.mostrarInativas ? ordens.ordensInativas : ordens.ordens;
    const carregamentoAtual = ordens.carregando || (ordens.mostrarInativas && ordens.carregandoInativas);

    return (
        <div className="layout">
            <main className="main ordens-main">
                <div className="container projetos-container ordens-container">
                    <header className="projetos-page-header">
                        <div>
                            <p className="projetos-eyebrow">GESTÃO DO SGOS</p>
                            <h1>Ordens de Serviço</h1>
                            <p className="projetos-subtitle">Acompanhe as ordens, prioridades, responsáveis e estados de atendimento.</p>
                        </div>
                        {ordens.podeCriar && (
                            <button type="button" className="projeto-btn-primary" onClick={ordens.abrirCadastro}>
                                + Nova ordem de serviço
                            </button>
                        )}
                    </header>

                    {ordens.mensagem && (
                        <div className="projetos-feedback projetos-feedback--success" role="status">
                            {ordens.mensagem}
                        </div>
                    )}
                    {ordens.erro && !ordens.formularioAberto && !ordens.detalhesAbertos && (
                        <div className="projetos-feedback projetos-feedback--error" role="alert">
                            {ordens.erro}
                        </div>
                    )}

                    <OrdensToolbar
                        busca={ordens.busca}
                        onBuscaChange={ordens.setBusca}
                        filtroStatus={ordens.filtroStatus}
                        onFiltroStatusChange={ordens.setFiltroStatus}
                        ordens={fonteAtual}
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
                    />

                    <div className="projetos-list-header">
                        <div>
                            <h2>{ordens.mostrarInativas ? "Ordens de serviço inativas" : "Ordens de serviço ativas"}</h2>
                            <p>{ordens.ordensFiltradas.length} resultado(s)</p>
                        </div>
                        {carregamentoAtual && <span className="projetos-loading" role="status">Carregando…</span>}
                    </div>

                    {carregamentoAtual ? (
                        <div className="projetos-empty" role="status">
                            <span className="projetos-loading-mark" aria-hidden="true" />
                            {ordens.mostrarInativas ? "Carregando ordens inativas..." : "Carregando ordens de serviço..."}
                        </div>
                    ) : ordens.ordensFiltradas.length === 0 ? (
                        <div className="projetos-empty">
                            <strong>{fonteAtual.length === 0
                                ? ordens.mostrarInativas ? "Nenhuma O.S. inativa cadastrada" : "Nenhuma O.S. cadastrada"
                                : "Nenhuma ordem corresponde à busca e aos filtros selecionados."}</strong>
                            <p>{fonteAtual.length === 0
                                ? ordens.mostrarInativas ? "Não há registros inativos para exibir." : "Cadastre uma ordem de serviço para começar."
                                : "Altere a pesquisa ou os filtros para ver outros resultados."}</p>
                        </div>
                    ) : (
                        <div className="projetos-grid ordens-grid">
                            {ordens.ordensFiltradas.map((ordem) => (
                                <OrdemServicoCard
                                    key={ordem.id}
                                    ordem={ordem}
                                    onAlterarAtivo={ordens.solicitarAlteracaoAtivo}
                                    clientes={ordens.clientes}
                                    departamentos={ordens.departamentos}
                                    podeEditar={ordens.podeGerenciar}
                                    bloqueado={ordens.salvando}
                                    onAbrir={(selecionada) => void ordens.abrirDetalhes(selecionada)}
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
                funcionarios={ordens.funcionariosConhecidos}
                funcionariosElegiveis={ordens.funcionariosAtivos}
                atribuindoResponsavel={ordens.atribuindoResponsavel}
                podeReatribuirResponsavel={ordens.podeGerenciar}
                onAtribuirResponsavel={(funcionarioId) => void ordens.atribuirResponsavelOrdem(funcionarioId)}
                onFechar={ordens.fecharDetalhes}
                onEditar={ordens.iniciarEdicao}
                podeAlterarStatus={ordens.podeAlterarStatus}
                alterandoStatusId={ordens.alterandoStatusId}
                onAlterarStatus={ordens.alterarStatusOrdem}
                podeAlterarPrazo={ordens.podeGerenciar}
                alterandoPrazo={ordens.alterandoPrazo}
                onAlterarPrazo={ordens.alterarPrazoOrdem}
                anexos={anexosOrdem.anexos}
                carregandoAnexos={anexosOrdem.carregandoAnexos}
                erroAnexos={anexosOrdem.erroAnexos}
                tiposPermitidos={anexosOrdem.tiposPermitidos}
                onEnviarAnexo={anexosOrdem.enviarAnexo}
                onBaixarAnexo={anexosOrdem.baixarAnexo}
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
