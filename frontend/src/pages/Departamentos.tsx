import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError } from "../services/api";
import { getStoredUser } from "../services/auth";
import { departamentoService } from "../services/departamento";
import { funcionarioService } from "../services/funcionario";
import DepartamentoDetalhesModal from "../components/departamentos/DepartamentoDetalhesModal";
import type { Departamento, Funcionario, VisaoEquipe } from "../types/api";

import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/darkmode.css";
import "../styles/filters.css";
import "../styles/forms.css";
import "../styles/projetos.css";
import "../styles/equipes.css";

function mensagemErro(error: unknown, fallback: string): string {
    if (error instanceof ApiError) return error.message;
    return error instanceof Error && error.message ? error.message : fallback;
}

export default function Departamentos() {
    const [searchParams, setSearchParams] = useSearchParams();
    const departamentoVisualizadoId = Number(searchParams.get("visualizar"));
    const modoVisualizacao = searchParams.has("visualizar") && Number.isSafeInteger(departamentoVisualizadoId) && departamentoVisualizadoId > 0;
    const usuario = getStoredUser();
    const podeGerenciar = usuario?.tipo === "gestor";

    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [departamentoSelecionado, setDepartamentoSelecionado] = useState<Departamento | null>(null);
    const [visaoDetalhe, setVisaoDetalhe] = useState<VisaoEquipe | null>(null);
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

    const carregarDepartamentos = useCallback(async () => {
        setCarregando(true);
        try {
            setDepartamentos(await departamentoService.listar());
            setErro(null);
        } catch (error) {
            setErro(mensagemErro(error, "Não foi possível carregar os departamentos."));
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => { void carregarDepartamentos(); }, [carregarDepartamentos]);

    const departamentosExibidos = useMemo(() => {
        const termo = busca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
        return departamentos.filter((item) => {
            if (modoVisualizacao && item.id !== departamentoVisualizadoId) return false;
            if (!termo) return true;
            return item.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").includes(termo)
                || String(item.id).includes(termo);
        }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }, [departamentos, busca, modoVisualizacao, departamentoVisualizadoId]);

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
        return () => { vigente = false; };
    }, [departamentoSelecionadoId, incluirHistorico]);

    // Links internos para ?visualizar=ID abrem o mesmo modal usado pela listagem.
    useEffect(() => {
        if (!modoVisualizacao || carregando || departamentoSelecionadoId === departamentoVisualizadoId) return;
        const departamento = departamentos.find((item) => item.id === departamentoVisualizadoId);
        if (departamento) setDepartamentoSelecionado(departamento);
    }, [modoVisualizacao, carregando, departamentoVisualizadoId, departamentos, departamentoSelecionadoId]);

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
        return () => { vigente = false; };
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
        if (!nomeValidado) { setErro("Informe o nome do departamento."); return; }
        if (nomeValidado.length > 100) { setErro("O nome do departamento deve ter no máximo 100 caracteres."); return; }
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
                <div className="container projetos-container">
                    <header className="projetos-page-header">
                        <div>
                            <p className="projetos-eyebrow">GESTÃO OPERACIONAL</p>
                            <h1>{modoVisualizacao ? "Departamento" : "Equipes e departamentos"}</h1>
                            <p className="projetos-subtitle">Consulte departamentos, integrantes, projetos e ordens de serviço relacionados, respeitando o escopo da sua conta.</p>
                        </div>
                        {modoVisualizacao ? <Link to="/departamentos" className="projeto-btn-secondary">Voltar à lista</Link> : podeGerenciar && <button type="button" className="projeto-btn-primary" onClick={abrirCadastro}>+ Novo departamento</button>}
                    </header>

                    {mensagem && <div className="projetos-feedback projetos-feedback--success" role="status">{mensagem}</div>}
                    {erro && !modalAberto && <div className="projetos-feedback projetos-feedback--error" role="alert">{erro}</div>}

                    {!modoVisualizacao && (
                        <section className="projetos-toolbar" aria-label="Pesquisa e filtros de departamentos">
                            <div className="projetos-search-wrap">
                                <label htmlFor="departamentos-busca">Pesquisar departamentos</label>
                                <input id="departamentos-busca" className="projetos-search" type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome ou número do departamento..." />
                            </div>
                            <span className="projeto-count-badge">{departamentosExibidos.length} departamento(s)</span>
                        </section>
                    )}

                    <div className="projetos-list-header">
                        <div><h2>{modoVisualizacao ? "Departamento selecionado" : "Departamentos cadastrados"}</h2><p>{departamentosExibidos.length} resultado(s)</p></div>
                        <label className="equipes-history-toggle"><input type="checkbox" checked={incluirHistorico} onChange={(event) => alternarHistorico(event.target.checked)} /> Incluir históricos/inativos do meu escopo</label>
                    </div>

                    {carregando ? (
                        <div className="projetos-empty" role="status"><span className="projetos-loading-mark" aria-hidden="true" />Carregando departamentos…</div>
                    ) : departamentosExibidos.length === 0 ? (
                        <div className="projetos-empty"><strong>{modoVisualizacao ? "Departamento não encontrado" : "Nenhum departamento encontrado"}</strong><p>{modoVisualizacao ? "O departamento não existe ou não está no escopo autorizado." : "Ajuste a pesquisa ou cadastre um departamento."}</p></div>
                    ) : (
                        <div className="projetos-grid equipes-integradas-grid">
                            {departamentosExibidos.map((departamento) => (
                                <article key={departamento.id} className="projeto-card equipes-integradas-card">
                                    <header className="projeto-card-header">
                                        <span className="projeto-id">DEPARTAMENTO #{departamento.id}</span>
                                        <span className="projeto-status">Estrutura operacional</span>
                                    </header>
                                    <button
                                        type="button"
                                        className="equipes-departamento-title"
                                        onClick={() => abrirDetalhes(departamento)}
                                        aria-haspopup="dialog"
                                        aria-label={`Abrir detalhes do departamento ${departamento.nome}`}
                                    >
                                        {departamento.nome}
                                    </button>
                                    <p className="projeto-card-client">Responsável: {departamento.responsavel_id ? `Funcionário #${departamento.responsavel_id}` : "Não definido"}</p>
                                    <div className="projeto-card-actions">
                                        {podeGerenciar && <button type="button" className="projeto-btn-secondary" onClick={() => abrirEdicao(departamento)} disabled={salvando}>Editar</button>}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    <p className="equipes-note">Departamentos são a estrutura de equipe existente. A inativação permanente não está disponível porque o schema atual não tem estado persistente para departamentos; nenhuma exclusão física, reativação ou estado simulado é oferecido.</p>
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
                <div className="projeto-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) fecharModal(); }}>
                    <section className="projeto-modal projeto-form-modal" role="dialog" aria-modal="true" aria-labelledby="departamento-modal-title">
                        <header className="projeto-modal-header"><div><p className="projetos-eyebrow">GESTÃO DO SGOS</p><h2 id="departamento-modal-title">{departamentoEditando ? "Editar departamento" : "Cadastrar departamento"}</h2><p>Use os campos já persistidos pelo cadastro atual.</p></div><button type="button" className="projeto-modal-close" onClick={fecharModal} disabled={salvando} aria-label="Fechar formulário">×</button></header>
                        <form onSubmit={(event) => void salvar(event)}>
                            {erro && <div className="projetos-feedback projetos-feedback--error" role="alert">{erro}</div>}
                            <div className="projeto-form-grid">
                                <div className="projeto-field projeto-field--wide"><label htmlFor="departamento-nome">Nome do departamento *</label><input id="departamento-nome" value={nome} onChange={(event) => setNome(event.target.value)} maxLength={100} required autoFocus disabled={salvando} /></div>
                                {departamentoEditando ? (
                                    <div className="projeto-field projeto-field--wide">
                                        <label htmlFor="departamento-responsavel">Analista/Líder responsável</label>
                                        <select id="departamento-responsavel" value={responsavelId} onChange={(event) => setResponsavelId(event.target.value)} disabled={salvando || carregandoResponsaveis || !responsavelCarregado}>
                                            <option value="">Sem responsável</option>
                                            {responsaveisDisponiveis.map((item) => <option key={item.id} value={String(item.id)}>{item.nome} · #{item.id}</option>)}
                                        </select>
                                        <p className="equipes-field-hint">Apenas funcionários ativos com perfil Analista/Líder e já vinculados a este departamento podem ser responsáveis. {carregandoResponsaveis ? "Carregando opções…" : !responsavelCarregado ? "As opções não foram carregadas; o responsável existente será preservado ao salvar o nome." : ""}</p>
                                    </div>
                                ) : (
                                    <p className="equipes-field-hint projeto-field--wide">O responsável pode ser definido depois que um Analista/Líder ativo estiver cadastrado e vinculado a este departamento.</p>
                                )}
                            </div>
                            <footer className="projeto-modal-actions"><button type="button" className="projeto-btn-secondary" onClick={fecharModal} disabled={salvando}>Cancelar</button><button type="submit" className="projeto-btn-primary" disabled={salvando || carregandoResponsaveis}>{salvando ? "Salvando…" : departamentoEditando ? "Salvar alterações" : "Cadastrar departamento"}</button></footer>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}