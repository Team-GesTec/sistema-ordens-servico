import { useState } from "react";
import "../styles/home.css";
import "../styles/darkmode.css";
import CustomSelect from "../components/CustomSelect";
import type { SelectOption } from "../components/CustomSelect"

interface OrdemServico {
    id: number;
    titulo: string;
    setor: string;
    status: string;
    prioridade: string;
    tipo: string;
    solicitante: string;
    descricao: string;
    funcionario: string;
    dataCriacao: string;
    prazoEntrega: string;
    osRelacionada: string;
}

const ordens: OrdemServico[] = [
    {
        id: 1,
        titulo: "OS01 - Sistema web",
        setor: "Hardware",
        status: "Em andamento",
        prioridade: "Alta",
        tipo: "Projeto",
        solicitante: "João Silva",
        descricao: "Desenvolvimento da página inicial do sistema.",
        funcionario: "Carlos Oliveira",
        dataCriacao: "10/09/2026",
        prazoEntrega: "20/09/2026",
        osRelacionada: "Nenhuma"
    },

    {
        id: 2,
        titulo: "OS02 - Banco de dados",
        setor: "Backend",
        status: "Pendente",
        prioridade: "Média",
        tipo: "Manutenção",
        solicitante: "Maria Souza",
        descricao: "Correção de inconsistências no banco de dados.",
        funcionario: "Ana Costa",
        dataCriacao: "11/09/2026",
        prazoEntrega: "18/09/2026",
        osRelacionada: "OS01"
    },

    {
        id: 3,
        titulo: "OS03 - Relatório",
        setor: "Financeiro",
        status: "Concluído",
        prioridade: "Baixa",
        tipo: "Relatório",
        solicitante: "Pedro Santos",
        descricao: "Criação do relatório mensal de projetos.",
        funcionario: "Lucas Mendes",
        dataCriacao: "08/09/2026",
        prazoEntrega: "12/09/2026",
        osRelacionada: "Nenhuma"
    },

    {
        id: 4,
        titulo: "OS04 - Instalar hardware",
        setor: "Hardware",
        status: "Pendente",
        prioridade: "Prioritária",
        tipo: "Relatório",
        solicitante: "Pedro Santos",
        descricao: "Criação do relatório mensal de projetos.",
        funcionario: "Lucas Mendes",
        dataCriacao: "08/09/2026",
        prazoEntrega: "12/09/2026",
        osRelacionada: "Nenhuma"
    }

];

const setorOptions: SelectOption[] = [
    { value: "", label: "Todos os setores" },
    { value: "Frontend", label: "Frontend" },
    { value: "Backend", label: "Backend" },
    { value: "Hardware", label: "Hardware" },
    { value: "Financeiro", label: "Financeiro" }
];

function getPriorityClass(prioridade: string) {
    switch (prioridade) {
        case "Baixa":
            return "prioridade-baixa";

        case "Média":
            return "prioridade-media";

        case "Alta":
            return "prioridade-alta";

        case "Prioritária":
            return "prioridade-prioritaria";

        default:
            return "";
    }

}

function Home() {
    const [selectedOrder, setSelectedOrder] =
        useState<OrdemServico | null>(null);

    const [search, setSearch] = useState("");

    const [selectedSetor, setSelectedSetor] = useState("");

    const filteredOrders = ordens.filter((ordem) => {
        const matchesSearch = ordem.titulo
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesSetor =
            selectedSetor === "" ||
            ordem.setor === selectedSetor;

        return matchesSearch && matchesSetor;
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
                                    } ${ordem.status === "Concluído"
                                        ? "concluido"
                                        : getPriorityClass(ordem.prioridade)
                                    }`}
                                onClick={() =>
                                    setSelectedOrder(ordem)
                                }
                            >

                                <span className="card-title">
                                    {ordem.titulo}
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
                                {selectedOrder.titulo}
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
                                        {selectedOrder.prioridade}
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
                                    {selectedOrder.setor}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>Solicitante</span>
                                <strong>
                                    {selectedOrder.solicitante}
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
                                    {selectedOrder.funcionario}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>Data de criação</span>
                                <strong>
                                    {selectedOrder.dataCriacao}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>Prazo de entrega</span>
                                <strong>
                                    {selectedOrder.prazoEntrega}
                                </strong>
                            </div>


                            <div className="info-field">
                                <span>O.S Relacionada</span>
                                <strong>
                                    {selectedOrder.osRelacionada}
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
