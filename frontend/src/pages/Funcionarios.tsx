import FuncionariosToolbar from "../components/funcionarios/FuncionariosToolbar";
import Pagination from "../components/common/Pagination";
import usePaginatedList from "../hooks/usePaginatedList";
import FuncionarioFormModal from "../components/funcionarios/FuncionarioFormModal";
import FuncionarioDetalhesModal from "../components/funcionarios/FuncionarioDetalhesModal";
import FuncionarioStatusModal from "../components/funcionarios/FuncionarioStatusModal";
import { useFuncionarios } from "../hooks/useFuncionarios";
import { getGestecAvatarTone, getGestecInitials } from "../utils/gestecAvatar";

function Funcionarios() {
    const funcionarios = useFuncionarios();
    const modalAberto = funcionarios.formularioAberto || funcionarios.detalhesAbertos || Boolean(funcionarios.confirmacaoStatus);
    const departamentoSelecionado = funcionarios.funcionarioSelecionado
        ? funcionarios.departamentosPorId.get(funcionarios.funcionarioSelecionado.departamento_id)
        : undefined;

    const todosFuncionarios = [...funcionarios.funcionariosAtivos, ...funcionarios.funcionariosInativos];
    const departamentosComEquipe = new Set(todosFuncionarios.map((item) => item.departamento_id)).size;
    const paginacaoFuncionarios = usePaginatedList(funcionarios.funcionariosFiltrados, 10);

    return (
        <div className="layout gestec-page-shell">
            <main className="main">
                <div className="container projetos-container funcionarios-container gestec-page-content">
                    <header className="projetos-page-header page-heading">
                        <div><p className="projetos-eyebrow eyebrow">GESTÃO DE PESSOAS</p><h1>Funcionários</h1><p className="projetos-subtitle">Gerencie os colaboradores, seus departamentos, perfis de acesso e disponibilidade.</p></div>
                        <div className="heading-actions">{funcionarios.podeGerenciar && <button type="button" className="projeto-btn-primary btn btn-primary" onClick={funcionarios.abrirCadastro}>＋ Novo funcionário</button>}</div>
                    </header>

                    {funcionarios.mensagem && !modalAberto && <div className="projetos-feedback projetos-feedback--success" role="status">{funcionarios.mensagem}</div>}
                    {funcionarios.erro && !funcionarios.detalhesAbertos && !funcionarios.confirmacaoStatus && <div className="projetos-feedback projetos-feedback--error" role="alert">{funcionarios.erro}</div>}

                    <section className="gestec-kpi-grid" aria-label="Indicadores de funcionários">
                        <article className="gestec-kpi-card"><span className="gestec-kpi-label">Colaboradores</span><strong>{todosFuncionarios.length}</strong><small>Registros disponíveis no escopo</small><span className="gestec-kpi-icon">♙</span></article>
                        <article className="gestec-kpi-card"><span className="gestec-kpi-label">Ativos</span><strong>{funcionarios.funcionariosAtivos.length}</strong><small>Contas ativas</small><span className="gestec-kpi-icon gestec-kpi-icon--green">✓</span></article>
                        <article className="gestec-kpi-card"><span className="gestec-kpi-label">Inativos</span><strong>{funcionarios.funcionariosInativos.length}</strong><small>Histórico preservado</small><span className="gestec-kpi-icon gestec-kpi-icon--amber">◷</span></article>
                        <article className="gestec-kpi-card"><span className="gestec-kpi-label">Departamentos com colaboradores</span><strong>{departamentosComEquipe}</strong><small>Contagem derivada dos funcionários</small><span className="gestec-kpi-icon gestec-kpi-icon--purple">▦</span></article>
                    </section>

                    <FuncionariosToolbar
                        funcionarios={funcionarios.funcionariosParaBusca}
                        departamentos={funcionarios.departamentos}
                        selecionadoId={funcionarios.funcionarioFiltroId}
                        onSelecionadoChange={(id) => { funcionarios.setFuncionarioFiltroId(id); if (id !== null) funcionarios.setBusca(""); paginacaoFuncionarios.setPage(1); }}
                        onBuscaChange={(busca) => { funcionarios.setBusca(busca); funcionarios.setFuncionarioFiltroId(null); paginacaoFuncionarios.setPage(1); }}
                        situacao={funcionarios.situacao}
                        onSituacaoChange={(situacao) => { funcionarios.setSituacao(situacao); funcionarios.setFuncionarioFiltroId(null); paginacaoFuncionarios.setPage(1); }}
                        perfil={funcionarios.perfil}
                        onPerfilChange={(perfil) => { funcionarios.setPerfil(perfil); paginacaoFuncionarios.setPage(1); }}
                        podeGerenciar={funcionarios.podeGerenciar}
                        carregando={funcionarios.carregandoOpcoes}
                    />

                    <section className="card table-card gestec-data-card" aria-labelledby="funcionarios-list-title">
                        <div className="gestec-table-heading"><div><h2 id="funcionarios-list-title">{funcionarios.situacao === "inativos" && funcionarios.podeGerenciar ? "Funcionários inativos" : funcionarios.situacao === "todos" && funcionarios.podeGerenciar ? "Todos os funcionários" : "Funcionários ativos"}</h2><p>Perfis de acesso e alocação por departamento.</p></div><span className="gestec-record-count">{funcionarios.funcionariosFiltrados.length} registro(s)</span></div>
                        {funcionarios.carregando ? (
                            <div className="projetos-empty" role="status"><span className="projetos-loading-mark" aria-hidden="true" />Carregando funcionários...</div>
                        ) : funcionarios.erro && funcionarios.funcionariosAtivos.length === 0 ? (
                            <div className="projetos-empty funcionarios-load-error"><strong>Não foi possível carregar os funcionários.</strong><p>{funcionarios.erro}</p><button type="button" className="projeto-btn-secondary" onClick={() => window.location.reload()}>Tentar novamente</button></div>
                        ) : funcionarios.funcionariosFiltrados.length === 0 ? (
                            <div className="projetos-empty"><strong>{funcionarios.situacao === "inativos" ? "Nenhum funcionário inativo encontrado" : "Nenhum funcionário encontrado"}</strong><p>{funcionarios.busca || funcionarios.funcionarioFiltroId !== null || funcionarios.perfil !== "todos" ? "Altere a pesquisa ou os filtros para ver outros resultados." : funcionarios.situacao === "inativos" ? "Não há funcionários inativos para consultar." : "Ainda não há funcionários que correspondam a esta situação."}</p></div>
                        ) : (
                            <div className="table-scroll gestec-table-scroll"><table className="table gestec-data-table">
                                <thead><tr><th>Colaborador</th><th>Cargo</th><th>Departamento</th><th>Status</th><th>Equipe</th><th className="gestec-actions-cell">Ações</th></tr></thead>
                                <tbody>{paginacaoFuncionarios.pageItems.map((funcionario, itemIndex) => {
                                    const departamento = funcionarios.departamentosPorId.get(funcionario.departamento_id);
                                    const ordemVisual = (paginacaoFuncionarios.page - 1) * 10 + itemIndex;
                                    const iniciais = getGestecInitials(funcionario.nome, "FU");
                                    const corAvatar = getGestecAvatarTone(ordemVisual);
                                    const colegasDepartamento = todosFuncionarios
                                        .filter((colega) => colega.departamento_id === funcionario.departamento_id)
                                        .slice(0, 3);
                                    const perfilLabel = funcionario.tipo === "gestor" ? "Gestor" : funcionario.tipo === "analista" ? "Analista / Líder" : "Técnico";
                                    return <tr
                                        key={funcionario.id}
                                        className="gestec-clickable-row"
                                        tabIndex={0}
                                        aria-label={`Abrir detalhes de ${funcionario.nome || `funcionário ${funcionario.id}`}`}
                                        onClick={() => void funcionarios.abrirDetalhes(funcionario)}
                                        onKeyDown={(event) => {
                                            if (event.target !== event.currentTarget) return;
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault();
                                                void funcionarios.abrirDetalhes(funcionario);
                                            }
                                        }}
                                    >
                                        <td><div className="gestec-entity-cell"><span className={`gestec-avatar gestec-avatar--${corAvatar}`}>{iniciais}</span><span><strong>{funcionario.nome || `Funcionário #${funcionario.id}`}</strong><small>{funcionario.usuario} · #{funcionario.id}</small></span></div></td>
                                        <td><span className={`gestec-role-pill role-${funcionario.tipo}`}>{perfilLabel}</span></td>
                                        <td>{departamento?.nome ?? `Departamento #${funcionario.departamento_id}`}</td>
                                        <td><span className={`gestec-status-pill ${funcionario.ativo ? "is-active" : "is-inactive"}`}><i aria-hidden="true" />{funcionario.ativo ? "Ativo" : "Inativo"}</span></td>
                                        <td><div className="gestec-team-avatars" aria-label={`Equipe do departamento ${departamento?.nome ?? funcionario.departamento_id}`}>
                                            {colegasDepartamento.map((colega, colegaIndex) => (
                                                <span key={colega.id} className={`gestec-team-avatar gestec-avatar--${getGestecAvatarTone(colegaIndex)}`} title={colega.nome}>{getGestecInitials(colega.nome, "FU")}</span>
                                            ))}
                                            {colegasDepartamento.length === 0 && <span className="gestec-muted">—</span>}
                                        </div></td>
                                        <td className="gestec-actions-cell"><div className="gestec-row-actions">
                                            {funcionarios.podeGerenciar && funcionario.ativo && <button type="button" className="gestec-icon-action" onClick={(event) => { event.stopPropagation(); funcionarios.iniciarEdicao(funcionario); }} disabled={funcionarios.salvando || funcionarios.alterandoStatusId !== null} aria-label={`Editar ${funcionario.nome}`} title="Editar">✎</button>}
                                            {funcionarios.podeGerenciar && funcionario.ativo && <button type="button" className="gestec-icon-action is-danger" onClick={(event) => { event.stopPropagation(); funcionarios.solicitarAlteracaoStatus(funcionario, "inativar"); }} disabled={funcionarios.salvando || funcionarios.alterandoStatusId !== null} aria-label={`Inativar ${funcionario.nome}`} title="Inativar">−</button>}
                                        </div></td>
                                    </tr>;
                                })}</tbody>
                            </table></div>
                        )}
                        {!funcionarios.carregando && funcionarios.funcionariosFiltrados.length > 0 && <footer className="gestec-table-footer"><span>Exibindo {paginacaoFuncionarios.pageItems.length} registro(s) nesta página de {funcionarios.funcionariosFiltrados.length}</span><span className="gestec-muted">Os resultados respeitam o perfil e os filtros selecionados.</span></footer>}
                    </section>
                    {!funcionarios.carregando && funcionarios.funcionariosFiltrados.length > 0 && (
                        <Pagination page={paginacaoFuncionarios.page} totalPages={paginacaoFuncionarios.totalPages} totalItems={funcionarios.funcionariosFiltrados.length} pageSize={10} onPageChange={paginacaoFuncionarios.setPage} />
                    )}
                </div>
            </main>

            <FuncionarioFormModal aberto={funcionarios.formularioAberto} funcionario={funcionarios.funcionarioEmEdicao} departamentos={funcionarios.departamentos} salvando={funcionarios.salvando} carregandoOpcoes={funcionarios.carregandoOpcoes} erro={funcionarios.erro} onClose={funcionarios.fecharFormulario} onSave={funcionarios.salvarFuncionario} />
            <FuncionarioDetalhesModal aberto={funcionarios.detalhesAbertos} funcionario={funcionarios.funcionarioSelecionado} departamento={departamentoSelecionado} carregando={funcionarios.carregandoDetalhe} erro={funcionarios.erro} podeGerenciar={funcionarios.podeGerenciar} onClose={funcionarios.fecharDetalhes} onEditar={funcionarios.iniciarEdicao} onAlterarStatus={funcionarios.solicitarAlteracaoStatus} />
            <FuncionarioStatusModal funcionario={funcionarios.confirmacaoStatus?.funcionario ?? null} acao={funcionarios.confirmacaoStatus?.acao ?? null} processando={funcionarios.alterandoStatusId !== null} erro={funcionarios.confirmacaoStatus ? funcionarios.erro : null} onClose={funcionarios.fecharConfirmacaoStatus} onConfirm={funcionarios.confirmarAlteracaoStatus} />
        </div>
    );
}

export default Funcionarios;
