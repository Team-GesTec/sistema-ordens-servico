import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import "../styles/autocomplete.css";
import "../styles/ordens.css";
import "../styles/projetos.css";

import OrdensToolbar from "../components/ordens/OrdensToolbar";
import OrdemServicoAtivoModal from "../components/ordens/OrdemServicoAtivoModal";
import OrdemServicoCard from "../components/ordens/OrdemServicoCard";
import OrdemServicoDetalhesModal from "../components/ordens/OrdemServicoDetalhesModal";
import OrdemServicoFormModal from "../components/ordens/OrdemServicoFormModal";
import OrdemServicoKanban from "../components/ordens/OrdemServicoKanban";
import OrdemServicoVisualizacoesSalvas, { type TipoVisualizacaoOrdens } from "../components/ordens/OrdemServicoVisualizacoesSalvas";
import { useOrdens } from "../hooks/useOrdens";

function Ordens() {
    const ordens = useOrdens();
    const [visualizacao, setVisualizacao] = useState<TipoVisualizacaoOrdens>("cartoes");
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
                        funcionarios={ordens.funcionariosConhecidos}
                        filtroResponsavelId={ordens.filtroResponsavelId}
                        onFiltroResponsavelChange={ordens.setFiltroResponsavelId}
                        onLimparFiltros={() => {
                            ordens.setBusca("");
                            ordens.setFiltroStatus("todos");
                            ordens.setFiltroResponsavelId("todos");
                        }}
                        temFiltrosAplicados={Boolean(
                            ordens.busca.trim() ||
                            ordens.filtroStatus !== "todos" ||
                            ordens.filtroResponsavelId !== "todos"
                        )}
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
                        onExportarCSV={() => void ordens.exportarCSV()}
                        exportandoCSV={ordens.exportandoCsv}
                        onExportarXLSX={() => void ordens.exportarXLSX()}
                        exportandoXLSX={ordens.exportandoXlsx}
                        visualizacoesSalvas={
                            <OrdemServicoVisualizacoesSalvas
                                usuarioId={ordens.usuarioAtualId}
                                busca={ordens.busca}
                                status={ordens.filtroStatus}
                                responsavelId={ordens.filtroResponsavelId}
                                visualizacao={visualizacao}
                                        onAplicar={(salva) => {
                                    ordens.setBusca(salva.busca);
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
                            <p>{ordens.ordensFiltradas.length} resultado(s)</p>
                        </div>
                        <div className="ordens-list-header-actions">
                            <div className="ordens-view-switch" role="group" aria-label="Visualização das ordens de serviço">
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
                    ) : ordens.ordensFiltradas.length === 0 ? (
                        <div className="projetos-empty">
                            <strong>{fonteAtual.length === 0
                                ? ordens.mostrarInativas ? "Nenhuma O.S. inativa cadastrada" : "Nenhuma O.S. cadastrada"
                                : "Nenhuma ordem corresponde à busca e aos filtros selecionados."}</strong>
                            <p>{fonteAtual.length === 0
                                ? ordens.mostrarInativas ? "Não há registros inativos para exibir." : "Cadastre uma ordem de serviço para começar."
                                : "Altere a pesquisa ou os filtros para ver outros resultados."}</p>
                        </div>
                    ) : visualizacao === "kanban" ? (
                        <OrdemServicoKanban
                            ordens={ordens.ordensFiltradas}
                            clientes={ordens.clientes}
                            departamentos={ordens.departamentos}
                            funcionarios={ordens.funcionariosConhecidos}
                            podeEditar={ordens.podeOperarDepartamento}
                            bloqueado={ordens.salvando || ordens.alterandoStatusId !== null}
                            podeMoverParaStatus={ordens.podeMoverOrdemParaStatus}
                            onAbrir={(selecionada) => void ordens.abrirDetalhes(selecionada)}
                            onEditar={ordens.iniciarEdicao}
                            onAlterarAtivo={ordens.solicitarAlteracaoAtivo}
                            onMoverStatus={ordens.moverOrdemKanban}
                        />
                    ) : (
                        <div className="projetos-grid ordens-grid">
                            {ordens.ordensFiltradas.map((ordem) => (
                                <OrdemServicoCard
                                    key={ordem.id}
                                    ordem={ordem}
                                    onAlterarAtivo={ordens.solicitarAlteracaoAtivo}
                                    clientes={ordens.clientes}
                                    departamentos={ordens.departamentos}
                                    funcionarios={ordens.funcionariosConhecidos}
                                    podeEditar={ordens.podeOperarDepartamento}
                                    bloqueado={ordens.salvando || ordens.alterandoStatusId === ordem.id}
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
                podeEditar={ordens.podeOperarDepartamento}
                podeDuplicar={ordens.podeDuplicarOrdem}
                onDuplicar={ordens.duplicarOrdem}
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
                alterandoStatusId={ordens.alterandoStatusId}
                onAlterarStatus={ordens.alterarStatusOrdem}
                podeSalvarParecerTecnico={ordens.podeSalvarParecerTecnico}
                salvandoParecerTecnicoId={ordens.salvandoParecerTecnicoId}
                onSalvarParecerTecnico={ordens.salvarParecerTecnicoOrdem}
                onBaixarPDF={(id) => void ordens.baixarRelatorioPDF(id)}
                baixandoRelatorioId={ordens.baixandoRelatorioId}
                statusSugerido={ordens.statusSolicitadoDetalhes}
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
                ordemParaDuplicar={ordens.ordemParaDuplicar}
                clientes={ordens.clientes}
                departamentos={ordens.departamentos}
                projetos={ordens.projetos}
                salvando={ordens.salvando}
                erro={ordens.formularioAberto ? ordens.erro : null}
                carregandoOpcoes={ordens.carregando}
                podeCadastrarAntiga={ordens.podeGerenciar}
                podeConfigurarPrazoInstalacao={ordens.podeOperarDepartamento}
                onClose={ordens.fecharFormulario}
                onSave={ordens.salvarOrdem}
                onClearError={ordens.limparErro}
            />
        </div>
    );
}

export default Ordens;
