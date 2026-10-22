import { useCallback, useEffect, useMemo, useState } from "react";
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

import "../styles/dashboard.css";

import { ApiError } from "../services/api";
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

    const [dados, setDados] = useState<DadosDashboard>({
        ordens: [],
        departamentos: [],
        funcionarios: [],
        projetos: [],
    });

    const [carregando, setCarregando] = useState(true);
    const [atualizando, setAtualizando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const carregarDados = useCallback(async (inicial = false) => {
        if (inicial) {
            setCarregando(true);
        } else {
            setAtualizando(true);
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
            setAtualizando(false);
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

    const horasPorDepartamento = useMemo(
        () =>
            dados.departamentos.map((departamento) => ({
                nome: departamento.nome,
                horas: null as number | null,
            })),
        [dados.departamentos],
    );

    const horasPorProjeto = useMemo(
        () =>
            dados.projetos.map((projeto) => ({
                nome: projeto.nome,
                horas: null as number | null,
            })),
        [dados.projetos],
    );

    const projetosDoDepartamento = useMemo(
        () =>
            dados.projetos.filter((projeto) =>
                projeto.departamentos.includes(departamentoId ?? -1),
            ),
        [dados.projetos, departamentoId],
    );

    const totalHoras = null as number | null;

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

    const totalOrdens = ordensVisiveis.length;

    const totalConcluidas = ordensVisiveis.filter(
        (ordem) => ordem.status === "concluido",
    ).length;

    const totalCriticas = ordensVisiveis.filter(
        (ordem) =>
            ordem.criticidade === "muito_alto" ||
            ordem.criticidade === "urgente",
    ).length;

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <div>
                    <span className="dashboard-eyebrow">
                        GESTEC / INDICADORES
                    </span>
                    <h1>Dashboard</h1>
                    <p>{tituloPerfil}</p>
                </div>

                <div className="dashboard-perfil">
                    <span className="dashboard-avatar">
                        {usuario.nome.charAt(0).toUpperCase()}
                    </span>

                    <div>
                        <strong>{usuario.nome}</strong>
                        <span>
                            {ehGestor
                                ? "Gestor"
                                : ehTecnico
                                  ? "Técnico"
                                  : "Líder / analista"}
                        </span>
                    </div>
                </div>
            </header>

            <section className="dashboard-indicadores">
                <article className="dashboard-indicador indicador-azul">
                    <span className="indicador-icone">▤</span>
                    <span className="indicador-titulo">Total de O.S.</span>
                    <strong>{totalOrdens}</strong>
                    <small>Ordens no escopo do perfil</small>
                </article>

                <article className="dashboard-indicador indicador-verde">
                    <span className="indicador-icone">✓</span>
                    <span className="indicador-titulo">Concluídas</span>
                    <strong>{totalConcluidas}</strong>
                    <small>
                        {totalOrdens > 0
                            ? `${Math.round(
                                  (totalConcluidas / totalOrdens) * 100,
                              )}% das O.S.`
                            : "Nenhuma O.S. cadastrada"}
                    </small>
                </article>

                <article className="dashboard-indicador indicador-laranja">
                    <span className="indicador-icone">!</span>
                    <span className="indicador-titulo">
                        Alta criticidade
                    </span>
                    <strong>{totalCriticas}</strong>
                    <small>Muito alta ou urgente</small>
                </article>

                <article className="dashboard-indicador indicador-roxo">
                    <span className="indicador-icone">◷</span>
                    <span className="indicador-titulo">
                        Horas registradas
                    </span>
                    <strong>
                        {totalHoras === null ? "—" : `${totalHoras} h`}
                    </strong>
                    <small>
                        Aguardando integração dos apontamentos
                    </small>
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
        </main>
    );
}

export default Dashboard;