import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import "../styles/autocomplete.css";
import "../styles/filters.css";
import "../styles/projetos.css";
import "../styles/clientes.css";
import "../styles/funcionarios.css";
import FuncionariosToolbar from "../components/funcionarios/FuncionariosToolbar";
import FuncionarioCard from "../components/funcionarios/FuncionarioCard";
import FuncionarioFormModal from "../components/funcionarios/FuncionarioFormModal";
import FuncionarioDetalhesModal from "../components/funcionarios/FuncionarioDetalhesModal";
import FuncionarioStatusModal from "../components/funcionarios/FuncionarioStatusModal";
import { useFuncionarios } from "../hooks/useFuncionarios";

function Funcionarios() {
    const funcionarios = useFuncionarios();
    const modalAberto = funcionarios.formularioAberto || funcionarios.detalhesAbertos || Boolean(funcionarios.confirmacaoStatus);
    const departamentoSelecionado = funcionarios.funcionarioSelecionado
        ? funcionarios.departamentosPorId.get(funcionarios.funcionarioSelecionado.departamento_id)
        : undefined;

    return (
        <div className="layout">
            <main className="main">
                <div className="container projetos-container funcionarios-container">
                    <header className="projetos-page-header">
                        <div>
                            <p className="projetos-eyebrow">GESTÃO DO SGOS</p>
                            <h1>Funcionários</h1>
                            <p className="projetos-subtitle">Gerencie colaboradores, perfis de acesso e departamentos, preservando o histórico operacional.</p>
                        </div>
                        {funcionarios.podeGerenciar && (
                            <button type="button" className="projeto-btn-primary" onClick={funcionarios.abrirCadastro}>+ Novo funcionário</button>
                        )}
                    </header>

                    {funcionarios.mensagem && !modalAberto && <div className="projetos-feedback projetos-feedback--success" role="status">{funcionarios.mensagem}</div>}
                    {funcionarios.erro && !funcionarios.detalhesAbertos && !funcionarios.confirmacaoStatus && <div className="projetos-feedback projetos-feedback--error" role="alert">{funcionarios.erro}</div>}

                    <FuncionariosToolbar
                        funcionarios={funcionarios.funcionariosParaBusca}
                        departamentos={funcionarios.departamentos}
                        selecionadoId={funcionarios.funcionarioFiltroId}
                        onSelecionadoChange={(id) => {
                            funcionarios.setFuncionarioFiltroId(id);
                            if (id !== null) funcionarios.setBusca("");
                        }}
                        onBuscaChange={(busca) => { funcionarios.setBusca(busca); funcionarios.setFuncionarioFiltroId(null); }}
                        situacao={funcionarios.situacao}
                        onSituacaoChange={(situacao) => {
                            funcionarios.setSituacao(situacao);
                            funcionarios.setFuncionarioFiltroId(null);
                        }}
                        perfil={funcionarios.perfil}
                        onPerfilChange={funcionarios.setPerfil}
                        podeGerenciar={funcionarios.podeGerenciar}
                        carregando={funcionarios.carregandoOpcoes}
                    />

                    <div className="projetos-list-header">
                        <div>
                            <h2>{funcionarios.situacao === "inativos" ? "Funcionários inativos" : funcionarios.situacao === "todos" ? "Todos os funcionários" : "Funcionários ativos"}</h2>
                            <p>{funcionarios.funcionariosFiltrados.length} resultado(s)</p>
                        </div>
                        {funcionarios.carregando && <span className="projetos-loading" role="status">Carregando…</span>}
                    </div>

                    {funcionarios.carregando ? (
                        <div className="projetos-empty" role="status"><span className="projetos-loading-mark" aria-hidden="true" />Carregando funcionários...</div>
                    ) : funcionarios.erro && funcionarios.funcionariosAtivos.length === 0 ? (
                        <div className="projetos-empty funcionarios-load-error"><strong>Não foi possível carregar os funcionários.</strong><p>{funcionarios.erro}</p><button type="button" className="projeto-btn-secondary" onClick={() => window.location.reload()}>Tentar novamente</button></div>
                    ) : funcionarios.funcionariosFiltrados.length === 0 ? (
                        <div className="projetos-empty">
                            <strong>{funcionarios.situacao === "inativos" ? "Nenhum funcionário inativo encontrado" : "Nenhum funcionário encontrado"}</strong>
                            <p>{funcionarios.busca || funcionarios.funcionarioFiltroId !== null || funcionarios.perfil !== "todos" ? "Altere a pesquisa ou os filtros para ver outros resultados." : funcionarios.situacao === "inativos" ? "Não há funcionários inativos para consultar." : "Ainda não há funcionários que correspondam a esta situação."}</p>
                        </div>
                    ) : (
                        <div className="projetos-grid funcionarios-grid">
                            {funcionarios.funcionariosFiltrados.map((funcionario) => (
                                <FuncionarioCard
                                    key={funcionario.id}
                                    funcionario={funcionario}
                                    departamento={funcionarios.departamentosPorId.get(funcionario.departamento_id)}
                                    podeGerenciar={funcionarios.podeGerenciar}
                                    bloqueado={funcionarios.salvando || funcionarios.alterandoStatusId !== null}
                                    onAbrir={(selecionado) => void funcionarios.abrirDetalhes(selecionado)}
                                    onEditar={funcionarios.iniciarEdicao}
                                    onDuplicar={funcionarios.duplicarFuncionario}
                                    onAlterarStatus={funcionarios.solicitarAlteracaoStatus}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <FuncionarioFormModal
                aberto={funcionarios.formularioAberto}
                funcionario={funcionarios.funcionarioEmEdicao}
                modoDuplicacao={funcionarios.modoDuplicacao}
                departamentos={funcionarios.departamentos}
                salvando={funcionarios.salvando}
                carregandoOpcoes={funcionarios.carregandoOpcoes}
                erro={funcionarios.erro}
                onClose={funcionarios.fecharFormulario}
                onSave={funcionarios.salvarFuncionario}
            />
            <FuncionarioDetalhesModal
                aberto={funcionarios.detalhesAbertos}
                funcionario={funcionarios.funcionarioSelecionado}
                departamento={departamentoSelecionado}
                carregando={funcionarios.carregandoDetalhe}
                erro={funcionarios.erro}
                podeGerenciar={funcionarios.podeGerenciar}
                onClose={funcionarios.fecharDetalhes}
                onEditar={funcionarios.iniciarEdicao}
                onAlterarStatus={funcionarios.solicitarAlteracaoStatus}
            />
            <FuncionarioStatusModal
                funcionario={funcionarios.confirmacaoStatus?.funcionario ?? null}
                acao={funcionarios.confirmacaoStatus?.acao ?? null}
                processando={funcionarios.alterandoStatusId !== null}
                erro={funcionarios.confirmacaoStatus ? funcionarios.erro : null}
                onClose={funcionarios.fecharConfirmacaoStatus}
                onConfirm={funcionarios.confirmarAlteracaoStatus}
            />
        </div>
    );
}

export default Funcionarios;
