import { useEffect, useMemo, useRef, useState } from "react";
import { calcularDiasUteisRestantes } from "../utils/filtroPrazo";
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
import OrdemServicoKanban from "../components/ordens/OrdemServicoKanban";
import OrdemServicoVisualizacoesSalvas, { type TipoVisualizacaoOrdens } from "../components/ordens/OrdemServicoVisualizacoesSalvas";
import { useOrdens } from "../hooks/useOrdens";

import type { NivelCriticidade } from "../types/api";

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
    const [visualizacao, setVisualizacao] = useState<TipoVisualizacaoOrdens>("cartoes");

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
                            <p>{ordensExibidas.length} resultado(s)</p>
                        </div>
                        <div className="ordens-list-header-actions">
                        <div className="ordens-prazo-filtro">
                            <label htmlFor="filtro-prazo">Prazo:</label>

                            <select
                                id="filtro-prazo"
                                value={filtroPrazo}
                                onChange={(evento) =>
                                    setFiltroPrazo(
                                        evento.target.value as FiltroPrazo,
                                    )
                                }
                            >
                                <option value="todos">Todos os prazos</option>
                                <option value="proximos3">
                                    1 a 3 dias úteis
                                </option>
                                <option value="proximos5">
                                    1 a 5 dias úteis
                                </option>
                                <option value="proximos7">
                                    1 a 7 dias úteis
                                </option>
                            </select>
                            </div>
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
                    ) : visualizacao === "kanban" ? (
                        <OrdemServicoKanban
                            ordens={ordensExibidas}
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
                            {ordensExibidas.map((ordem) => (
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
                statusSugerido={ordens.statusSolicitadoDetalhes}
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