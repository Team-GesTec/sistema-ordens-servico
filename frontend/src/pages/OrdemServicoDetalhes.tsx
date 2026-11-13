import { useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import OrdemServicoDetalhesModal from "../components/ordens/OrdemServicoDetalhesModal";
import OrdemServicoFormModal from "../components/ordens/OrdemServicoFormModal";
import { useAnexosOrdem } from "../hooks/useAnexosOrdem";
import OrdemServicoAtivoModal from "../components/ordens/OrdemServicoAtivoModal";
import { useOrdens } from "../hooks/useOrdens";
import { useHorasOrdem } from "../hooks/useHorasOrdem";

/** Página de detalhes da O.S.; usa os mesmos serviços e controles já existentes na listagem. */
function OrdemServicoDetalhes() {
    const { id: idParam } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const ordens = useOrdens();
    const idProcessado = useRef<string | null>(null);
    const id = Number(idParam);
    const idValido = Number.isSafeInteger(id) && id > 0;
    const anexosOrdem = useAnexosOrdem(ordens.ordemSelecionada);
    const [temAlteracoesNaoSalvas, setTemAlteracoesNaoSalvas] = useState(false);
    const [confirmacaoSaidaAberta, setConfirmacaoSaidaAberta] = useState(false);

    const blocker = useBlocker(temAlteracoesNaoSalvas);

    useEffect(() => {
        if (blocker.state === "blocked") {
            setConfirmacaoSaidaAberta(true);
        }
    }, [blocker.state]);

    useEffect(() => {
        if (!temAlteracoesNaoSalvas) return;

        function avisarAntesDeSair(event: BeforeUnloadEvent) {
            event.preventDefault();
            event.returnValue = "";
        }

        window.addEventListener("beforeunload", avisarAntesDeSair);

        return () => {
            window.removeEventListener("beforeunload", avisarAntesDeSair);
        };
    }, [temAlteracoesNaoSalvas]);

    const horasOrdem = useHorasOrdem(ordens.ordemSelecionada);

    useEffect(() => {
        if (!idValido) {
            navigate("/ordens", { replace: true });
            return;
        }
        if (ordens.carregando || idProcessado.current === idParam) return;
        idProcessado.current = idParam ?? null;
        void ordens.abrirDetalhesPorId(id);
    }, [id, idParam, idValido, navigate, ordens.carregando, ordens.abrirDetalhesPorId]);

    function voltarParaOrdens() {
        ordens.fecharDetalhes();
        navigate("/ordens");
    }

    const ordem = ordens.ordemSelecionada;
    return (
        <div className="layout gestec-os-detail-layout">
            <main className="main ordens-main gestec-os-detail-main">
                <div className="container projetos-container ordens-container gestec-page-content gestec-os-detail-container">
                    <OrdemServicoDetalhesModal
                        aberto={true}
                        podeGerenciar={ordens.podeGerenciar}
                        inativandoId={ordens.inativandoId}
                        onAlterarAtivo={ordens.solicitarAlteracaoAtivo}
                        modoPagina={true}
                        ordem={ordem}
                        projetos={ordens.projetos}
                        carregando={ordens.carregando || ordens.carregandoDetalhes}
                        erro={ordens.erro}
                        podeEditar={ordens.podeOperarDepartamento}
                        clientes={ordens.clientes}
                        departamentos={ordens.departamentos}
                        funcionarios={ordens.funcionariosConhecidos}
                        funcionariosElegiveis={ordens.podeOperarDepartamento
                            ? ordens.funcionariosAtivos
                            : ordens.funcionariosAtivos.filter((funcionario) =>
                                funcionario.id === ordens.usuarioAtualId &&
                                funcionario.departamento_id === ordem?.departamento_id
                            )}
                        atribuindoResponsavel={ordens.atribuindoResponsavel}
                        podeReatribuirResponsavel={ordens.podeAtribuirResponsavel}
                        onAtribuirResponsavel={(funcionarioId) =>
                            ordens.atribuirResponsavelOrdem(funcionarioId)
                        }
                        onFechar={voltarParaOrdens}
                        onAlteracoesNaoSalvasChange={setTemAlteracoesNaoSalvas}
                        salvandoEdicaoDireta={ordens.salvando}
                        onSalvarEdicaoDireta={ordens.salvarEdicaoDireta}
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
                        horas={horasOrdem.horas}
                        carregandoHoras={horasOrdem.carregandoHoras}
                        erroHoras={horasOrdem.erroHoras}
                        onRegistrarHoras={horasOrdem.registrarHoras}
                        podeRegistrarHoras={ordens.podeRegistrarHoras}
                        podeAlterarPrazo={ordens.podeGerenciar}
                        alterandoPrazo={ordens.alterandoPrazo}
                        onAlterarPrazo={ordens.alterarPrazoOrdem}
                    />
                </div>
            </main>

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
                ordem={null}
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

            {confirmacaoSaidaAberta && blocker.state === "blocked" && (
                <div className="projeto-modal-overlay" role="presentation">
                    <section
                        className="projeto-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="ordem-confirmar-saida"
                    >
                        <h2 id="ordem-confirmar-saida">Alterações não salvas</h2>

                        <p>
                            Você tem alterações que ainda não foram salvas.
                            Deseja descartá-las?
                        </p>

                        <footer className="projeto-modal-actions">
                            <button
                                type="button"
                                className="projeto-btn-secondary"
                                onClick={() => {
                                    setConfirmacaoSaidaAberta(false);
                                    blocker.reset();
                                }}
                            >
                                Continuar editando
                            </button>

                            <button
                                type="button"
                                className="projeto-btn-primary"
                                onClick={() => {
                                    setConfirmacaoSaidaAberta(false);
                                    blocker.proceed();
                                }}
                            >
                                Descartar alterações
                            </button>
                        </footer>
                    </section>
                </div>
            )}

        </div>
    );
}

export default OrdemServicoDetalhes;
