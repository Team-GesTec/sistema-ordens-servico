import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import OrdemServicoHistorico from "../components/ordens/OrdemServicoHistorico";
import { ApiError } from "../services/api";
import { auditoriaService, ROTULOS_TIPO_EVENTO, type FiltroAuditoria } from "../services/auditoria";
import { publishToast } from "../services/feedbackEvents";
import { getStoredUser } from "../services/auth";
import type { HistoricoOrdemServico, RespostaLogsAuditoria, TipoEventoAuditoria } from "../types/api";
import { campoLegivel, mostraValores, valorLegivel } from "../utils/auditoriaUtils";

/** Registros por página da tabela. */
const LIMITE_POR_PAGINA = 10;

/** Espera após a digitação antes de consultar a API. */
const ATRASO_BUSCA_MS = 400;

const TIPOS_EVENTO = Object.keys(ROTULOS_TIPO_EVENTO) as TipoEventoAuditoria[];

interface ErroConsulta {
    mensagem: string;
    /** Falha de conexão (sem resposta da API): a tela oferece "Tentar novamente". */
    rede: boolean;
    acessoNegado: boolean;
}

function hojeLocal(): string {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function csvCell(valor: unknown): string {
    return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

function paraErroConsulta(error: unknown): ErroConsulta {
    if (error instanceof ApiError) {
        return { mensagem: error.message, rede: error.status === 0, acessoNegado: error.status === 403 };
    }
    return { mensagem: "Não foi possível consultar os logs de auditoria.", rede: true, acessoNegado: false };
}

/** Busca todas as páginas do filtro atual (limite máximo do backend) e gera o CSV. */
async function exportarRegistros(filtro: Omit<FiltroAuditoria, "pagina" | "limite">) {
    const registros: HistoricoOrdemServico[] = [];
    let pagina = 1;
    let totalPaginas: number;
    do {
        const resposta = await auditoriaService.listar({ ...filtro, pagina, limite: 100 });
        registros.push(...resposta.dados);
        totalPaginas = resposta.paginacao.total_paginas;
        pagina += 1;
    } while (pagina <= totalPaginas);

    const linhas = [
        ["Ordem de serviço", "Data e hora", "Evento", "Descrição", "Campo", "Valor anterior", "Novo valor", "Responsável", "Parecer técnico", "Justificativa"],
        ...registros.map((registro) => [
            `OS #${registro.os_id}`,
            registro.data_hora,
            ROTULOS_TIPO_EVENTO[registro.tipo_evento],
            registro.descricao,
            campoLegivel(registro.campo_alterado),
            valorLegivel(registro, registro.dado_antigo),
            valorLegivel(registro, registro.dado_novo),
            registro.funcionarios?.nome ?? "Não identificado",
            registro.parecer ?? "",
            registro.justificativa ?? "",
        ]),
    ];
    const conteudo = `\uFEFF${linhas.map((linha) => linha.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `logs-auditoria-sgos-${hojeLocal()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    publishToast({
        title: "Arquivo exportado",
        message: "O arquivo CSV de auditoria foi gerado e está pronto para download.",
        variant: "success",
    });
}

function Auditoria() {
    const ehGestor = getStoredUser()?.tipo === "gestor";
    const [resposta, setResposta] = useState<RespostaLogsAuditoria | null>(null);
    const [carregando, setCarregando] = useState(ehGestor);
    const [exportando, setExportando] = useState(false);
    const [erro, setErro] = useState<ErroConsulta | null>(null);
    const [busca, setBusca] = useState("");
    const [buscaAplicada, setBuscaAplicada] = useState("");
    const [tipo, setTipo] = useState<TipoEventoAuditoria | "">("");
    const [dataInicio, setDataInicio] = useState("");
    const [dataFim, setDataFim] = useState("");
    const [pagina, setPagina] = useState(1);
    const [tentativa, setTentativa] = useState(0);
    const [ordemSelecionada, setOrdemSelecionada] = useState<number | null>(null);

    // A busca só vai para a API depois que o usuário para de digitar
    useEffect(() => {
        const temporizador = window.setTimeout(() => setBuscaAplicada(busca.trim()), ATRASO_BUSCA_MS);
        return () => window.clearTimeout(temporizador);
    }, [busca]);

    useEffect(() => setPagina(1), [buscaAplicada, tipo, dataInicio, dataFim]);

    // Período invertido: a tela avisa e não consulta (o backend também recusaria com 400)
    const periodoInvalido = Boolean(dataInicio && dataFim && dataInicio > dataFim);

    useEffect(() => {
        if (!ehGestor || periodoInvalido) return;
        let vigente = true;
        setCarregando(true);
        setErro(null);
        auditoriaService.listar({ busca: buscaAplicada, tipo, dataInicio, dataFim, pagina, limite: LIMITE_POR_PAGINA })
            .then((dados) => { if (vigente) setResposta(dados); })
            .catch((error: unknown) => { if (vigente) setErro(paraErroConsulta(error)); })
            .finally(() => { if (vigente) setCarregando(false); });
        return () => { vigente = false; };
    }, [ehGestor, periodoInvalido, buscaAplicada, tipo, dataInicio, dataFim, pagina, tentativa]);

    useEffect(() => {
        if (ordemSelecionada === null) return;
        const tratarTecla = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOrdemSelecionada(null);
        };
        window.addEventListener("keydown", tratarTecla);
        return () => window.removeEventListener("keydown", tratarTecla);
    }, [ordemSelecionada]);

    async function exportar() {
        setExportando(true);
        try {
            await exportarRegistros({ busca: buscaAplicada, tipo, dataInicio, dataFim });
        } catch (error) {
            setErro(paraErroConsulta(error));
        } finally {
            setExportando(false);
        }
    }

    function limparFiltro() {
        setBusca("");
        setBuscaAplicada("");
        setTipo("");
        setDataInicio("");
        setDataFim("");
    }

    const registros = resposta?.dados ?? [];
    const paginacao = resposta?.paginacao;
    const indicadores = resposta?.indicadores;
    const totalPaginas = Math.max(1, paginacao?.total_paginas ?? 1);
    const filtroAtivo = Boolean(buscaAplicada || tipo || dataInicio || dataFim);
    const [dataUltimo, horaUltimo] = indicadores?.ultimo_evento_formatado?.split(" ") ?? [];

    if (!ehGestor || erro?.acessoNegado) {
        return (
            <main className="main analysis-page">
                <div className="container gestec-page-content analysis-container">
                    <header className="page-heading analysis-heading">
                        <div>
                            <p className="eyebrow">GOVERNANÇA E RASTREABILIDADE</p>
                            <h1>Logs de auditoria</h1>
                        </div>
                        <div className="heading-actions">
                            <Link to="/ordens" className="btn btn-secondary"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Voltar às O.S.</Link>
                        </div>
                    </header>
                    <div className="analysis-alert analysis-alert--warning" role="alert">
                        Acesso restrito: somente gestores podem consultar os logs de auditoria.
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="main analysis-page">
            <div className="container gestec-page-content analysis-container">
                <header className="page-heading analysis-heading">
                    <div>
                        <p className="eyebrow">GOVERNANÇA E RASTREABILIDADE</p>
                        <h1>Logs de auditoria</h1>
                        <p>Histórico imutável das atividades realizadas nas ordens de serviço.</p>
                    </div>
                    <div className="heading-actions">
                        <Link to="/ordens" className="btn btn-secondary"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Voltar às O.S.</Link>
                        <button type="button" className="btn btn-secondary" onClick={() => setTentativa((atual) => atual + 1)} disabled={carregando}>
                            <i className="fa-solid fa-rotate" aria-hidden="true" /> Atualizar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => void exportar()} disabled={!registros.length || exportando || periodoInvalido}>
                            <i className="fa-solid fa-download" aria-hidden="true" /> {exportando ? "Exportando..." : "Exportar logs"}
                        </button>
                    </div>
                </header>

                {erro && (
                    <div className="analysis-alert analysis-alert--error" role="alert">
                        {erro.rede ? "Não foi possível conectar à API para consultar os logs de auditoria. Verifique sua conexão." : erro.mensagem}
                        {" "}
                        <button type="button" className="btn btn-secondary" onClick={() => setTentativa((atual) => atual + 1)} disabled={carregando}>
                            <i className="fa-solid fa-rotate" aria-hidden="true" /> Tentar novamente
                        </button>
                    </div>
                )}

                <section className="analysis-kpis analysis-kpis--audit" aria-label="Resumo da auditoria">
                    <article className="analysis-kpi-card">
                        <div className="analysis-kpi-top"><span>Eventos registrados</span><i className="fa-solid fa-clock-rotate-left analysis-icon-blue" aria-hidden="true" /></div>
                        <strong>{carregando || !indicadores ? "—" : indicadores.total_eventos.toLocaleString("pt-BR")}</strong>
                        <small>{filtroAtivo ? "Eventos que atendem ao filtro" : "Eventos registrados na auditoria"}</small>
                    </article>
                    <article className="analysis-kpi-card">
                        <div className="analysis-kpi-top"><span>Alterações hoje</span><i className="fa-solid fa-check analysis-icon-green" aria-hidden="true" /></div>
                        <strong>{carregando || !indicadores ? "—" : indicadores.eventos_hoje.toLocaleString("pt-BR")}</strong>
                        <small>Eventos registrados na data atual</small>
                    </article>
                    <article className="analysis-kpi-card">
                        <div className="analysis-kpi-top"><span>Ordens impactadas</span><i className="fa-solid fa-clipboard-list analysis-icon-purple" aria-hidden="true" /></div>
                        <strong>{carregando || !indicadores ? "—" : indicadores.ordens_impactadas.toLocaleString("pt-BR")}</strong>
                        <small>Ordens com ao menos um evento</small>
                    </article>
                    <article className="analysis-kpi-card">
                        <div className="analysis-kpi-top"><span>Último evento</span><i className="fa-regular fa-clock analysis-icon-amber" aria-hidden="true" /></div>
                        <strong className="analysis-audit-last-time">{carregando || !horaUltimo ? "—" : horaUltimo}</strong>
                        <small>{dataUltimo ?? "Sem eventos disponíveis"}</small>
                    </article>
                </section>

                <section className="analysis-panel analysis-audit-panel">
                    <div className="analysis-audit-toolbar">
                        <label className="analysis-audit-search">
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            <input type="search" value={busca} maxLength={100} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar O.S., descrição, campo, valor ou usuário..." aria-label="Buscar logs de auditoria" />
                        </label>
                        <select value={tipo} onChange={(event) => setTipo(event.target.value as TipoEventoAuditoria | "")} aria-label="Filtrar por tipo de evento">
                            <option value="">Todos os eventos</option>
                            {TIPOS_EVENTO.map((valor) => <option key={valor} value={valor}>{ROTULOS_TIPO_EVENTO[valor]}</option>)}
                        </select>
                        <label className="analysis-audit-date-filter">
                            <span>De</span>
                            <input type="date" value={dataInicio} max={dataFim || undefined} onChange={(event) => setDataInicio(event.target.value)} aria-label="Data inicial do período" />
                        </label>
                        <label className="analysis-audit-date-filter">
                            <span>Até</span>
                            <input type="date" value={dataFim} min={dataInicio || undefined} onChange={(event) => setDataFim(event.target.value)} aria-label="Data final do período" />
                        </label>
                        <button type="button" className="btn btn-secondary" onClick={limparFiltro} disabled={!busca && !tipo && !dataInicio && !dataFim}>
                            <i className="fa-solid fa-xmark" aria-hidden="true" /> Limpar filtro
                        </button>
                    </div>
                    {periodoInvalido && (
                        <div className="analysis-alert analysis-alert--warning" role="alert">
                            A data inicial não pode ser posterior à data final.
                        </div>
                    )}

                    <div className="analysis-table-scroll">
                        <table className="analysis-table analysis-audit-table">
                            <thead><tr><th>Ordem de serviço</th><th>Data e hora</th><th>Evento</th><th>Campo</th><th>Valor anterior</th><th>Novo valor</th><th>Responsável</th><th aria-label="Ações" /></tr></thead>
                            <tbody>
                                {!carregando && registros.map((registro) => (
                                    <tr key={registro.id} onDoubleClick={() => setOrdemSelecionada(registro.os_id)}>
                                        <td><Link className="analysis-audit-os" to={`/ordens/${registro.os_id}`} title={registro.ordem_servico?.titulo}>OS #{registro.os_id}</Link></td>
                                        <td className="analysis-audit-date">{registro.data_hora}</td>
                                        <td><strong className="analysis-audit-action" title={registro.descricao}>{ROTULOS_TIPO_EVENTO[registro.tipo_evento]}</strong><br /><small>{registro.descricao}</small></td>
                                        <td><span className="analysis-field-chip">{campoLegivel(registro.campo_alterado)}</span></td>
                                        <td><span className="analysis-old-value">{mostraValores(registro) ? valorLegivel(registro, registro.dado_antigo) : "—"}</span></td>
                                        <td><span className="analysis-new-value">{mostraValores(registro) ? valorLegivel(registro, registro.dado_novo) : "—"}</span></td>
                                        <td><span className="analysis-audit-user"><span>{registro.funcionarios?.nome?.split(/\s+/).map((parte) => parte[0]).slice(0, 2).join("").toUpperCase() ?? "—"}</span>{registro.funcionarios?.nome ?? "Não identificado"}</span></td>
                                        <td><button type="button" className="analysis-audit-open" onClick={() => setOrdemSelecionada(registro.os_id)} aria-label={`Ver atividades da OS ${registro.os_id}`} title="Ver atividades da ordem"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {carregando && <div className="analysis-state"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Consultando os logs de auditoria...</div>}
                        {!carregando && !erro && registros.length === 0 && (
                            <div className="analysis-empty analysis-audit-empty">
                                <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
                                <strong>{filtroAtivo ? "Nenhum evento encontrado" : "Nenhum log de auditoria disponível"}</strong>
                                <span>{filtroAtivo ? "Altere os termos da pesquisa ou limpe os filtros." : "Ainda não há atividades registradas nas ordens de serviço."}</span>
                            </div>
                        )}
                    </div>

                    <footer className="analysis-table-footer">
                        <span>
                            {paginacao && paginacao.total > 0
                                ? `Mostrando ${((paginacao.pagina - 1) * paginacao.limite) + 1}–${Math.min(paginacao.pagina * paginacao.limite, paginacao.total)} de ${paginacao.total} eventos`
                                : "Nenhum evento para exibir"}
                        </span>
                        <div className="analysis-pagination" aria-label="Paginação dos logs">
                            <button type="button" onClick={() => setPagina((atual) => Math.max(1, atual - 1))} disabled={carregando || pagina <= 1} aria-label="Página anterior">‹</button>
                            {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).slice(Math.max(0, pagina - 3), Math.max(0, pagina - 3) + 5).map((numero) => (
                                <button type="button" key={numero} className={pagina === numero ? "active" : ""} onClick={() => setPagina(numero)} disabled={carregando} aria-current={pagina === numero ? "page" : undefined}>{numero}</button>
                            ))}
                            <button type="button" onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))} disabled={carregando || pagina >= totalPaginas} aria-label="Próxima página">›</button>
                        </div>
                    </footer>
                </section>
                <p className="analysis-data-note">Os registros são somente leitura: a auditoria é gravada na mesma transação de cada operação na O.S. e não pode ser alterada nem excluída. Os cartões consideram o filtro aplicado.</p>
            </div>

            {ordemSelecionada !== null && (
                <div className="analysis-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOrdemSelecionada(null); }}>
                    <section className="analysis-audit-modal" role="dialog" aria-modal="true" aria-labelledby="analysis-audit-modal-title">
                        <header>
                            <div>
                                <span className="analysis-modal-eyebrow">AUDITORIA · SOMENTE LEITURA</span>
                                <h2 id="analysis-audit-modal-title">Atividades da ordem</h2>
                                <p>Registro cronológico da OS #{ordemSelecionada}</p>
                            </div>
                            <button type="button" onClick={() => setOrdemSelecionada(null)} aria-label="Fechar histórico">×</button>
                        </header>
                        <div className="analysis-audit-modal-body">
                            <div className="analysis-audit-summary"><Link to={`/ordens/${ordemSelecionada}`} onClick={() => setOrdemSelecionada(null)}>Abrir OS #{ordemSelecionada}</Link></div>
                            <OrdemServicoHistorico osId={ordemSelecionada} />
                        </div>
                        <footer><button type="button" className="btn btn-secondary" onClick={() => setOrdemSelecionada(null)}>Fechar histórico</button></footer>
                    </section>
                </div>
            )}
        </main>
    );
}

export default Auditoria;
