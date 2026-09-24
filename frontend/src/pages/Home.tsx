import { useState } from "react";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/filters.css";
import "../styles/cards.css";
import "../styles/details.css";
import "../styles/darkmode.css";
import CustomSelect from "../components/CustomSelect";
import type { SelectOption } from "../components/CustomSelect"
import logo from "../images/logo_gestec.png";
import type { OrdemServico } from "../../../backend/src/models/modelOrdemServico";
import { status_enum } from "../../../backend/prisma/generated/enums";


const ordens: OrdemServico[] = [
    {
        id: 1,
        departamento_id: 1,
        status: "em_andamento",
        criticidade: "medio",
        tipo: "instalacao",
        cliente_id: 1,
        solicitante_id: 1,
        descricao: "Desenvolvimento da página inicial do sistema.",
        responsavel_id: 1,
        parecer_tecnico: null,
        projeto_id: 1,
        data_criacao: new Date("10/09/2026"),
        prazo_horas: 10,
        anterior_id: null
    },

    {
        id: 2,
        departamento_id: 2,
        status: "em_andamento",
        criticidade: "muito_alto",
        tipo: "instalacao",
        cliente_id: 2,
        solicitante_id: 2,
        descricao: "Desenvolvimento da página inicial do sistema.",
        responsavel_id: 2,
        parecer_tecnico: null,
        projeto_id: 2,
        data_criacao: new Date("10/09/2026"),
        prazo_horas: 11,
        anterior_id: null
    },

    {
        id: 3,
        departamento_id: 1,
        status: "em_andamento",
        criticidade: "urgente",
        tipo: "instalacao",
        cliente_id: 3,
        solicitante_id: 3,
        descricao: "Desenvolvimento da página inicial do sistema.",
        responsavel_id: 3,
        parecer_tecnico: null,
        projeto_id: 3,
        data_criacao: new Date("10/09/2026"),
        prazo_horas: 5,
        anterior_id: null
    },
];

const setorOptions: SelectOption[] = [
    { value: 0, label: "Todos os setores" },
    { value: 1, label: "Compras" },
    { value: 2, label: "SST" },
    { value: 3, label: "Hardware" },
];

function getPriorityClass(prioridade: string) {
    switch (prioridade) {
        case "baixo":
            return "prioridade-baixa";

        case "medio":
            return "prioridade-media";

        case "alto":
            return "prioridade-alta";

        case "muito_alto":
            return "prioridade-muito-alta";

        case "urgente":
            return "prioridade-urgente";

        default:
            return "";
    }

}

function Home() {
    const [selectedOrder, setSelectedOrder] =
        useState<OrdemServico | null>(null);

    const [search, setSearch] = useState("");

    const [selectedSetor, setSelectedSetor] = useState(0);

    const filteredOrders = ordens
        .filter((ordem) => {
            const matchesSearch = ordem.descricao
                .toLowerCase()
                .includes(search.toLowerCase());

            const matchesSetor =
                selectedSetor === 0 ||
                ordem.departamento_id === selectedSetor;

            return matchesSearch && matchesSetor;
        })
        .sort((a, b) => {
            const aConcluido = a.status === "concluido";
            const bConcluido = b.status === "concluido";

            return Number(aConcluido) - Number(bConcluido);
        });

    return (
        <div
            className={`layout ${selectedOrder ? "details-open" : ""
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
                        />


                        <CustomSelect
                            options={setorOptions}
                            value={selectedSetor}
                            onChange={setSelectedSetor}
                            placeholder="Todos os setores"
                        />


                        <div className="filter-button">
                            <button></button>
                            <button></button>
                            <button></button>
                        </div>

                    </div>


                    <div className="cards">

                        {filteredOrders.map((ordem) => (

                            <div
                                key={ordem.id}
                                className={`card ${selectedOrder?.id === ordem.id
                                    ? "selected"
                                    : ""
                                    } ${ordem.status === "concluido"
                                        ? "concluido"
                                        : getPriorityClass(ordem.criticidade)
                                    }`}
                                onClick={() =>
                                    setSelectedOrder(ordem)
                                }
                            >

                                <span className="card-title">
                                    {ordem.descricao}
                                </span>

                                <span className="card-status">
                                    {ordem.status}
                                </span>

                            </div>

                        ))}

                    </div>

                </div>

            </main>


            <aside className="details">

                {selectedOrder && (

                    <div className="details-content">

                        <div className="details-header">

                            <span>
                                {selectedOrder.descricao}
                            </span>

                            <button
                                className="details-close"
                                onClick={() =>
                                    setSelectedOrder(null)
                                }
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>

                        </div>


                        <div className="details-info">

                            <div className="info-row">
                                <span>Detalhes</span>
                            </div>


                            <div className="info-grid">

                                <div>
                                    <span>Criticidade</span>
                                    <strong>
                                        {selectedOrder.criticidade}
                                    </strong>
                                </div>

                                <div>
                                    <span>Tipo</span>
                                    <strong>
                                        {selectedOrder.tipo}
                                    </strong>
                                </div>

                                <div>
                                    <span>Status</span>
                                    <strong>
                                        {selectedOrder.status}
                                    </strong>
                                </div>

                            </div>


                            <div className="info-field">
                                <span>Setor</span>
                                <strong>
                                    {selectedOrder.departamento_id}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>Solicitante</span>
                                <strong>
                                    {selectedOrder.solicitante_id}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>Descrição</span>
                                <strong>
                                    {selectedOrder.descricao}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>Funcionário responsável</span>
                                <strong>
                                    {selectedOrder.responsavel_id}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>Data de criação</span>
                                <strong>
                                    {(selectedOrder.data_criacao).toISOString()}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>Prazo de entrega</span>
                                <strong>
                                    {selectedOrder.prazo_horas}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>O.S Relacionada</span>
                                <strong>
                                    {selectedOrder.anterior_id}
                                </strong>
                            </div>

                        </div>

                    </div>

                )}

            </aside>

        </div>
    );

}

export default Home;
