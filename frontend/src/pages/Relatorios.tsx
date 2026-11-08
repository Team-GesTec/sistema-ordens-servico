import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { clienteService } from "../services/cliente";
import { departamentoService } from "../services/departamento";
import { ordemServicoService } from "../services/ordemServico";
import { publishToast } from "../services/feedbackEvents";
import { getStoredUser } from "../services/auth";
import type {
    Cliente,
    Departamento,
    NivelCriticidade,
    OrdemServico,
} from "../types/api";

interface DadosRelatorio {
    ordens: OrdemServico[];
    clientes: Cliente[];
    departamentos: Departamento[];
}

interface FiltrosRelatorio {
    inicio: string;
    fim: string;
    departamentoId: string;
    clienteId: string;
}

const PRIORIDADES: Array<{ valor: NivelCriticidade; nome: string; cor: string }> = [
    { valor: "baixo", nome: "Baixa", cor: "#63c4b0" },
    { valor: "medio", nome: "Média", cor: "#2e7ce1" },
    { valor: "alto", nome: "Alta", cor: "#f0b84d" },
    { valor: "muito_alto", nome: "Muito alta", cor: "#e87945" },
    { valor: "urgente", nome: "Urgente", cor: "#d84d58" },
];

function dataIso(date: Date): string {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const dia = String(date.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function criarFiltrosPadrao(): FiltrosRelatorio {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);
    return {
        inicio: dataIso(inicio),
        fim: dataIso(hoje),
        departamentoId: "",
        clienteId: "",
    };
}

function lerData(valor: string | null | undefined): Date | null {
    if (!valor) return null;
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
}

function dentroDoPeriodo(valor: string | null | undefined, filtros: FiltrosRelatorio): boolean {
    const data = lerData(valor);
    if (!data) return false;
    if (filtros.inicio) {
        const inicio = new Date(`${filtros.inicio}T00:00:00`);
        if (data < inicio) return false;
    }
    if (filtros.fim) {
        const fim = new Date(`${filtros.fim}T23:59:59.999`);
        if (data > fim) return false;
    }
    return true;
}

function formatarData(valor: string | null | undefined): string {
    const data = lerData(valor);
    return data
        ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(data)
        : "—";
}

function formatarPercentual(valor: number | null): string {
    return valor === null ? "—" : `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function statusConcluido(ordem: OrdemServico): boolean {
    return ordem.status === "concluido";
}

function slaCumprido(ordem: OrdemServico): boolean | null {
    const fim = lerData(ordem.data_fim);
    const prazo = lerData(ordem.data_limite_sla);
    if (!fim || !prazo || !statusConcluido(ordem)) return null;
    return fim.getTime() <= prazo.getTime();
}

function csvCell(valor: unknown): string {
    const texto = String(valor ?? "").replace(/"/g, '""');
    return `"${texto}"`;
}

function exportarOrdens(ordens: OrdemServico[], clientes: Cliente[], departamentos: Departamento[]) {
    const clientesPorId = new Map(clientes.map((cliente) => [cliente.id, cliente.nome]));
    const departamentosPorId = new Map(departamentos.map((departamento) => [departamento.id, departamento.nome]));
    const linhas = [
        ["OS", "Título", "Status", "Criticidade", "Cliente", "Departamento", "Abertura", "Conclusão", "Prazo SLA"],
        ...ordens.map((ordem) => [
            `OS #${ordem.id}`,
            ordem.titulo,
            ordem.status,
            ordem.criticidade ?? "Não informada",
            ordem.cliente_id ? clientesPorId.get(ordem.cliente_id) ?? "Cliente não encontrado" : "Sem cliente",
            departamentosPorId.get(ordem.departamento_id) ?? "Departamento não encontrado",
            formatarData(ordem.data_criacao),
            formatarData(ordem.data_fim),
            formatarData(ordem.data_limite_sla),
        ]),
    ];
    const conteudo = `\uFEFF${linhas.map((linha) => linha.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-sgos-${dataIso(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    publishToast({
        title: "Arquivo exportado",
        message: "O arquivo CSV foi gerado e está pronto para download.",
        variant: "success",
    });
}

function Relatorios() {
    const usuario = getStoredUser();
    const [dados, setDados] = useState<DadosRelatorio>({ ordens: [], clientes: [], departamentos: [] });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [filtrosRascunho, setFiltrosRascunho] = useState<FiltrosRelatorio>(criarFiltrosPadrao);
    const [filtros, setFiltros] = useState<FiltrosRelatorio>(criarFiltrosPadrao);

    const carregarDados = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            const [ordens, clientes, departamentos] = await Promise.all([
                ordemServicoService.listar(),
                clienteService.listar(),
                departamentoService.listar(),
            ]);
            setDados({ ordens, clientes, departamentos });
        } catch (error) {
            setErro(error instanceof Error ? error.message : "Não foi possível carregar os dados dos relatórios.");
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        void carregarDados();
    }, [carregarDados]);

    const ordensPorEntidade = useMemo(() => dados.ordens.filter((ordem) => {
        if (usuario?.tipo !== "gestor" && ordem.departamento_id !== usuario?.departamento_id) return false;
        if (filtros.departamentoId && ordem.departamento_id !== Number(filtros.departamentoId)) return false;
        if (filtros.clienteId && ordem.cliente_id !== Number(filtros.clienteId)) return false;
        return true;
    }), [dados.ordens, filtros.clienteId, filtros.departamentoId, usuario?.departamento_id, usuario?.tipo]);

    const ordensPeriodo = useMemo(
        () => ordensPorEntidade.filter((ordem) => dentroDoPeriodo(ordem.data_criacao, filtros)),
        [filtros, ordensPorEntidade],
    );

    const concluidas = useMemo(
        () => ordensPorEntidade.filter((ordem) => statusConcluido(ordem) && dentroDoPeriodo(ordem.data_fim, filtros)),
        [filtros, ordensPorEntidade],
    );
    const amostraSla = useMemo(
        () => concluidas.map((ordem) => slaCumprido(ordem)).filter((valor): valor is boolean => valor !== null),
        [concluidas],
    );
    const percentualSla = amostraSla.length
        ? (amostraSla.filter(Boolean).length / amostraSla.length) * 100
        : null;
    const tempoMedioHoras = useMemo(() => {
        const duracoes = concluidas
            .map((ordem) => {
                const inicio = lerData(ordem.data_criacao);
                const fim = lerData(ordem.data_fim);
                return inicio && fim && fim >= inicio ? (fim.getTime() - inicio.getTime()) / 3_600_000 : null;
            })
            .filter((valor): valor is number => valor !== null);
        return duracoes.length
            ? duracoes.reduce((total, valor) => total + valor, 0) / duracoes.length
            : null;
    }, [concluidas]);

    const meses = useMemo(() => {
        if (!filtros.inicio || !filtros.fim) return [];
        const inicio = new Date(`${filtros.inicio}T00:00:00`);
        const fim = new Date(`${filtros.fim}T23:59:59`);
        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) return [];
        const resultado: Array<{ chave: string; mes: string; recebidas: number; concluidas: number }> = [];
        const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
        const limite = new Date(fim.getFullYear(), fim.getMonth(), 1);
        while (cursor <= limite && resultado.length < 18) {
            const ano = cursor.getFullYear();
            const mes = cursor.getMonth();
            resultado.push({
                chave: `${ano}-${String(mes + 1).padStart(2, "0")}`,
                mes: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(cursor).replace(".", ""),
                recebidas: 0,
                concluidas: 0,
            });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        const porChave = new Map(resultado.map((item) => [item.chave, item]));
        ordensPorEntidade.forEach((ordem) => {
            const criacao = lerData(ordem.data_criacao);
            if (criacao) {
                const item = porChave.get(`${criacao.getFullYear()}-${String(criacao.getMonth() + 1).padStart(2, "0")}`);
                if (item) item.recebidas += 1;
            }
            const fimOrdem = lerData(ordem.data_fim);
            if (fimOrdem && statusConcluido(ordem) && dentroDoPeriodo(ordem.data_fim, filtros)) {
                const item = porChave.get(`${fimOrdem.getFullYear()}-${String(fimOrdem.getMonth() + 1).padStart(2, "0")}`);
                if (item) item.concluidas += 1;
            }
        });
        return resultado;
    }, [filtros, ordensPorEntidade]);

    const prioridades = useMemo(() => {
        const base = PRIORIDADES.map((prioridade) => ({
            ...prioridade,
            quantidade: ordensPeriodo.filter((ordem) => ordem.criticidade === prioridade.valor).length,
        }));
        const maximo = Math.max(1, ...base.map((item) => item.quantidade));
        return base.map((item) => ({ ...item, largura: (item.quantidade / maximo) * 100 }));
    }, [ordensPeriodo]);

    const desempenhoDepartamentos = useMemo(() => dados.departamentos.map((departamento) => {
        const ordens = ordensPorEntidade.filter((ordem) =>
            ordem.departamento_id === departamento.id &&
            (dentroDoPeriodo(ordem.data_criacao, filtros) || (statusConcluido(ordem) && dentroDoPeriodo(ordem.data_fim, filtros)))
        );
        const concluidasDepartamento = ordensPorEntidade.filter((ordem) => ordem.departamento_id === departamento.id && statusConcluido(ordem) && dentroDoPeriodo(ordem.data_fim, filtros));
        const elegiveis = concluidasDepartamento.map(slaCumprido).filter((valor): valor is boolean => valor !== null);
        return {
            id: departamento.id,
            nome: departamento.nome,
            total: ordens.length,
            percentual: elegiveis.length ? (elegiveis.filter(Boolean).length / elegiveis.length) * 100 : null,
        };
    }).filter((item) => item.total > 0 || item.percentual !== null).sort((a, b) => (b.percentual ?? -1) - (a.percentual ?? -1)), [dados.departamentos, filtros, ordensPeriodo, ordensPorEntidade]);

    const resumoClientes = useMemo(() => dados.clientes.map((cliente) => {
        const ordens = ordensPorEntidade.filter((ordem) =>
            ordem.cliente_id === cliente.id &&
            (dentroDoPeriodo(ordem.data_criacao, filtros) || (statusConcluido(ordem) && dentroDoPeriodo(ordem.data_fim, filtros)))
        );
        const concluidasCliente = ordensPorEntidade.filter((ordem) => ordem.cliente_id === cliente.id && statusConcluido(ordem) && dentroDoPeriodo(ordem.data_fim, filtros));
        const elegiveis = concluidasCliente.map(slaCumprido).filter((valor): valor is boolean => valor !== null);
        return {
            id: cliente.id,
            nome: cliente.nome,
            ordens: ordens.length,
            sla: elegiveis.length ? (elegiveis.filter(Boolean).length / elegiveis.length) * 100 : null,
        };
    }).filter((item) => item.ordens > 0).sort((a, b) => b.ordens - a.ordens).slice(0, 8), [dados.clientes, filtros, ordensPeriodo, ordensPorEntidade]);

    const atualizaRascunho = (campo: keyof FiltrosRelatorio, valor: string) => {
        setFiltrosRascunho((atual) => ({ ...atual, [campo]: valor }));
    };

    return (
        <main className="main analysis-page">
            <div className="container gestec-page-content analysis-container">
                <header className="page-heading analysis-heading">
                    <div>
                        <p className="eyebrow">ANÁLISES</p>
                        <h1>Relatórios e indicadores</h1>
                        <p>Transforme os dados operacionais em uma visão clara de desempenho e eficiência.</p>
                    </div>
                    <div className="heading-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => void carregarDados()} disabled={carregando}>
                            <i className="fa-solid fa-rotate" aria-hidden="true" /> Atualizar dados
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => exportarOrdens(ordensPeriodo, dados.clientes, dados.departamentos)} disabled={!ordensPeriodo.length}>
                            <i className="fa-solid fa-download" aria-hidden="true" /> Exportar CSV
                        </button>
                    </div>
                </header>

                {erro && <div className="analysis-alert analysis-alert--error" role="alert">{erro}</div>}

                <form className="analysis-filter-bar" onSubmit={(event) => { event.preventDefault(); setFiltros(filtrosRascunho); }}>
                    <label>
                        <span>Início do período</span>
                        <input type="date" value={filtrosRascunho.inicio} onChange={(event) => atualizaRascunho("inicio", event.target.value)} />
                    </label>
                    <label>
                        <span>Fim do período</span>
                        <input type="date" value={filtrosRascunho.fim} onChange={(event) => atualizaRascunho("fim", event.target.value)} />
                    </label>
                    <label>
                        <span>Departamento</span>
                        <select value={filtrosRascunho.departamentoId} onChange={(event) => atualizaRascunho("departamentoId", event.target.value)}>
                            <option value="">Todos os departamentos</option>
                            {dados.departamentos.map((departamento) => <option key={departamento.id} value={departamento.id}>{departamento.nome}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Cliente</span>
                        <select value={filtrosRascunho.clienteId} onChange={(event) => atualizaRascunho("clienteId", event.target.value)}>
                            <option value="">Todos os clientes</option>
                            {dados.clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
                        </select>
                    </label>
                    <button type="submit" className="btn btn-secondary" disabled={carregando}>
                        <i className="fa-solid fa-check" aria-hidden="true" /> Aplicar filtros
                    </button>
                </form>

                {carregando ? (
                    <div className="analysis-state" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Carregando indicadores reais...</div>
                ) : (
                    <>
                        <section className="analysis-kpis" aria-label="Indicadores do período">
                            <article className="analysis-kpi-card">
                                <div className="analysis-kpi-top"><span>Ordens abertas</span><i className="fa-solid fa-clipboard-list analysis-icon-blue" aria-hidden="true" /></div>
                                <strong>{ordensPeriodo.filter((ordem) => !statusConcluido(ordem)).length.toLocaleString("pt-BR")}</strong>
                                <small>Ordens ainda não concluídas no período</small>
                            </article>
                            <article className="analysis-kpi-card">
                                <div className="analysis-kpi-top"><span>Tempo médio de resolução</span><i className="fa-regular fa-clock analysis-icon-green" aria-hidden="true" /></div>
                                <strong>{tempoMedioHoras === null ? "—" : `${tempoMedioHoras.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`}</strong>
                                <small>{tempoMedioHoras === null ? "Sem ordens concluídas com datas válidas" : `${concluidas.length} concluídas no período`}</small>
                            </article>
                            <article className="analysis-kpi-card">
                                <div className="analysis-kpi-top"><span>SLA cumprido</span><i className="fa-solid fa-check analysis-icon-purple" aria-hidden="true" /></div>
                                <strong>{formatarPercentual(percentualSla)}</strong>
                                <small>{amostraSla.length ? `${amostraSla.length} ordens com prazo e conclusão` : "Sem dados suficientes de SLA"}</small>
                            </article>
                            <article className="analysis-kpi-card">
                                <div className="analysis-kpi-top"><span>Ordens concluídas</span><i className="fa-solid fa-circle-check analysis-icon-amber" aria-hidden="true" /></div>
                                <strong>{concluidas.length.toLocaleString("pt-BR")}</strong>
                                <small>Conclusões registradas no período</small>
                            </article>
                        </section>

                        <section className="analysis-grid analysis-grid-two">
                            <article className="analysis-panel">
                                <div className="analysis-panel-head">
                                    <div><h2>Evolução mensal de ordens</h2><p>Volume recebido e concluído dentro do período selecionado</p></div>
                                    <span className="analysis-chip">{meses.length} meses</span>
                                </div>
                                {meses.some((mes) => mes.recebidas || mes.concluidas) ? (
                                    <div className="analysis-chart">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={meses} margin={{ top: 12, right: 12, left: -18, bottom: 2 }} barGap={5}>
                                                <CartesianGrid stroke="var(--analysis-grid)" strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="mes" tick={{ fill: "var(--analysis-muted)", fontSize: 12 }} axisLine={{ stroke: "var(--analysis-border)" }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fill: "var(--analysis-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={{ background: "var(--analysis-surface)", border: "1px solid var(--analysis-border)", borderRadius: 10, color: "var(--analysis-ink)" }} />
                                                <Legend />
                                                <Bar dataKey="recebidas" name="Recebidas" fill="#2e7ce1" radius={[5, 5, 0, 0]} />
                                                <Bar dataKey="concluidas" name="Concluídas" fill="#63c4b0" radius={[5, 5, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <div className="analysis-empty">Não há ordens no período selecionado.</div>}
                            </article>

                            <article className="analysis-panel">
                                <div className="analysis-panel-head">
                                    <div><h2>Ordens por prioridade</h2><p>Distribuição das ordens classificadas</p></div>
                                </div>
                                <div className="analysis-progress-list">
                                    {prioridades.map((item) => (
                                        <div className="analysis-progress-row" key={item.valor}>
                                            <span>{item.nome}</span>
                                            <div className="analysis-progress-track"><span style={{ width: `${item.largura}%`, background: item.cor }} /></div>
                                            <strong>{item.quantidade}</strong>
                                        </div>
                                    ))}
                                </div>
                                <div className="analysis-panel-foot">
                                    <span>{prioridades.reduce((total, item) => total + item.quantidade, 0)} ordens classificadas</span>
                                    <span className="analysis-chip analysis-chip--success">Dados da API</span>
                                </div>
                            </article>

                            <article className="analysis-panel">
                                <div className="analysis-panel-head">
                                    <div><h2>Desempenho por departamento</h2><p>Ordens concluídas dentro do SLA registrado</p></div>
                                </div>
                                {desempenhoDepartamentos.length ? (
                                    <div className="analysis-progress-list analysis-progress-list--departments">
                                        {desempenhoDepartamentos.map((item) => (
                                            <div className="analysis-progress-row" key={item.id}>
                                                <span title={item.nome}>{item.nome}</span>
                                                <div className="analysis-progress-track"><span style={{ width: `${item.percentual ?? 0}%` }} /></div>
                                                <strong>{formatarPercentual(item.percentual)}</strong>
                                            </div>
                                        ))}
                                    </div>
                                ) : <div className="analysis-empty">Não há ordens vinculadas aos departamentos neste período.</div>}
                                <div className="analysis-panel-foot"><span>Departamentos com ordens no período</span></div>
                            </article>

                            <article className="analysis-panel analysis-client-panel">
                                <div className="analysis-panel-head">
                                    <div><h2>Resumo por cliente</h2><p>Clientes com maior volume de ordens</p></div>
                                    <span className="analysis-chip">{resumoClientes.length} clientes</span>
                                </div>
                                {resumoClientes.length ? (
                                    <div className="analysis-table-scroll">
                                        <table className="analysis-table">
                                            <thead><tr><th>Cliente</th><th>Ordens</th><th>SLA</th></tr></thead>
                                            <tbody>
                                                {resumoClientes.map((cliente) => (
                                                    <tr key={cliente.id}>
                                                        <td>{cliente.nome}</td>
                                                        <td>{cliente.ordens}</td>
                                                        <td><span className={`analysis-sla-pill${cliente.sla !== null && cliente.sla >= 90 ? " is-good" : cliente.sla !== null && cliente.sla < 80 ? " is-warning" : ""}`}>{formatarPercentual(cliente.sla)}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <div className="analysis-empty">Não há clientes com ordens no período selecionado.</div>}
                            </article>
                        </section>
                        <p className="analysis-data-note">Indicadores calculados a partir das ordens, clientes e departamentos retornados pela API. Horas registradas não são exibidas porque o contrato atual não fornece apontamentos de horas.</p>
                    </>
                )}
            </div>
        </main>
    );
}

export default Relatorios;
