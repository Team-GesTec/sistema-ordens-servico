import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import OrdemServicoDetalhesModal from "../components/ordens/OrdemServicoDetalhesModal";
import OrdemServicoFormModal from "../components/ordens/OrdemServicoFormModal";
import { useAnexosOrdem } from "../hooks/useAnexosOrdem";
import { useOrdens } from "../hooks/useOrdens";
/** Página de detalhes da O.S.; usa os mesmos serviços e controles já existentes na listagem. */
function OrdemServicoDetalhes() {
    const { id: idParam } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const ordens = useOrdens();
    const idProcessado = useRef<string | null>(null);
    const id = Number(idParam);
    const idValido = Number.isSafeInteger(id) && id > 0;
    const anexosOrdem = useAnexosOrdem(ordens.ordemSelecionada);

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
                        onAtribuirResponsavel={(funcionarioId) => void ordens.atribuirResponsavelOrdem(funcionarioId)}
                        onFechar={voltarParaOrdens}
                        onEditar={ordens.iniciarEdicao}
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
                        podeAlterarPrazo={ordens.podeGerenciar}
                        alterandoPrazo={ordens.alterandoPrazo}
                        onAlterarPrazo={ordens.alterarPrazoOrdem}
                    />
                </div>
            </main>
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

export default OrdemServicoDetalhes;
