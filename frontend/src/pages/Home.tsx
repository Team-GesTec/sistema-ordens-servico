import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
} from "recharts";

import { ApiError, apiRequest } from "../services/api";
import { getStoredUser } from "../services/auth";
import { ordemServicoService } from "../services/ordemServico";
import { departamentoService } from "../services/departamento";
import { funcionarioService } from "../services/funcionario";
import { projetoService } from "../services/projeto";

import type {
    Departamento,
    Funcionario,
    NivelCriticidade,
    OrdemServico,
    Projeto,
    StatusOrdemServico,
} from "../types/api";

import NotificacoesSla from "../components/NotificacoesSla";
import type { NotificacaoSla } from "../types/notificacao";
import { formatarDataOrdem, parseDataOrdem, STATUS_LABELS } from "../utils/ordemServicoUtils";

const CORES_STATUS: Record<StatusOrdemServico, string> = {
    em_andamento: "#1689ca",
    aguardando: "#f59e0b",
    validacao_testes: "#8b5cf6",
    bloqueado: "#ef4444",
    concluido: "#22c55e",
};

const ROTULOS_STATUS: Record<StatusOrdemServico, string> = {
    em_andamento: "Em andamento",
    aguardando: "Aguardando",
    validacao_testes: "Validação de testes",
    bloqueado: "Bloqueado",
    concluido: "Concluído",
};

const CORES_CRITICIDADE: Record<NivelCriticidade, string> = {
    baixo: "#22c55e",
    medio: "#eab308",
    alto: "#f97316",
    muito_alto: "#ef4444",
    urgente: "#991b1b",
};

const ROTULOS_CRITICIDADE: Record<NivelCriticidade, string> = {
    baixo: "Baixa",
    medio: "Média",
    alto: "Alta",
    muito_alto: "Muito alta",
    urgente: "Urgente",
};

type DadosDashboard = {
    ordens: OrdemServico[];
    departamentos: Departamento[];
    funcionarios: Funcionario[];
    projetos: Projeto[];
};

function contar<T extends string>(
    valores: T[],
    ordem: T[],
    rotulos: Record<T, string>,
    cores: Record<T, string>,
) {
    return ordem.map((valor) => ({
        chave: valor,
        nome: rotulos[valor],
        quantidade: valores.filter((item) => item === valor).length,
        cor: cores[valor],
    }));
}

function Dashboard() {
    const usuario = getStoredUser();
    const navigate = useNavigate();

    const [dados, setDados] = useState<DadosDashboard>({
        ordens: [],
        departamentos: [],
        funcionarios: [],
        projetos: [],
    });

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [notificacoes, setNotificacoes] = useState<NotificacaoSla[]>([]);

    // Carrega as notificações de SLA.
    useEffect(() => {
        apiRequest<NotificacaoSla[]>("/notificacoes")
            .then(setNotificacoes)
            .catch((error: unknown) => {
                console.error("Erro ao carregar notificações de SLA:", error);
            });
    }, []);

    const carregarDados = useCallback(async (inicial = false) => {
        if (inicial) {
            setCarregando(true);
        }
        setErro(null);

        try {
            const [ordens, departamentos, funcionarios, projetos] =
                await Promise.all([
                    ordemServicoService.listar(),
                    departamentoService.listar(),
                    funcionarioService.listar(),
                    projetoService.listar(),
                ]);

            setDados({
                ordens,
                departamentos,
                funcionarios,
                projetos,
            });
        } catch (error: unknown) {
            setErro(
                error instanceof ApiError
                    ? error.message
                    : "Não foi possível carregar os dados do dashboard.",
            );
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        void carregarDados(true);
    }, [carregarDados]);

    const departamentoId = usuario?.departamento_id;

    const ordensDepartamento = useMemo(
        () =>
            dados.ordens.filter(
                (ordem) => ordem.departamento_id === departamentoId,
            ),
        [dados.ordens, departamentoId],
    );

    const ordensVisiveis =
        usuario?.tipo === "gestor"
            ? dados.ordens
            : ordensDepartamento;

    const ordensDoTecnico = useMemo(
        () =>
            ordensDepartamento.filter(
                (ordem) => ordem.responsavel_id === usuario?.id,
            ),
        [ordensDepartamento, usuario?.id],
    );

    const funcionariosDepartamento = useMemo(
        () =>
            dados.funcionarios.filter(
                (funcionario) =>
                    funcionario.departamento_id === departamentoId &&
                    funcionario.ativo,
            ),
        [dados.funcionarios, departamentoId],
    );

    const statusData = useMemo(
        () =>
            contar(
                ordensVisiveis.map((ordem) => ordem.status),
                Object.keys(ROTULOS_STATUS) as StatusOrdemServico[],
                ROTULOS_STATUS,
                CORES_STATUS,
            ),
        [ordensVisiveis],
    );

    // Usa as mesmas ordens visíveis ao usuário para calcular a criticidade.
    const criticidadeData = useMemo(
        () =>
            contar(
                ordensVisiveis
                    .map((ordem) => ordem.criticidade)
                    .filter(
                        (valor): valor is NivelCriticidade =>
                            valor !== null,
                    ),
                Object.keys(ROTULOS_CRITICIDADE) as NivelCriticidade[],
                ROTULOS_CRITICIDADE,
                CORES_CRITICIDADE,
            ),
        [ordensVisiveis],
    );

    const statusTecnicoData = useMemo(
        () =>
            contar(
                ordensDoTecnico.map((ordem) => ordem.status),
                Object.keys(ROTULOS_STATUS) as StatusOrdemServico[],
                ROTULOS_STATUS,
                CORES_STATUS,
            ),
        [ordensDoTecnico],
    );

    const osPorPessoaData = useMemo(
        () =>
            funcionariosDepartamento
                .map((funcionario) => ({
                    nome: funcionario.nome,
                    quantidade: ordensDepartamento.filter(
                        (ordem) => ordem.responsavel_id === funcionario.id,
                    ).length,
                }))
                .sort((a, b) => b.quantidade - a.quantidade),
        [funcionariosDepartamento, ordensDepartamento],
    );

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const ordensAbertas = ordensVisiveis.filter((ordem) => ordem.status !== "concluido").length;
    const ordensEmAndamento = ordensVisiveis.filter((ordem) => ordem.status === "em_andamento").length;
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const concluidasNoMes = ordensVisiveis.filter((ordem) => {
        if (ordem.status !== "concluido" || !ordem.data_fim) return false;
        const data = parseDataOrdem(ordem.data_fim);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);
        return Boolean(data && data >= inicioMes && data < amanha);
    }).length;
    const ordensComSla = ordensVisiveis.filter((ordem) => ordem.status !== "concluido" && Boolean(ordem.data_limite_sla));
    const ordensDentroSla = ordensComSla.filter((ordem) => {
        const prazo = parseDataOrdem(ordem.data_limite_sla);
        if (!prazo) return false;
        prazo.setHours(0, 0, 0, 0);
        return prazo >= hoje;
    }).length;
    const percentualDentroSla = ordensComSla.length > 0
        ? `${Math.round((ordensDentroSla / ordensComSla.length) * 100)}%`
        : "—";
    const ordensRecentes = [...ordensVisiveis]
        .sort((a, b) => new Date(b.data_ultima_atualizacao ?? b.data_criacao).getTime() - new Date(a.data_ultima_atualizacao ?? a.data_criacao).getTime())
        .slice(0, 5);
    const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

    if (carregando) {
        return (
            <main className="dashboard">
                <div className="dashboard-mensagem">
                    Carregando indicadores...
                </div>
            </main>
        );
    }

    if (erro) {
        return (
            <main className="dashboard">
                <div className="dashboard-erro">
                    <p>{erro}</p>
                    <button
                        type="button"
                        onClick={() => void carregarDados()}
                    >
                        Tentar novamente
                    </button>
                </div>
            </main>
        );
    }

    if (!usuario) {
        return (
            <main className="dashboard">
                <div className="dashboard-mensagem">
                    Não foi possível identificar o usuário conectado.
                </div>
            </main>
        );
    }

    const ehGestor = usuario.tipo === "gestor";
    const ehTecnico = usuario.tipo === "tecnico";

    const tituloPerfil = ehGestor
        ? "Visão geral da empresa"
        : ehTecnico
            ? "Visão geral do técnico"
            : "Visão geral do departamento";

    return (
        <main className="dashboard">
            <NotificacoesSla
                notificacoes={notificacoes}
                onDispensar={async (id) => {
                    try {
                        await apiRequest<void>(
                            `/notificacoes/${encodeURIComponent(id)}`,
                            { method: "DELETE" },
                        );

                        setNotificacoes((atuais) =>
                            atuais.filter(
                                (notificacao) => notificacao.id !== id,
                            ),
                        );
                        return true;
                    } catch (error: unknown) {
                        // O cliente HTTP global já apresenta um toast quando a operação falha.
                        console.error("Erro ao dispensar notificação:", error);
                        return false;
                    }
                }}
            />

            <header className="dashboard-header page-heading">
                <div>
                    <span className="dashboard-eyebrow projetos-eyebrow eyebrow">{dataHoje}</span>
                    <h1>Visão geral</h1>
                    <p>Acompanhe indicadores, ordens em andamento e a saúde da operação. · {tituloPerfil}</p>
                </div>
            </header>

            <section className="dashboard-indicadores" aria-label="Indicadores principais">
                <article className="dashboard-indicador indicador-azul">
                    <span className="indicador-icone">▤</span>
                    <span className="indicador-titulo">Ordens abertas</span>
                    <strong>{ordensAbertas}</strong>
                    <small>Ordens não concluídas no seu escopo</small>
                </article>
                <article className="dashboard-indicador indicador-verde">
                    <span className="indicador-icone">◷</span>
                    <span className="indicador-titulo">Em andamento</span>
                    <strong>{ordensEmAndamento}</strong>
                    <small>Status atual informado pela API</small>
                </article>
                <article className="dashboard-indicador indicador-roxo">
                    <span className="indicador-icone">✓</span>
                    <span className="indicador-titulo">Concluídas no mês</span>
                    <strong>{concluidasNoMes}</strong>
                    <small>Conclusões registradas neste mês</small>
                </article>
                <article className="dashboard-indicador indicador-laranja">
                    <span className="indicador-icone">◉</span>
                    <span className="indicador-titulo">SLA dentro do prazo</span>
                    <strong>{percentualDentroSla}</strong>
                    <small>{ordensComSla.length > 0 ? `${ordensDentroSla} de ${ordensComSla.length} ordens abertas com prazo` : "Sem prazos de SLA disponíveis para calcular"}</small>
                </article>
            </section>

            <section className="dashboard-graficos">
                <article className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div>
                            <h2>Ordens por status</h2>
                            <p>Distribuição das ordens de serviço</p>
                        </div>
                        <span className="dashboard-card-icone">◉</span>
                    </div>

                    {statusData.some((item) => item.quantidade > 0) ? (
                        <div className="dashboard-grafico dashboard-grafico-rosca">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData.filter(
                                            (item) => item.quantidade > 0,
                                        )}
                                        dataKey="quantidade"
                                        nameKey="nome"
                                        innerRadius="62%"
                                        outerRadius="82%"
                                        paddingAngle={4}
                                        cornerRadius={5}
                                    >
                                        {statusData
                                            .filter(
                                                (item) =>
                                                    item.quantidade > 0,
                                            )
                                            .map((item) => (
                                                <Cell
                                                    key={item.chave}
                                                    fill={item.cor}
                                                />
                                            ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="dashboard-vazio">
                            Nenhuma O.S. encontrada.
                        </div>
                    )}
                </article>

                <article className="dashboard-card">
                    <div className="dashboard-card-header">
                        <div>
                            <h2>O.S. por criticidade</h2>
                            <p>Distribuição por nível de prioridade</p>
                        </div>
                        <span className="dashboard-card-icone">⚑</span>
                    </div>

                    <div className="dashboard-grafico">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={criticidadeData}
                                margin={{
                                    top: 12,
                                    right: 8,
                                    left: -20,
                                    bottom: 4,
                                }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="#e7edf4"
                                />
                                <XAxis
                                    dataKey="nome"
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    allowDecimals={false}
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip />
                                <Bar
                                    dataKey="quantidade"
                                    name="O.S."
                                    radius={[6, 6, 0, 0]}
                                >
                                    {criticidadeData.map((item) => (
                                        <Cell
                                            key={item.chave}
                                            fill={item.cor}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </article>

                {!ehTecnico && (
                    <article className="dashboard-card dashboard-card-largo">
                        <div className="dashboard-card-header">
                            <div>
                                <h2>O.S. por integrante</h2>
                                <p>
                                    Quantidade de ordens atribuídas a cada
                                    pessoa do departamento
                                </p>
                            </div>
                            <span className="dashboard-card-icone">♙</span>
                        </div>

                        {osPorPessoaData.length > 0 ? (
                            <div
                                className="dashboard-grafico"
                                style={{
                                    height: Math.max(
                                        260,
                                        osPorPessoaData.length * 48,
                                    ),
                                }}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={osPorPessoaData}
                                        layout="vertical"
                                        margin={{
                                            top: 4,
                                            right: 20,
                                            left: 16,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            horizontal={false}
                                            stroke="#e7edf4"
                                        />
                                        <XAxis
                                            type="number"
                                            allowDecimals={false}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="nome"
                                            width={110}
                                            tick={{ fontSize: 11 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip />
                                        <Bar
                                            dataKey="quantidade"
                                            name="O.S."
                                            fill="#1689ca"
                                            radius={[0, 7, 7, 0]}
                                            barSize={22}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="dashboard-vazio">
                                Nenhum integrante ativo encontrado.
                            </div>
                        )}
                    </article>
                )}

                {ehGestor && (
                    <>
                        <article className="dashboard-card">
                            <div className="dashboard-card-header">
                                <div>
                                    <h2>Horas por departamento</h2>
                                    <p>
                                        Total de horas efetivamente registradas
                                    </p>
                                </div>
                                <span className="dashboard-card-icone">◷</span>
                            </div>
                            <div className="dashboard-vazio">
                                O backend ainda precisa fornecer os registros
                                de horas para gerar este gráfico.
                            </div>
                        </article>

                        <article className="dashboard-card">
                            <div className="dashboard-card-header">
                                <div>
                                    <h2>Horas por projeto</h2>
                                    <p>Tempo registrado em cada projeto</p>
                                </div>
                                <span className="dashboard-card-icone">▥</span>
                            </div>
                            <div className="dashboard-vazio">
                                O backend ainda precisa fornecer os registros
                                de horas para gerar este gráfico.
                            </div>
                        </article>
                    </>
                )}

                {!ehGestor && (
                    <article className="dashboard-card dashboard-card-largo">
                        <div className="dashboard-card-header">
                            <div>
                                <h2>
                                    {ehTecnico
                                        ? "Minhas O.S. por status"
                                        : "Status das O.S. do departamento"}
                                </h2>
                                <p>
                                    {ehTecnico
                                        ? "Ordens atribuídas a você"
                                        : "Ordens do departamento"}
                                </p>
                            </div>
                            <span className="dashboard-card-icone">◉</span>
                        </div>

                        <div className="dashboard-grafico">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={
                                        ehTecnico
                                            ? statusTecnicoData
                                            : statusData
                                    }
                                    margin={{
                                        top: 12,
                                        right: 12,
                                        left: -20,
                                        bottom: 4,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                        stroke="#e7edf4"
                                    />
                                    <XAxis
                                        dataKey="nome"
                                        tick={{ fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip />
                                    <Bar
                                        dataKey="quantidade"
                                        name="O.S."
                                        radius={[6, 6, 0, 0]}
                                    >
                                        {(ehTecnico
                                            ? statusTecnicoData
                                            : statusData
                                        ).map((item) => (
                                            <Cell
                                                key={item.chave}
                                                fill={item.cor}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </article>
                )}

                {!ehGestor && (
                    <article className="dashboard-card">
                        <div className="dashboard-card-header">
                            <div>
                                <h2>Horas registradas</h2>
                                <p>
                                    {ehTecnico
                                        ? "Horas registradas por você"
                                        : "Horas registradas pelo departamento"}
                                </p>
                            </div>
                            <span className="dashboard-card-icone">◷</span>
                        </div>
                        <div className="dashboard-vazio">
                            Aguardando integração dos registros de horas.
                        </div>
                    </article>
                )}
            </section>

            <section className="dashboard-recentes-grid" aria-label="Ordens recentes e resumo dos status">
                <article className="dashboard-card dashboard-recentes-table">
                    <div className="dashboard-card-header">
                        <div><h2>Ordens recentes</h2><p>Ordens com atualização mais recente no escopo da sua conta.</p></div>
                        <Link to="/ordens" className="dashboard-link-action">Ver todas →</Link>
                    </div>
                    {ordensRecentes.length === 0 ? <div className="dashboard-vazio">Nenhuma ordem de serviço disponível.</div> : (
                        <div className="table-scroll"><table className="table gestec-data-table gestec-dashboard-table">
                            <thead><tr><th>Ordem / ID</th><th>Solicitação</th><th>Responsável</th><th>Status</th><th>Prioridade</th><th>Prazo</th></tr></thead>
                            <tbody>{ordensRecentes.map((ordem) => {
                                const clienteId = ordem.cliente_id;
                                const responsavel = dados.funcionarios.find((funcionario) => funcionario.id === ordem.responsavel_id);
                                return <tr
                                    key={ordem.id}
                                    className="gestec-dashboard-order-row"
                                    tabIndex={0}
                                    aria-label={`Abrir detalhes da O.S. ${ordem.id}: ${ordem.titulo}`}
                                    onClick={() => navigate(`/ordens/${ordem.id}`)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                            event.preventDefault();
                                            navigate(`/ordens/${ordem.id}`);
                                        }
                                    }}
                                >
                                    <td><Link to={`/ordens/${ordem.id}`} className="gestec-table-link">OS #{ordem.id}</Link><small className="gestec-cell-subtitle">{formatarDataOrdem(ordem.data_ultima_atualizacao ?? ordem.data_criacao)}</small></td>
                                    <td><strong className="gestec-dashboard-order-title">{ordem.titulo}</strong><small className="gestec-cell-subtitle">{clienteId !== null ? `Cliente #${clienteId}` : "Sem cliente vinculado"}</small></td>
                                    <td>{responsavel?.nome ?? (ordem.responsavel_id !== null ? `Funcionário #${ordem.responsavel_id}` : "Não atribuído")}</td>
                                    <td><span className={`gestec-status-pill gestec-os-status status-${ordem.status}`}><i aria-hidden="true" />{STATUS_LABELS[ordem.status]}</span></td>
                                    <td><span className={`gestec-priority-pill priority-${ordem.criticidade ?? "indefinida"}`}>{ordem.criticidade ? ROTULOS_CRITICIDADE[ordem.criticidade] : "Não definida"}</span></td>
                                    <td>{formatarDataOrdem(ordem.data_limite_sla)}</td>
                                </tr>;
                            })}</tbody>
                        </table></div>
                    )}
                </article>
                <article className="dashboard-card dashboard-summary-card">
                    <div className="dashboard-card-header"><div><h2>Resumo por status</h2><p>Distribuição das ordens visíveis para seu perfil.</p></div></div>
                    <div className="dashboard-status-summary">{statusData.map((item) => <div className="dashboard-status-line" key={item.chave}><span className="dashboard-status-name"><i style={{ background: item.cor }} aria-hidden="true" />{item.nome}</span><strong>{item.quantidade}</strong></div>)}</div>
                    <Link to="/ordens" className="dashboard-link-action">Acessar ordens →</Link>
                </article>
            </section>

            <section className="dashboard-atalhos" aria-labelledby="dashboard-atalhos-titulo">
                <div className="dashboard-atalhos-heading">
                    <div><h2 id="dashboard-atalhos-titulo">Acessos rápidos</h2><p>Atalhos para os módulos disponíveis no seu SGOS.</p></div>
                </div>
                <div className="dashboard-atalhos-grid">
                    <Link to="/ordens" className="dashboard-atalho"><span className="dashboard-atalho-icone">▤</span><span><strong>Ordens de serviço</strong><small>Consultar solicitações, responsáveis e prazos</small></span><b aria-hidden="true">→</b></Link>
                    <Link to="/clientes" className="dashboard-atalho"><span className="dashboard-atalho-icone dashboard-atalho-icone--green">♙</span><span><strong>Clientes</strong><small>Pesquisar os cadastros disponíveis</small></span><b aria-hidden="true">→</b></Link>
                    <Link to="/projetos" className="dashboard-atalho"><span className="dashboard-atalho-icone dashboard-atalho-icone--purple">▱</span><span><strong>Projetos</strong><small>Acompanhar iniciativas e ordens vinculadas</small></span><b aria-hidden="true">→</b></Link>
                </div>
            </section>
        </main>
    );
}

export default Dashboard;