/**
 * Exibe as ordens de serviço na tela inicial 
 * e integra o componente de notificações visuais de SLA (US#3.2).
 */

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
import { ApiError, apiRequest } from "../services/api";
import { ordemServicoService } from "../services/ordemServico";
import type {
    NivelCriticidade,
    OrdemServico,
    StatusOrdemServico,
    TipoOrdemServico,
} from "../types/api";
import NotificacoesSla from "../components/NotificacoesSla";
import type { NotificacaoSla } from "../types/notificacao";

const setorOptions: SelectOption[] = [
    { value: 0, label: "Todos os setores" },
];

const STATUS_LABELS: Record<StatusOrdemServico, string> = {
    em_andamento: "Em andamento",
    aguardando: "Aguardando",
    validacao_testes: "Validação de testes",
    bloqueado: "Bloqueado",
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
    const [notificacoes, setNotificacoes] = useState<NotificacaoSla[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    // US#3.2: Carrega as ordens de serviço para exibição na Home.
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


    useEffect(() => {
        apiRequest<NotificacaoSla[]>("/notificacoes")
            .then(setNotificacoes)
            .catch((error: unknown) => {
                console.error("Erro ao carregar notificações de SLA:", error);
            });
    }, []);


    // US#3.2: Filtra as ordens de serviço conforme a pesquisa e o setor selecionado.
    const ordensFiltradas = useMemo(() => {
        const termo = search.trim().toLowerCase();

        return ordens.filter((os) => {
            const bateSetor =
                selectedSetor === 0 || os.departamento_id === selectedSetor;

            if (!bateSetor) return false;
            if (!termo) return true;

            return (
                String(os.id).includes(termo) ||
                os.descricao.toLowerCase().includes(termo) ||
                TIPO_LABELS[os.tipo].toLowerCase().includes(termo) ||
                STATUS_LABELS[os.status].toLowerCase().includes(termo)
            );
        });
    }, [ordens, search, selectedSetor]);

    return (
        <div className="layout">
            {/* US#3.2: Exibe as notificações de SLA recebidas do backend. */}
            <NotificacoesSla
                notificacoes={notificacoes}
                onDispensar={async (id) => {
                    try {
                        await apiRequest<void>(`/notificacoes/${encodeURIComponent(id)}`, {
                            method: "DELETE",
                        });

                        setNotificacoes((atuais) =>
                            atuais.filter((notificacao) => notificacao.id !== id),
                        );
                    } catch (error: unknown) {
                        console.error("Erro ao dispensar notificação:", error);

                        window.alert(
                            error instanceof ApiError
                                ? error.message
                                : "Não foi possível dispensar a notificação. Tente novamente.",
                        );
                    }
                }}
            />

            <main className="main">
                <div className="container">
                    <div className="filter">
                        <input
                            type="text"
                            placeholder="Pesquisar ordem de serviço"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
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

                    {erro && <p className="form-hint">{erro}</p>}

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
                                >
                                    <span className="card-title">
                                        #{os.id} — {TIPO_LABELS[os.tipo]}
                                        <br />
                                        {os.descricao.length > 80
                                            ? `${os.descricao.slice(0, 80)}...`
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

            <aside className="details" />
        </div>
    );
}

export default Home;
