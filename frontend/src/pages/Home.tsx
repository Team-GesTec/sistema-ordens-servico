import { useEffect, useMemo, useState } from "react";

import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/filters.css";
import "../styles/cards.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import "../styles/modal-os.css";

import CustomSelect from "../components/CustomSelect";
import type { SelectOption } from "../components/CustomSelect";

import { ApiError } from "../services/api";
import { getStoredUser } from "../services/auth"; // confirmar o nome real do arquivo do authService
import { funcionarioService } from "../services/funcionario";
import { ordemServicoService } from "../services/ordemServico";

import type {
    Funcionario,
    NivelCriticidade,
    OrdemServico,
    StatusOrdemServico,
    TipoOrdemServico,
} from "../types/api";

const setorOptions: SelectOption[] = [
    {
        value: 0,
        label: "Todos os setores",
    },
];

const STATUS_LABELS: Record<StatusOrdemServico, string> = {
    pendente: "Pendente",
    em_andamento: "Em andamento",
    aguardando_embarque: "Aguardando embarque",
    validacao_testes: "Validação de testes",
    bloqueado: "Bloqueado",
    review: "Review",
    concluido: "Concluído",
};

const TIPO_LABELS: Record<TipoOrdemServico, string> = {
    instalacao: "Instalação",
    manutencao: "Manutenção",
};

const CRITICIDADE_LABELS: Record<NivelCriticidade, string> = {
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    muito_alto: "Muito alto",
    urgente: "Urgente",
};

const statusOptions: SelectOption[] = Object.entries(
    STATUS_LABELS,
).map(([value, label]) => ({
    value,
    label,
}));

function Home() {
    const [search, setSearch] = useState("");
    const [selectedSetor, setSelectedSetor] = useState(0);

    const [ordens, setOrdens] = useState<OrdemServico[]>([]);

    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const [osSelecionada, setOsSelecionada] =
        useState<OrdemServico | null>(null);

    const [modalParecerAberto, setModalParecerAberto] =
        useState(false);

    const [parecerTecnico, setParecerTecnico] =
        useState("");

    const [usuarioLogado] = useState<Funcionario | null>(() => getStoredUser());
    const isGestor = usuarioLogado?.tipo === "gestor";
    const isTecnico = usuarioLogado?.tipo === "tecnico";
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [tecnicoResponsavel, setTecnicoResponsavel] = useState<number | null>(null);


    useEffect(() => {
        ordemServicoService
            .listar()
            .then(setOrdens)
            .catch((error: unknown) =>
                setErro(
                    error instanceof ApiError
                        ? error.message
                        : "Não foi possível carregar as ordens de serviço.",
                ),
            )
            .finally(() => setCarregando(false));
    }, []);

    // Só o gestor precisa da lista de funcionários
    useEffect(() => {
        if (!isGestor) return;
        funcionarioService
            .listar()
            .then(setFuncionarios)
            .catch((error: unknown) =>
                setErro(
                    error instanceof ApiError
                        ? error.message
                        : "Não foi possível carregar os funcionários.",
                ),
            );
    }, [isGestor]);

    const funcionarioOptions: SelectOption[] = funcionarios.map((item) => ({
        value: item.id,
        label: `#${item.id} — ${item.nome}`,
    }));

    const ordensFiltradas = useMemo(() => {
        const termo = search.trim().toLowerCase();

        return ordens.filter((os) => {
            const bateSetor =
                selectedSetor === 0 ||
                os.departamento_id === selectedSetor;

            if (!bateSetor) {
                return false;
            }

            if (!termo) {
                return true;
            }

            return (
                String(os.id).includes(termo) ||
                os.descricao.toLowerCase().includes(termo) ||
                TIPO_LABELS[os.tipo]
                    .toLowerCase()
                    .includes(termo) ||
                STATUS_LABELS[os.status]
                    .toLowerCase()
                    .includes(termo)
            );
        });
    }, [ordens, search, selectedSetor]);

    function fecharModal() {
        setOsSelecionada(null);
        setTecnicoResponsavel(null);
    }

    function atribuirTecnico(value: string | number) {
        if (!osSelecionada) {
            return;
        }

        setTecnicoResponsavel(Number(value));
        // TODO: PUT para alterar o técnico responsável da OS osSelecionada.id, usando Number(value) como id do técnico
    }

    function assumirOS() {
        if (!osSelecionada || !usuarioLogado) {
            return;
        }

        // TODO: PUT para alterar o técnico responsável da OS osSelecionada.id, usando usuarioLogado.id
    }

    function alterarStatus(value: string | number) {
        if (!osSelecionada) {
            return;
        }

        const novoStatus = value as StatusOrdemServico;

        if (novoStatus === "concluido") {
            setParecerTecnico("");
            setModalParecerAberto(true);
            return;
        }

        setOsSelecionada({
            ...osSelecionada,
            status: novoStatus,
        });
    }

    function cancelarParecer() {
        setModalParecerAberto(false);
        setParecerTecnico("");
    }

    function confirmarConclusao() {
        const parecer = parecerTecnico.trim();

        if (!parecer || !osSelecionada) {
            return;
        }

        setOsSelecionada({
            ...osSelecionada,
            status: "concluido",
        });

        setModalParecerAberto(false);
        setParecerTecnico("");
    }

    return (
        <div className="layout">
            <main className="main">
                <div className="container">
                    <div className="filter">
                        <input
                            type="text"
                            placeholder="Pesquisar ordem de serviço"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            aria-label="Pesquisar ordem de serviço"
                        />

                        <CustomSelect
                            options={setorOptions}
                            value={selectedSetor}
                            onChange={(value) =>
                                setSelectedSetor(Number(value))
                            }
                            placeholder="Todos os setores"
                        />

                        <div className="filter-button">
                            <button disabled></button>
                            <button disabled></button>
                            <button disabled></button>
                        </div>
                    </div>

                    {erro && (
                        <p className="form-hint">
                            {erro}
                        </p>
                    )}

                    {carregando ? (
                        <p className="form-hint">
                            Carregando ordens de serviço...
                        </p>
                    ) : ordensFiltradas.length === 0 ? (
                        <p className="form-hint">
                            {ordens.length === 0
                                ? "Nenhuma ordem de serviço cadastrada ainda."
                                : "Nenhuma ordem de serviço encontrada para esse filtro."}
                        </p>
                    ) : (
                        <div className="cards">
                            {ordensFiltradas.map((os) => (
                                <div
                                    key={os.id}
                                    className={`card ${os.criticidade ?? ""
                                        }`}
                                    onClick={() =>
                                        setOsSelecionada(os)
                                    }
                                >
                                    <span className="card-title">
                                        #{os.id} —{" "}
                                        {TIPO_LABELS[os.tipo]}

                                        <br />

                                        {os.descricao.length > 80
                                            ? `${os.descricao.slice(
                                                0,
                                                80,
                                            )}...`
                                            : os.descricao}
                                    </span>

                                    <span className="card-status">
                                        {STATUS_LABELS[os.status]}

                                        {os.criticidade
                                            ? ` · ${CRITICIDADE_LABELS[os.criticidade]}`
                                            : ""}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {osSelecionada && (
                <div
                    className="modal-overlay"
                    onClick={fecharModal}
                >
                    <div
                        className="modal-os"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <button
                            className="modal-close"
                            type="button"
                            onClick={fecharModal}
                            aria-label="Fechar detalhes da ordem de serviço"
                        >
                            ×
                        </button>

                        <div className="modal-header">
                            <span className="modal-id">
                                O.S. #{osSelecionada.id}
                            </span>

                            <p className="modal-projeto">
                                {TIPO_LABELS[
                                    osSelecionada.tipo
                                ]}
                            </p>

                            <p className="modal-projeto">
                                Ordem de serviço
                            </p>
                        </div>

                        <div className="modal-body">
                            <div className="modal-datas">
                                <div className="modal-info-item">
                                    <span className="modal-label">
                                        Data de criação
                                    </span>

                                    <p>
                                        Ainda não registrada
                                    </p>
                                </div>

                                <div className="modal-info-item">
                                    <span className="modal-label">
                                        Prazo de entrega
                                    </span>

                                    <p>
                                        Ainda não definido
                                    </p>
                                </div>
                            </div>

                            <div className="modal-status">
                                <CustomSelect
                                    options={statusOptions}
                                    value={osSelecionada.status}
                                    onChange={alterarStatus}
                                    placeholder="Selecione o status"
                                    className="modal-status-select"
                                />
                            </div>

                            <div className="modal-detalhes">
                                <div>
                                    <span className="modal-label">
                                        Criticidade
                                    </span>

                                    <p
                                        className={`modal-criticidade ${osSelecionada.criticidade ??
                                            ""
                                            }`}
                                    >
                                        {osSelecionada.criticidade
                                            ? CRITICIDADE_LABELS[
                                            osSelecionada
                                                .criticidade
                                            ]
                                            : "Não definida"}
                                    </p>
                                </div>
                            </div>

                            <div className="modal-detalhes">
                                <div>
                                    <span className="modal-label">
                                        Descrição
                                    </span>

                                    <p className="modal-descricao">
                                        {osSelecionada.descricao ||
                                            "Nenhuma descrição informada."}
                                    </p>
                                </div>
                            </div>

                            <div className="modal-detalhes">
                                <div>
                                    <span className="modal-label">
                                        Departamento
                                    </span>

                                    <div className="modal-departamentos">
                                        {osSelecionada.departamento_id ? (
                                            <span>
                                                Departamento{" "}
                                                {
                                                    osSelecionada.departamento_id
                                                }
                                            </span>
                                        ) : (
                                            <span>
                                                Não informado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {isGestor && (
                                <div className="modal-detalhes">
                                    <div>
                                        <span className="modal-label">
                                            Técnico responsável
                                        </span>

                                        <CustomSelect
                                            className="modal-tecnico"
                                            options={funcionarioOptions}
                                            value={tecnicoResponsavel}
                                            onChange={atribuirTecnico}
                                            placeholder="Selecione o funcionário"
                                        />
                                    </div>
                                </div>
                            )}

                            {isTecnico && (
                                <div className="">
                                    <button
                                        type="button"
                                        className="btn-primary modal-tecnico"
                                        onClick={assumirOS}
                                    >
                                        Assumir OS
                                    </button>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {modalParecerAberto && (
                <div
                    className="modal-overlay"
                    onClick={cancelarParecer}
                >
                    <div
                        className="modal-parecer"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            className="modal-close"
                            type="button"
                            onClick={cancelarParecer}
                            aria-label="Fechar parecer técnico"
                        >
                            ×
                        </button>

                        <div className="modal-parecer-header">
                            <span>PARECER TÉCNICO</span>

                            <h2>
                                Concluir O.S. #{osSelecionada?.id}
                            </h2>
                        </div>

                        <div className="modal-parecer-body">
                            <label htmlFor="parecer-tecnico">
                                Parecer técnico
                            </label>

                            <textarea
                                id="parecer-tecnico"
                                value={parecerTecnico}
                                onChange={(event) =>
                                    setParecerTecnico(event.target.value)
                                }
                                placeholder="Descreva o parecer técnico da O.S..."
                                rows={6}
                            />

                            <div className="modal-parecer-actions">
                                <button
                                    type="button"
                                    onClick={cancelarParecer}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    disabled={!parecerTecnico.trim()}
                                    onClick={confirmarConclusao}
                                >
                                    Concluir O.S.
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Home;