import { useEffect, useMemo, useState } from "react";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/filters.css";
import "../styles/cards.css";
import "../styles/details.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import CustomSelect from "../components/CustomSelect";
import type { SelectOption } from "../components/CustomSelect";
import { getStoredUser } from "../services/auth";
import { ApiError } from "../services/api";
import { ordemServicoService } from "../services/ordemServico";
import type {
    NivelCriticidade,
    OrdemServico,
    StatusOrdemServico,
    TipoOrdemServico,
} from "../types/api";

const setorOptions: SelectOption[] = [
    { value: 0, label: "Todos os setores" },
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

function Home() {
    const [search, setSearch] = useState("");
    const [selectedSetor, setSelectedSetor] = useState(0);
    const [ordens, setOrdens] = useState<OrdemServico[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const [selectedOrdem, setSelectedOrdem] =
        useState<OrdemServico | null>(null);

    const usuario = getStoredUser();

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

    const ordensFiltradas = useMemo(() => {
        const termo = search.trim().toLowerCase();

        return ordens.filter((os) => {
            const bateSetor =
                selectedSetor === 0 ||
                os.departamento_id === selectedSetor;

            if (!bateSetor) return false;

            if (!termo) return true;

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

    return (
        <div
            className={`layout ${selectedOrdem ? "details-open" : ""
                }`}
        >
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
                            onChange={setSelectedSetor}
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
                                    className={`card ${os.criticidade}`}
                                    onClick={() =>
                                        setSelectedOrdem(os)
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

            <aside className="details">
                {selectedOrdem && (
                    <div className="details-content">

                        <div className="details-header">
                            <div className="details-header-info">
                                <span className="details-os-number">OS #{selectedOrdem.id}</span>
                                <h2>{TIPO_LABELS[selectedOrdem.tipo]}</h2>
                            </div>

                            <button
                                className="details-close"
                                onClick={() => setSelectedOrdem(null)}
                                aria-label="Fechar detalhes"
                            >
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>

                        <div className="details-badges">
                            <span className={`details-badge status-${selectedOrdem.status}`}>
                                <i className="fa-solid fa-circle-dot" />
                                {STATUS_LABELS[selectedOrdem.status]}
                            </span>

                            <span
                                className={`details-badge criticidade-${selectedOrdem.criticidade ?? "indefinida"}`}
                            >
                                <i className="fa-solid fa-bolt" />
                                {selectedOrdem.criticidade
                                    ? CRITICIDADE_LABELS[selectedOrdem.criticidade]
                                    : "Não definida"}
                            </span>
                        </div>

                        <div className="details-info">

                            <div className="info-section">
                                <span className="info-section-title">Informações gerais</span>

                                <div className="info-grid">
                                    <div className="info-item">
                                        <div className="info-icon">
                                            <i className="fa-solid fa-user" />
                                        </div>
                                        <div
                                            className="info-text"
                                            title={`Cliente #${selectedOrdem.cliente_id}`}
                                        >
                                            <span>Cliente</span>
                                            <strong>#{selectedOrdem.cliente_id}</strong>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">
                                            <i className="fa-solid fa-sitemap" />
                                        </div>
                                        <div
                                            className="info-text"
                                            title={`Departamento #${selectedOrdem.departamento_id}`}
                                        >
                                            <span>Departamento</span>
                                            <strong>#{selectedOrdem.departamento_id}</strong>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">
                                            <i className="fa-solid fa-folder-open" />
                                        </div>
                                        <div
                                            className="info-text"
                                            title={
                                                selectedOrdem.projeto_id
                                                    ? `Projeto #${selectedOrdem.projeto_id}`
                                                    : "Nenhum projeto"
                                            }
                                        >
                                            <span>Projeto</span>
                                            <strong>
                                                {selectedOrdem.projeto_id
                                                    ? `#${selectedOrdem.projeto_id}`
                                                    : "Nenhum"}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">
                                            <i className="fa-solid fa-screwdriver-wrench" />
                                        </div>
                                        <div
                                            className="info-text"
                                            title={`Tipo: ${TIPO_LABELS[selectedOrdem.tipo]}`}
                                        >
                                            <span>Tipo</span>
                                            <strong>
                                                {TIPO_LABELS[selectedOrdem.tipo]}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section">
                                <span className="info-section-title">Descrição</span>

                                <p className="info-description">
                                    {selectedOrdem.descricao}
                                </p>
                            </div>

                            <div className="info-section">
                                <span className="info-section-title">Histórico</span>

                                <div className="info-item info-item-full">
                                    <div className="info-icon">
                                        <i className="fa-solid fa-clock-rotate-left" />
                                    </div>
                                    <div className="info-text">
                                        <span>OS anterior</span>
                                        <strong>
                                            {selectedOrdem.anterior_id
                                                ? `OS #${selectedOrdem.anterior_id}`
                                                : "Nenhuma"}
                                        </strong>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </aside>
        </div>
    );
}

export default Home;