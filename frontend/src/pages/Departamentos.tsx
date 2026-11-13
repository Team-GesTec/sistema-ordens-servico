
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import FilterDrawer from "../components/common/FilterDrawer";
import Pagination from "../components/common/Pagination";
import usePaginatedList from "../hooks/usePaginatedList";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../services/api";
import { getStoredUser } from "../services/auth";
import { departamentoService } from "../services/departamento";
import { funcionarioService } from "../services/funcionario";
import DepartamentoDetalhesModal from "../components/departamentos/DepartamentoDetalhesModal";
import type { Departamento, Funcionario, VisaoEquipe } from "../types/api";

function mensagemErro(error: unknown, fallback: string): string {
    if (error instanceof ApiError) return error.message;
    return error instanceof Error && error.message ? error.message : fallback;
}

function iniciais(nome: string): string {
    return nome.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toLocaleUpperCase("pt-BR") ?? "").join("") || "?";
}

export default function Departamentos() {
    const [searchParams, setSearchParams] = useSearchParams();
    const departamentoVisualizadoId = Number(searchParams.get("visualizar"));
    const modoVisualizacao = searchParams.has("visualizar") && Number.isSafeInteger(departamentoVisualizadoId) && departamentoVisualizadoId > 0;
    const usuario = getStoredUser();
    const podeGerenciar = usuario?.tipo === "gestor";

    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [mostrarInativos, setMostrarInativos] = useState(false);
    const [departamentoSelecionado, setDepartamentoSelecionado] = useState<Departamento | null>(null);
    const [visaoDetalhe, setVisaoDetalhe] = useState<VisaoEquipe | null>(null);
    const [resumosDepartamentos, setResumosDepartamentos] = useState<Record<number, VisaoEquipe | null>>({});
    const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
    const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
    const [busca, setBusca] = useState("");
    const [incluirHistorico, setIncluirHistorico] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [modalAberto, setModalAberto] = useState(false);
    const [departamentoEditando, setDepartamentoEditando] = useState<Departamento | null>(null);
    const [nome, setNome] = useState("");
    const [responsavelId, setResponsavelId] = useState("");
    const [responsaveisDisponiveis, setResponsaveisDisponiveis] = useState<Funcionario[]>([]);
    const [carregandoResponsaveis, setCarregandoResponsaveis] = useState(false);
    const [responsavelCarregado, setResponsavelCarregado] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [departamentoConfirmacao, setDepartamentoConfirmacao] = useState<Departamento | null>(null);
    const [novoEstadoConfirmacao, setNovoEstadoConfirmacao] = useState<boolean | null>(null);

    const departamentosComResponsavel = departamentos.filter((item) => item.responsavel_id !== null).length;
    const departamentosSemResponsavel = departamentos.length - departamentosComResponsavel;
    const percentualComResponsavel = departamentos.length > 0
        ? `${Math.round((departamentosComResponsavel / departamentos.length) * 100)}%`
        : "—";

    const carregarDepartamentos = useCallback(async () => {
        setCarregando(true);
        try {
            const lista = mostrarInativos
                ? await departamentoService.listarInativos()
                : await departamentoService.listar();

            setDepartamentos(lista);
            setErro(null);
        } catch (error) {
            setErro(mensagemErro(error, "Não foi possível carregar os departamentos."));
        } finally {
            setCarregando(false);
        }
    }, [mostrarInativos]);

    useEffect(() => {
        void carregarDepartamentos();
    }, [carregarDepartamentos]);
    function solicitarAlteracaoAtivo(departamento: Departamento) {
        setDepartamentoConfirmacao(departamento);
        setNovoEstadoConfirmacao(!departamento.ativo);
        setErro(null);
        setMensagem(null);
    }

    async function confirmarAlteracaoAtivo() {
        if (!departamentoConfirmacao || novoEstadoConfirmacao === null) return;

        const departamento = departamentoConfirmacao;
        const novoEstado = novoEstadoConfirmacao;
        const acao = novoEstado ? "reativar" : "inativar";

        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            await departamentoService.alterarAtivo(departamento.id, novoEstado);

            setMensagem(
                `Departamento ${novoEstado ? "reativado" : "inativado"} com sucesso.`
            );

            setDepartamentoConfirmacao(null);
            setNovoEstadoConfirmacao(null);

            await carregarDepartamentos();
        } catch (error) {
            setErro(mensagemErro(error, `Não foi possível ${acao} o departamento.`));
        } finally {
            setSalvando(false);
        }
    }

    const departamentosExibidos = useMemo(() => {
        const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

        return departamentos.filter((item) => {
            if (modoVisualizacao && item.id !== departamentoVisualizadoId) return false;
            if (!termo) return true;

            return item.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(termo)
                || String(item.id).includes(termo);
        }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }, [departamentos, busca, modoVisualizacao, departamentoVisualizadoId]);

    const paginacaoDepartamentos = usePaginatedList(departamentosExibidos, 10);
    const idsPaginaDepartamentos = paginacaoDepartamentos.pageItems.map((item) => item.id).join(",");

    // Reutiliza o endpoint de visão da equipe para exibir somente vínculos reais nos cards.
    useEffect(() => {
        const ids = idsPaginaDepartamentos ? idsPaginaDepartamentos.split(",").map(Number) : [];
        const pendentes = ids
            .filter((id) => !Object.prototype.hasOwnProperty.call(resumosDepartamentos, id))
            .map((id) => departamentos.find((item) => item.id === id))
            .filter((item): item is Departamento => item !== undefined);

        if (pendentes.length === 0) return;

        let vigente = true;

        void Promise.all(pendentes.map(async (item): Promise<[number, VisaoEquipe | null]> => {
            try {
                return [item.id, await departamentoService.buscarEquipe(item.id)];
            } catch {
                return [item.id, null];
            }
        })).then((resultados) => {
            if (!vigente) return;

            const novosResumos = resultados.reduce<Record<number, VisaoEquipe | null>>((acumulados, [id, visao]) => {
                acumulados[id] = visao;
                return acumulados;
            }, {});

            setResumosDepartamentos((atuais) => ({ ...atuais, ...novosResumos }));
        });

        return () => {
            vigente = false;
        };
    }, [idsPaginaDepartamentos, departamentos, resumosDepartamentos]);

    const departamentoSelecionadoId = departamentoSelecionado?.id ?? null;

    useEffect(() => {
        if (departamentoSelecionadoId === null) {
            setVisaoDetalhe(null);
            setCarregandoDetalhe(false);
            setErroDetalhe(null);
            return;
        }

        let vigente = true;

        setCarregandoDetalhe(true);
        setVisaoDetalhe(null);
        setErroDetalhe(null);

        void departamentoService.buscarEquipe(departamentoSelecionadoId, incluirHistorico)
            .then((visao) => {
                if (vigente) setVisaoDetalhe(visao);
            })
            .catch((error: unknown) => {
                if (vigente) setErroDetalhe(mensagemErro(error, "Não foi possível carregar os detalhes deste departamento."));
            })
            .finally(() => {
                if (vigente) setCarregandoDetalhe(false);
            });

        return () => {
            vigente = false;
        };
    }, [departamentoSelecionadoId, incluirHistorico]);

    // Links internos para ?visualizar=ID também permitem abrir departamentos inativos.
    useEffect(() => {
        if (
            !modoVisualizacao ||
            carregando ||
            departamentoSelecionadoId === departamentoVisualizadoId
        ) return;

        const departamento = departamentos.find(
            (item) => item.id === departamentoVisualizadoId
        );

        if (departamento) {
            setDepartamentoSelecionado(departamento);
            return;
        }

        let vigente = true;

        void departamentoService.buscarPorId(departamentoVisualizadoId)
            .then((resultado) => {
                if (vigente) setDepartamentoSelecionado(resultado);
            })
            .catch((error: unknown) => {
                if (vigente) {
                    setErro(mensagemErro(error, "Não foi possível localizar este departamento."));
                }
            });

        return () => {
            vigente = false;
        };
    }, [
        modoVisualizacao,
        carregando,
        departamentoVisualizadoId,
        departamentos,
        departamentoSelecionadoId,
    ]);

    function abrirDetalhes(departamento: Departamento) {
        setErroDetalhe(null);
        setDepartamentoSelecionado(departamento);
    }

    function fecharDetalhes() {
        setDepartamentoSelecionado(null);
        if (modoVisualizacao) setSearchParams({}, { replace: true });
    }

    function alternarHistorico(checked: boolean) {
        setIncluirHistorico(checked);
    }

    function abrirCadastro() {
        if (!podeGerenciar || salvando) return;

        setDepartamentoEditando(null);
        setNome("");
        setResponsavelId("");
        setResponsaveisDisponiveis([]);
        setResponsavelCarregado(false);
        setErro(null);
        setMensagem(null);
        setModalAberto(true);
    }

    function abrirEdicao(departamento: Departamento) {
        if (!podeGerenciar || salvando) return;

        setDepartamentoEditando(departamento);
        setNome(departamento.nome);
        setResponsavelId(departamento.responsavel_id === null ? "" : String(departamento.responsavel_id));
        setResponsaveisDisponiveis([]);
        setResponsavelCarregado(false);
        setErro(null);
        setMensagem(null);
        setModalAberto(true);
    }

    useEffect(() => {
        if (!modalAberto || !departamentoEditando) return;

        let vigente = true;
        setCarregandoResponsaveis(true);

        void funcionarioService.listar().then((funcionarios) => {
            if (!vigente) return;

            setResponsaveisDisponiveis(funcionarios.filter((item) =>
                item.ativo && item.tipo === "analista" && item.departamento_id === departamentoEditando.id,
            ));
            setResponsavelCarregado(true);
        }).catch((error: unknown) => {
            if (!vigente) return;

            setErro(mensagemErro(error, "Não foi possível carregar os responsáveis disponíveis. O responsável atual será preservado."));
            setResponsavelCarregado(false);
        }).finally(() => {
            if (vigente) setCarregandoResponsaveis(false);
        });

        return () => {
            vigente = false;
        };
    }, [modalAberto, departamentoEditando]);

    function fecharModal() {
        if (salvando) return;

        setModalAberto(false);
        setDepartamentoEditando(null);
        setErro(null);
    }

    async function salvar(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!podeGerenciar || salvando) return;

        const nomeValidado = nome.trim();

        if (!nomeValidado) {
            setErro("Informe o nome do departamento.");
            return;
        }

        if (nomeValidado.length > 100) {
            setErro("O nome do departamento deve ter no máximo 100 caracteres.");
            return;
        }

        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            const salvo = departamentoEditando
                ? await departamentoService.atualizar(departamentoEditando.id, {
                    nome: nomeValidado,
                    ...(responsavelCarregado ? { responsavel_id: responsavelId === "" ? null : Number(responsavelId) } : {}),
                })
                : await departamentoService.criar({ nome: nomeValidado, responsavel_id: null });

            setModalAberto(false);
            setDepartamentoEditando(null);
            setMensagem(departamentoEditando ? `Departamento "${salvo.nome}" atualizado.` : `Departamento "${salvo.nome}" cadastrado.`);
            await carregarDepartamentos();
        } catch (error) {
            setErro(mensagemErro(error, "Não foi possível salvar o departamento."));
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="layout">
            <main className="main">
                <div className="container projetos-container gestec-page-content">
                    <header className="projetos-page-header page-heading">
                        <div>
                            <p className="projetos-eyebrow eyebrow">ESTRUTURA ORGANIZACIONAL</p>
                            <h1>{modoVisualizacao ? "Departamento" : "Departamentos"}</h1>
                            <p className="projetos-subtitle">
                                Organize a estrutura da empresa e consulte os responsáveis, integrantes e ordens relacionadas dentro do seu escopo autorizado.
                            </p>
                        </div>

                        <div className="heading-actions">
                            {modoVisualizacao
                                ? <Link to="/departamentos" className="projeto-btn-secondary btn btn-secondary">Voltar à lista</Link>
                                : podeGerenciar && <button type="button" className="projeto-btn-primary btn btn-primary" onClick={abrirCadastro}>＋ Novo departamento</button>}
                        </div>
                    </header>

                    {mensagem && <div className="projetos-feedback projetos-feedback--success" role="status">{mensagem}</div>}
                    {erro && !modalAberto && <div className="projetos-feedback projetos-feedback--error" role="alert">{erro}</div>}

                    {!modoVisualizacao && (
                        <section className="gestec-kpi-grid" aria-label="Indicadores de departamentos">
                            <article className="gestec-kpi-card">
                                <span className="gestec-kpi-label">Departamentos</span>
                                <strong>{departamentos.length}</strong>
                                <small>Total carregado pela API</small>
                                <span className="gestec-kpi-icon">▦</span>
                            </article>
                            <article className="gestec-kpi-card">
                                <span className="gestec-kpi-label">Com responsável</span>
                                <strong>{departamentosComResponsavel}</strong>
                                <small>Responsável vinculado</small>
                                <span className="gestec-kpi-icon gestec-kpi-icon--green">✓</span>
                            </article>
                            <article className="gestec-kpi-card">
                                <span className="gestec-kpi-label">Sem responsável</span>
                                <strong>{departamentosSemResponsavel}</strong>
                                <small>Precisam de atribuição</small>
                                <span className="gestec-kpi-icon gestec-kpi-icon--amber">◷</span>
                            </article>
                            <article className="gestec-kpi-card">
                                <span className="gestec-kpi-label">Com responsável</span>
                                <strong>{percentualComResponsavel}</strong>
                                <small>Percentual da estrutura cadastrada</small>
                                <span className="gestec-kpi-icon gestec-kpi-icon--purple">%</span>
                            </article>
                        </section>
                    )}

                    {!modoVisualizacao && (
                        <section className="projetos-toolbar gestec-search-toolbar" aria-label="Pesquisa e filtros de departamentos">
                            <div className="gestec-search-toolbar-row departamentos-search-toolbar-row">
                                <div className="projetos-search-wrap">
                                    <label htmlFor="departamentos-busca">Pesquisar departamentos</label>
                                    <input
                                        id="departamentos-busca"
                                        className="projetos-search"
                                        type="search"
                                        value={busca}
                                        onChange={(event) => {
                                            setBusca(event.target.value);
                                            paginacaoDepartamentos.setPage(1);
                                        }}
                                        placeholder="Nome ou número do departamento..."
                                    />
                                </div>

                                <FilterDrawer activeCount={incluirHistorico ? 1 : 0} onClear={() => setIncluirHistorico(false)}>
                                    <label className="gestec-filter-toggle">
                                        <span>
                                            <strong>Incluir histórico/inativos</strong>
                                            <small>Usado para consultar detalhes do departamento no escopo permitido.</small>
                                        </span>
                                        <input type="checkbox" checked={incluirHistorico} onChange={(event) => alternarHistorico(event.target.checked)} />
                                        <span className="gestec-toggle-track" aria-hidden="true"><span /></span>
                                    </label>
                                </FilterDrawer>
                            </div>

                            {podeGerenciar && (
                                <div className="projetos-filter">
                                    <button
                                        type="button"
                                        className={!mostrarInativos ? "projeto-btn-primary" : "projeto-btn-secondary"}
                                        onClick={() => {
                                            setMostrarInativos(false);
                                            paginacaoDepartamentos.setPage(1);
                                        }}
                                    >
                                        Ativos
                                    </button>
                                    <button
                                        type="button"
                                        className={mostrarInativos ? "projeto-btn-primary" : "projeto-btn-secondary"}
                                        onClick={() => {
                                            setMostrarInativos(true);
                                            paginacaoDepartamentos.setPage(1);
                                        }}
                                    >
                                        Inativos
                                    </button>
                                </div>
                            )}

                            <span className="projeto-count-badge">
                                {departamentosExibidos.length} departamento(s)
                            </span>
                        </section>
                    )}

                    <div className="projetos-list-header">
                        <div>
                            <h2>{modoVisualizacao ? "Departamento selecionado" : "Departamentos cadastrados"}</h2>
                            <p>{departamentosExibidos.length} resultado(s)</p>
                        </div>
                    </div>

                    {carregando ? (
                        <div className="projetos-empty" role="status">
                            <span className="projetos-loading-mark" aria-hidden="true" />
                            Carregando departamentos…
                        </div>
                    ) : departamentosExibidos.length === 0 ? (
                        <div className="projetos-empty">
                            <strong>{modoVisualizacao ? "Departamento não encontrado" : "Nenhum departamento encontrado"}</strong>
                            <p>{modoVisualizacao ? "O departamento não existe ou não está no escopo autorizado." : "Ajuste a pesquisa ou cadastre um departamento."}</p>
                        </div>
                    ) : (
                        <>
                            <div className="projetos-grid equipes-integradas-grid">
                                {paginacaoDepartamentos.pageItems.map((departamento) => {
                                    const resumoSolicitado = Object.prototype.hasOwnProperty.call(resumosDepartamentos, departamento.id);
                                    const resumo = resumosDepartamentos[departamento.id];
                                    const membros = resumo?.funcionarios ?? [];
                                    const lider = membros.find((item) => item.id === departamento.responsavel_id);
                                    const quantidadeMembros = resumo ? membros.length : "—";
                                    const quantidadeOrdens = resumo ? resumo.ordens_servico.length : "—";

                                    return (
                                        <article
                                            key={departamento.id}
                                            className="projeto-card gestec-department-card gestec-clickable-card"
                                            tabIndex={0}
                                            aria-label={`Abrir detalhes do departamento ${departamento.nome}`}
                                            onClick={() => abrirDetalhes(departamento)}
                                            onKeyDown={(event) => {
                                                if (event.target !== event.currentTarget) return;
                                                if (event.key === "Enter" || event.key === " ") {
                                                    event.preventDefault();
                                                    abrirDetalhes(departamento);
                                                }
                                            }}
                                        >
                                            <header className="gestec-department-card-top">
                                                <span className="gestec-department-mark" aria-hidden="true">
                                                    {iniciais(departamento.nome)}
                                                </span>
                                                <span className="projeto-status">
                                                    {departamento.ativo ? "Ativo" : "Inativo"}
                                                </span>

                                                {podeGerenciar && (
                                                    <button
                                                        type="button"
                                                        className="gestec-department-more"
                                                        aria-label={`Editar departamento ${departamento.nome}`}
                                                        title="Editar departamento"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            abrirEdicao(departamento);
                                                        }}
                                                        disabled={salvando}
                                                    >
                                                        <i className="fa-solid fa-ellipsis" aria-hidden="true" />
                                                    </button>
                                                )}
                                            </header>

                                            <div className="gestec-department-heading">
                                                <h3>{departamento.nome}</h3>
                                                <p>Estrutura operacional</p>
                                            </div>

                                            <section className="gestec-department-leader" aria-label="Líder da equipe">
                                                <span className="gestec-department-label">Líder da equipe</span>
                                                <div className="gestec-department-leader-person">
                                                    {lider && (
                                                        <span className="gestec-department-leader-avatar" aria-hidden="true">
                                                            {iniciais(lider.nome)}
                                                        </span>
                                                    )}
                                                    <strong>
                                                        {lider?.nome ?? (departamento.responsavel_id ? `Funcionário #${departamento.responsavel_id}` : "Não definido")}
                                                    </strong>
                                                </div>
                                            </section>

                                            <div className="gestec-department-stats">
                                                <div><strong>{quantidadeMembros}</strong><span>membros</span></div>
                                                <div><strong>{quantidadeOrdens}</strong><span>ordens vinculadas</span></div>
                                            </div>

                                            <footer className="gestec-department-card-footer">
                                                <div
                                                    className="gestec-department-avatars"
                                                    aria-label={!resumoSolicitado ? "Carregando vínculos" : resumo ? `${membros.length} membros vinculados` : "Vínculos não disponíveis"}
                                                >
                                                    {membros.slice(0, 3).map((membro, index) => (
                                                        <span
                                                            key={membro.id}
                                                            className={`gestec-department-avatar gestec-department-avatar--${index + 1}`}
                                                            title={membro.nome}
                                                        >
                                                            {iniciais(membro.nome)}
                                                        </span>
                                                    ))}
                                                    {membros.length > 3 && (
                                                        <span className="gestec-department-avatar gestec-department-avatar--more">
                                                            +{membros.length - 3}
                                                        </span>
                                                    )}
                                                    {!resumoSolicitado && (
                                                        <span className="gestec-department-avatar gestec-department-avatar--loading" aria-label="Carregando membros">…</span>
                                                    )}
                                                    {resumoSolicitado && !resumo && (
                                                        <span className="gestec-department-avatar gestec-department-avatar--unavailable" title="Não foi possível carregar os vínculos">—</span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    className="gestec-department-orders-link"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        abrirDetalhes(departamento);
                                                    }}
                                                >
                                                    Ver ordens <span aria-hidden="true">→</span>
                                                </button>

                                                {podeGerenciar && (
                                                    <button
                                                        type="button"
                                                        className="projeto-btn-secondary"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            solicitarAlteracaoAtivo(departamento);
                                                        }}
                                                        disabled={salvando}
                                                    >
                                                        {departamento.ativo ? "Inativar" : "Reativar"}
                                                    </button>
                                                )}
                                            </footer>
                                        </article>
                                    );
                                })}
                            </div>

                            {!modoVisualizacao && departamentosExibidos.length > 0 && (
                                <Pagination
                                    page={paginacaoDepartamentos.page}
                                    totalPages={paginacaoDepartamentos.totalPages}
                                    totalItems={departamentosExibidos.length}
                                    pageSize={10}
                                    onPageChange={paginacaoDepartamentos.setPage}
                                />
                            )}
                        </>
                    )}

                    <p className="equipes-note">
                        Departamentos inativos deixam de aparecer nas listagens operacionais,
                        mas seus registros e vínculos históricos são preservados.
                    </p>
                </div>
            </main>

            <DepartamentoDetalhesModal
                departamento={departamentoSelecionado}
                visao={visaoDetalhe}
                carregando={carregandoDetalhe}
                erro={erroDetalhe}
                incluirHistorico={incluirHistorico}
                podeEditar={podeGerenciar && departamentoSelecionado !== null}
                onClose={fecharDetalhes}
                onEditar={(departamento) => {
                    fecharDetalhes();
                    abrirEdicao(departamento);
                }}
            />

            {modalAberto && (
                <div
                    className="projeto-modal-overlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) fecharModal();
                    }}
                >
                    <section className="projeto-modal projeto-form-modal" role="dialog" aria-modal="true" aria-labelledby="departamento-modal-title">
                        <header className="projeto-modal-header">
                            <div>
                                <p className="projetos-eyebrow">GESTÃO DO SGOS</p>
                                <h2 id="departamento-modal-title">
                                    {departamentoEditando ? "Editar departamento" : "Cadastrar departamento"}
                                </h2>
                                <p>Use os campos já persistidos pelo cadastro atual.</p>
                            </div>
                            <button
                                type="button"
                                className="projeto-modal-close"
                                onClick={fecharModal}
                                disabled={salvando}
                                aria-label="Fechar formulário"
                            >
                                ×
                            </button>
                        </header>

                        <form onSubmit={(event) => void salvar(event)}>
                            {erro && <div className="projetos-feedback projetos-feedback--error" role="alert">{erro}</div>}

                            <div className="projeto-form-grid">
                                <div className="projeto-field projeto-field--wide">
                                    <label htmlFor="departamento-nome">Nome do departamento *</label>
                                    <input
                                        id="departamento-nome"
                                        value={nome}
                                        onChange={(event) => setNome(event.target.value)}
                                        maxLength={100}
                                        required
                                        autoFocus
                                        disabled={salvando}
                                    />
                                </div>

                                {departamentoEditando ? (
                                    <div className="projeto-field projeto-field--wide">
                                        <label htmlFor="departamento-responsavel">Analista/Líder responsável</label>
                                        <select
                                            id="departamento-responsavel"
                                            value={responsavelId}
                                            onChange={(event) => setResponsavelId(event.target.value)}
                                            disabled={salvando || carregandoResponsaveis || !responsavelCarregado}
                                        >
                                            <option value="">Sem responsável</option>
                                            {responsaveisDisponiveis.map((item) => (
                                                <option key={item.id} value={String(item.id)}>
                                                    {item.nome} · #{item.id}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="equipes-field-hint">
                                            Apenas funcionários ativos com perfil Analista/Líder e já vinculados a este departamento podem ser responsáveis.{" "}
                                            {carregandoResponsaveis
                                                ? "Carregando opções…"
                                                : !responsavelCarregado
                                                    ? "As opções não foram carregadas; o responsável existente será preservado ao salvar o nome."
                                                    : ""}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="equipes-field-hint projeto-field--wide">
                                        O responsável pode ser definido depois que um Analista/Líder ativo estiver cadastrado e vinculado a este departamento.
                                    </p>
                                )}
                            </div>

                            <footer className="projeto-modal-actions">
                                <button type="button" className="projeto-btn-secondary" onClick={fecharModal} disabled={salvando}>
                                    Cancelar
                                </button>
                                <button type="submit" className="projeto-btn-primary" disabled={salvando || carregandoResponsaveis}>
                                    {salvando ? "Salvando…" : departamentoEditando ? "Salvar alterações" : "Cadastrar departamento"}
                                </button>
                            </footer>
                        </form>
                    </section>
                </div>
            )}
            {departamentoConfirmacao && (
                <div className="projeto-modal-overlay">
                    <section
                        className="projeto-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="confirmacao-departamento-title"
                    >
                        <header className="projeto-modal-header">
                            <div>
                                <p className="projetos-eyebrow">GESTÃO DO SGOS</p>
                                <h2 id="confirmacao-departamento-title">
                                    {novoEstadoConfirmacao ? "Reativar departamento" : "Inativar departamento"}
                                </h2>
                                <p>
                                    {novoEstadoConfirmacao
                                        ? "Confirme a reativação deste departamento."
                                        : "Confirme a inativação deste departamento."}
                                </p>
                            </div>
                        </header>

                        <div className="projeto-form-grid departamento-confirmacao-corpo">
                            <p className="departamento-confirmacao-texto">
                                Deseja realmente {novoEstadoConfirmacao ? "reativar" : "inativar"} o departamento{" "}
                                <strong>{departamentoConfirmacao.nome}</strong>?
                            </p>
                        </div>

                        <footer className="projeto-modal-actions">
                            <button
                                type="button"
                                className="projeto-btn-secondary"
                                onClick={() => {
                                    setDepartamentoConfirmacao(null);
                                    setNovoEstadoConfirmacao(null);
                                }}
                                disabled={salvando}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="projeto-btn-primary"
                                onClick={() => void confirmarAlteracaoAtivo()}
                                disabled={salvando}
                            >
                                {salvando ? "Processando..." : "Confirmar"}
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
}
