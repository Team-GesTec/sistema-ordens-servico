import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { auditoriaService, type RegistroAuditoriaComOrdem, type ResultadoAuditoria } from "../services/auditoria";
import { publishToast } from "../services/feedbackEvents";
import { getStoredUser } from "../services/auth";

const ROTULOS_ACAO: Record<RegistroAuditoriaComOrdem["acao"], string> = {
    insercao: "Criação",
    atualizacao: "Atualização",
    exclusao: "Exclusão",
};

const ROTULOS_CAMPO: Record<string, string> = {
    status: "Status",
    criticidade: "Criticidade",
    responsavel_id: "Responsável",
    solicitante_id: "Solicitante",
    departamento_id: "Departamento",
    cliente_id: "Cliente",
    projeto_id: "Projeto",
    data_limite_sla: "Prazo / SLA",
    parecer_tecnico: "Parecer técnico",
    titulo: "Título",
    descricao: "Descrição",
    anexo: "Anexo",
};

const ROTULOS_VALOR: Record<string, string> = {
    em_andamento: "Em andamento",
    aguardando: "Aguardando",
    validacao_testes: "Validação de testes",
    bloqueado: "Bloqueado",
    concluido: "Concluído",
    baixo: "Baixa",
    medio: "Média",
    alto: "Alta",
    muito_alto: "Muito alta",
    urgente: "Urgente",
};

function formatarDataHora(valor: string): string {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "Data indisponível";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(data);
}

function formatarHora(valor: string): string {
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? "—"
        : new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data);
}

function campoLegivel(campo: string | null): string {
    if (!campo) return "Registro";
    if (ROTULOS_CAMPO[campo]) return ROTULOS_CAMPO[campo];
    return campo.replace(/_/g, " ").replace(/^./, (letra) => letra.toUpperCase());
}

function valorLegivel(campo: string | null, valor: string | null): string {
    if (valor === null || valor === "") return "—";
    if (campo && ROTULOS_VALOR[valor]) return ROTULOS_VALOR[valor];
    return valor;
}

function hojeLocal(): string {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

function csvCell(valor: unknown): string {
    return `"${String(valor ?? "").replace(/"/g, '""')}"`;
}

function exportarRegistros(registros: RegistroAuditoriaComOrdem[]) {
    const linhas = [
        ["Ordem de serviço", "Data e hora", "Ação", "Campo", "Valor anterior", "Novo valor", "Responsável", "Justificativa"],
        ...registros.map((registro) => [
            `OS #${registro.os_id}`,
            formatarDataHora(registro.data_modificacao),
            ROTULOS_ACAO[registro.acao],
            campoLegivel(registro.campo_alterado),
            valorLegivel(registro.campo_alterado, registro.dado_antigo),
            valorLegivel(registro.campo_alterado, registro.dado_novo),
            registro.funcionarios?.nome ?? "Não identificado",
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
    const usuario = getStoredUser();
    const [resultado, setResultado] = useState<ResultadoAuditoria>({
        registros: [],
        ordensConsultadas: 0,
        ordensComFalha: [],
        falhaConsultaInativas: false,
    });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [busca, setBusca] = useState("");
    const [acao, setAcao] = useState("");
    const [pagina, setPagina] = useState(1);
    const [ordemSelecionada, setOrdemSelecionada] = useState<number | null>(null);

    const carregarDados = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const dados = await auditoriaService.listarTodas({
                tipo: usuario?.tipo,
                departamentoId: usuario?.departamento_id,
            });
            setResultado(dados);
        } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível consultar os logs de auditoria.");
        } finally {
            setCarregando(false);
        }
    }, [usuario?.tipo]);

    useEffect(() => {
        void carregarDados();
    }, [carregarDados]);

    useEffect(() => {
        if (ordemSelecionada === null) return;
        const tratarTecla = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOrdemSelecionada(null);
        };
        window.addEventListener("keydown", tratarTecla);
        return () => window.removeEventListener("keydown", tratarTecla);
    }, [ordemSelecionada]);

    const registrosFiltrados = useMemo(() => {
        const termo = busca.trim().toLocaleLowerCase("pt-BR");
        return resultado.registros.filter((registro) => {
            if (acao && registro.acao !== acao) return false;
            if (!termo) return true;
            const conteudo = [
                `OS #${registro.os_id}`,
                registro.ordem.titulo,
                ROTULOS_ACAO[registro.acao],
                campoLegivel(registro.campo_alterado),
                registro.dado_antigo,
                registro.dado_novo,
                registro.funcionarios?.nome,
                registro.justificativa,
            ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
            return conteudo.includes(termo);
        });
    }, [acao, busca, resultado.registros]);

    useEffect(() => setPagina(1), [busca, acao]);

    const totalPaginas = Math.max(1, Math.ceil(registrosFiltrados.length / 10));
    const registrosPagina = registrosFiltrados.slice((pagina - 1) * 10, pagina * 10);
    const registrosDaOrdem = ordemSelecionada === null
        ? []
        : resultado.registros.filter((registro) => registro.os_id === ordemSelecionada);
    const ultimoRegistro = resultado.registros[0];
    const eventosHoje = resultado.registros.filter((registro) => {
        const data = new Date(registro.data_modificacao);
        return !Number.isNaN(data.getTime()) && `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}` === hojeLocal();
    }).length;
    const ordensImpactadas = new Set(resultado.registros.map((registro) => registro.os_id)).size;

    return (
        <main className="main analysis-page">
            <div className="container gestec-page-content analysis-container">
                <header className="page-heading analysis-heading">
                    <div>
                        <p className="eyebrow">GOVERNANÇA E RASTREABILIDADE</p>
                        <h1>Logs de auditoria</h1>
                        <p>Histórico imutável das alterações realizadas nas ordens de serviço.</p>
                    </div>
                    <div className="heading-actions">
                        <Link to="/ordens" className="btn btn-secondary"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Voltar às O.S.</Link>
                        <button type="button" className="btn btn-secondary" onClick={() => void carregarDados()} disabled={carregando}>
                            <i className="fa-solid fa-rotate" aria-hidden="true" /> Atualizar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => exportarRegistros(registrosFiltrados)} disabled={!registrosFiltrados.length}>
                            <i className="fa-solid fa-download" aria-hidden="true" /> Exportar logs
                        </button>
                    </div>
                </header>

                {erro && <div className="analysis-alert analysis-alert--error" role="alert">{erro}</div>}
                {!erro && (resultado.ordensComFalha.length > 0 || resultado.falhaConsultaInativas) && !carregando && (
                    <div className="analysis-alert analysis-alert--warning" role="status">
                        Consulta parcial: não foi possível recuperar o histórico de {resultado.ordensComFalha.length} ordem(ns)
                        {resultado.falhaConsultaInativas ? " e a consulta de ordens inativas falhou" : ""}. Os registros disponíveis continuam exibidos.
                    </div>
                )}

                <section className="analysis-kpis analysis-kpis--audit" aria-label="Resumo da auditoria">
                    <article className="analysis-kpi-card">
                        <div className="analysis-kpi-top"><span>Eventos registrados</span><i className="fa-solid fa-clock-rotate-left analysis-icon-blue" aria-hidden="true" /></div>
                        <strong>{carregando ? "—" : resultado.registros.length.toLocaleString("pt-BR")}</strong>
                        <small>Eventos retornados pela auditoria</small>
                    </article>
                    <article className="analysis-kpi-card">
                        <div className="analysis-kpi-top"><span>Alterações hoje</span><i className="fa-solid fa-check analysis-icon-green" aria-hidden="true" /></div>
                        <strong>{carregando ? "—" : eventosHoje.toLocaleString("pt-BR")}</strong>
                        <small>Eventos registrados na data atual</small>
                    </article>
                    <article className="analysis-kpi-card">
                        <div className="analysis-kpi-top"><span>Ordens impactadas</span><i className="fa-solid fa-clipboard-list analysis-icon-purple" aria-hidden="true" /></div>
                        <strong>{carregando ? "—" : ordensImpactadas.toLocaleString("pt-BR")}</strong>
                        <small>Ordens com ao menos um evento</small>
                    </article>
                    <article className="analysis-kpi-card">
                        <div className="analysis-kpi-top"><span>Último evento</span><i className="fa-regular fa-clock analysis-icon-amber" aria-hidden="true" /></div>
                        <strong className="analysis-audit-last-time">{carregando ? "—" : ultimoRegistro ? formatarHora(ultimoRegistro.data_modificacao) : "—"}</strong>
                        <small>{ultimoRegistro ? formatarDataHora(ultimoRegistro.data_modificacao).split(",")[0] : "Sem eventos disponíveis"}</small>
                    </article>
                </section>

                <section className="analysis-panel analysis-audit-panel">
                    <div className="analysis-audit-toolbar">
                        <label className="analysis-audit-search">
                            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                            <input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar O.S., ação, campo ou usuário..." aria-label="Buscar logs de auditoria" />
                        </label>
                        <select value={acao} onChange={(event) => setAcao(event.target.value)} aria-label="Filtrar por tipo de alteração">
                            <option value="">Todas as alterações</option>
                            <option value="insercao">Criação</option>
                            <option value="atualizacao">Atualização</option>
                            <option value="exclusao">Exclusão</option>
                        </select>
                        <button type="button" className="btn btn-secondary" onClick={() => { setBusca(""); setAcao(""); }} disabled={!busca && !acao}>
                            <i className="fa-solid fa-xmark" aria-hidden="true" /> Limpar filtro
                        </button>
                    </div>

                    <div className="analysis-table-scroll">
                        <table className="analysis-table analysis-audit-table">
                            <thead><tr><th>Ordem de serviço</th><th>Data e hora</th><th>Alteração</th><th>Campo</th><th>Valor anterior</th><th>Novo valor</th><th>Responsável</th><th aria-label="Ações" /></tr></thead>
                            <tbody>
                                {registrosPagina.map((registro) => (
                                    <tr key={registro.id} onDoubleClick={() => setOrdemSelecionada(registro.os_id)}>
                                        <td><Link className="analysis-audit-os" to={`/ordens/${registro.os_id}`}>OS #{registro.os_id}</Link></td>
                                        <td className="analysis-audit-date">{formatarDataHora(registro.data_modificacao)}</td>
                                        <td><strong className="analysis-audit-action">{ROTULOS_ACAO[registro.acao]}</strong></td>
                                        <td><span className="analysis-field-chip">{campoLegivel(registro.campo_alterado)}</span></td>
                                        <td><span className="analysis-old-value">{valorLegivel(registro.campo_alterado, registro.dado_antigo)}</span></td>
                                        <td><span className="analysis-new-value">{valorLegivel(registro.campo_alterado, registro.dado_novo)}</span></td>
                                        <td><span className="analysis-audit-user"><span>{registro.funcionarios?.nome?.split(/\s+/).map((parte) => parte[0]).slice(0, 2).join("").toUpperCase() ?? "—"}</span>{registro.funcionarios?.nome ?? "Não identificado"}</span></td>
                                        <td><button type="button" className="analysis-audit-open" onClick={() => setOrdemSelecionada(registro.os_id)} aria-label={`Ver histórico da OS ${registro.os_id}`} title="Ver histórico da ordem"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true" /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {carregando && <div className="analysis-state"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Consultando os históricos das ordens...</div>}
                        {!carregando && registrosPagina.length === 0 && (
                            <div className="analysis-empty analysis-audit-empty">
                                <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
                                <strong>{registrosFiltrados.length === 0 && (busca || acao) ? "Nenhum evento encontrado" : "Nenhum log de auditoria disponível"}</strong>
                                <span>{registrosFiltrados.length === 0 && (busca || acao) ? "Altere os termos da pesquisa ou limpe os filtros." : "Ainda não há alterações registradas para as ordens consultadas."}</span>
                            </div>
                        )}
                    </div>

                    <footer className="analysis-table-footer">
                        <span>
                            {registrosFiltrados.length
                                ? `Mostrando ${((pagina - 1) * 10) + 1}–${Math.min(pagina * 10, registrosFiltrados.length)} de ${registrosFiltrados.length} eventos`
                                : "Nenhum evento para exibir"}
                            {!carregando && ` · ${resultado.ordensConsultadas} OS consultadas`}
                        </span>
                        <div className="analysis-pagination" aria-label="Paginação dos logs">
                            <button type="button" onClick={() => setPagina((atual) => Math.max(1, atual - 1))} disabled={pagina <= 1} aria-label="Página anterior">‹</button>
                            {Array.from({ length: totalPaginas }, (_, indice) => indice + 1).slice(Math.max(0, pagina - 3), Math.max(0, pagina - 3) + 5).map((numero) => (
                                <button type="button" key={numero} className={pagina === numero ? "active" : ""} onClick={() => setPagina(numero)} aria-current={pagina === numero ? "page" : undefined}>{numero}</button>
                            ))}
                            <button type="button" onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))} disabled={pagina >= totalPaginas} aria-label="Próxima página">›</button>
                        </div>
                    </footer>
                </section>
                <p className="analysis-data-note">Os registros são somente leitura e vêm do histórico de auditoria persistido por ordem de serviço. A consulta agrega os endpoints de histórico já existentes; não há endpoint global de auditoria no backend atual.</p>
            </div>

            {ordemSelecionada !== null && (
                <div className="analysis-modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOrdemSelecionada(null); }}>
                    <section className="analysis-audit-modal" role="dialog" aria-modal="true" aria-labelledby="analysis-audit-modal-title">
                        <header>
                            <div>
                                <span className="analysis-modal-eyebrow">AUDITORIA · SOMENTE LEITURA</span>
                                <h2 id="analysis-audit-modal-title">Histórico de alterações</h2>
                                <p>Registro cronológico da OS #{ordemSelecionada}</p>
                            </div>
                            <button type="button" onClick={() => setOrdemSelecionada(null)} aria-label="Fechar histórico">×</button>
                        </header>
                        <div className="analysis-audit-modal-body">
                            <div className="analysis-audit-summary"><Link to={`/ordens/${ordemSelecionada}`} onClick={() => setOrdemSelecionada(null)}>Abrir OS #{ordemSelecionada}</Link><span>{registrosDaOrdem.length} evento(s) registrado(s)</span></div>
                            <div className="analysis-timeline">
                                {registrosDaOrdem.map((registro) => (
                                    <article className="analysis-timeline-item" key={registro.id}>
                                        <time>{formatarDataHora(registro.data_modificacao)}</time>
                                        <span className="analysis-timeline-marker" aria-hidden="true" />
                                        <div>
                                            <strong>{ROTULOS_ACAO[registro.acao]} · {campoLegivel(registro.campo_alterado)}</strong>
                                            <p>{registro.funcionarios?.nome ?? "Responsável não identificado"}</p>
                                            <div className="analysis-timeline-values"><span>{valorLegivel(registro.campo_alterado, registro.dado_antigo)}</span><i className="fa-solid fa-arrow-right" aria-hidden="true" /><b>{valorLegivel(registro.campo_alterado, registro.dado_novo)}</b></div>
                                            {registro.justificativa && <small>Justificativa: {registro.justificativa}</small>}
                                        </div>
                                    </article>
                                ))}
                                {registrosDaOrdem.length === 0 && <div className="analysis-empty">Não há eventos disponíveis para esta ordem.</div>}
                            </div>
                        </div>
                        <footer><button type="button" className="btn btn-secondary" onClick={() => setOrdemSelecionada(null)}>Fechar histórico</button></footer>
                    </section>
                </div>
            )}
        </main>
    );
}

export default Auditoria;
