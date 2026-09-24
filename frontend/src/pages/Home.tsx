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
        titulo: "OS03 - Relatório financeiro",
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
        titulo: "OS04 - Instalação de hardware",
        setor: "Hardware",
        status: "Pendente",
        prioridade: "Prioritária",
        tipo: "Manutenção",
        solicitante: "Pedro Santos",
        descricao: "Instalação e configuração de novos equipamentos.",
        funcionario: "Lucas Mendes",
        dataCriacao: "08/09/2026",
        prazoEntrega: "12/09/2026",
        osRelacionada: "Nenhuma"
    },

    {
        id: 5,
        titulo: "OS05 - API de funcionários",
        setor: "Backend",
        status: "Em andamento",
        prioridade: "Alta",
        tipo: "Projeto",
        solicitante: "Fernanda Alves",
        descricao: "Desenvolvimento da API para gerenciamento de funcionários.",
        funcionario: "Rafael Lima",
        dataCriacao: "12/09/2026",
        prazoEntrega: "25/09/2026",
        osRelacionada: "OS02"
    },

    {
        id: 6,
        titulo: "OS06 - Tela de login",
        setor: "Frontend",
        status: "Concluído",
        prioridade: "Média",
        tipo: "Projeto",
        solicitante: "Carlos Oliveira",
        descricao: "Criação e estilização da tela de login.",
        funcionario: "Ana Costa",
        dataCriacao: "09/09/2026",
        prazoEntrega: "14/09/2026",
        osRelacionada: "Nenhuma"
    },

    {
        id: 7,
        titulo: "OS07 - Backup do servidor",
        setor: "Backend",
        status: "Pendente",
        prioridade: "Alta",
        tipo: "Manutenção",
        solicitante: "Marcos Ribeiro",
        descricao: "Configuração de rotina automática de backup.",
        funcionario: "Rafael Lima",
        dataCriacao: "13/09/2026",
        prazoEntrega: "17/09/2026",
        osRelacionada: "OS02"
    },

    {
        id: 8,
        titulo: "OS08 - Dashboard financeiro",
        setor: "Financeiro",
        status: "Em andamento",
        prioridade: "Média",
        tipo: "Projeto",
        solicitante: "Juliana Martins",
        descricao: "Desenvolvimento do dashboard financeiro.",
        funcionario: "Lucas Mendes",
        dataCriacao: "14/09/2026",
        prazoEntrega: "28/09/2026",
        osRelacionada: "OS03"
    },

    {
        id: 9,
        titulo: "OS09 - Atualização dos computadores",
        setor: "Hardware",
        status: "Concluído",
        prioridade: "Baixa",
        tipo: "Manutenção",
        solicitante: "João Silva",
        descricao: "Atualização dos sistemas operacionais dos computadores.",
        funcionario: "Carlos Oliveira",
        dataCriacao: "07/09/2026",
        prazoEntrega: "15/09/2026",
        osRelacionada: "OS04"
    },

    {
        id: 10,
        titulo: "OS10 - Sistema de chamados",
        setor: "Frontend",
        status: "Em andamento",
        prioridade: "Prioritária",
        tipo: "Projeto",
        solicitante: "Maria Souza",
        descricao: "Implementação da interface do sistema de chamados.",
        funcionario: "Ana Costa",
        dataCriacao: "15/09/2026",
        prazoEntrega: "30/09/2026",
        osRelacionada: "OS01"
    },

    {
        id: 11,
        titulo: "OS11 - Configuração de rede",
        setor: "Hardware",
        status: "Pendente",
        prioridade: "Alta",
        tipo: "Manutenção",
        solicitante: "Bruno Ferreira",
        descricao: "Configuração da rede interna do setor administrativo.",
        funcionario: "Carlos Oliveira",
        dataCriacao: "16/09/2026",
        prazoEntrega: "22/09/2026",
        osRelacionada: "Nenhuma"
    },

    {
        id: 12,
        titulo: "OS12 - Relatório de estoque",
        setor: "Financeiro",
        status: "Concluído",
        prioridade: "Baixa",
        tipo: "Relatório",
        solicitante: "Mariana Costa",
        descricao: "Geração do relatório mensal de estoque.",
        funcionario: "Lucas Mendes",
        dataCriacao: "10/09/2026",
        prazoEntrega: "16/09/2026",
        osRelacionada: "Nenhuma"
    },

    {
        id: 13,
        titulo: "OS13 - Autenticação da API",
        setor: "Backend",
        status: "Em andamento",
        prioridade: "Prioritária",
        tipo: "Projeto",
        solicitante: "Rafael Lima",
        descricao: "Implementação de autenticação e controle de acesso na API.",
        funcionario: "Ana Costa",
        dataCriacao: "17/09/2026",
        prazoEntrega: "27/09/2026",
        osRelacionada: "OS05"
    },

    {
        id: 14,
        titulo: "OS14 - Página de clientes",
        setor: "Frontend",
        status: "Pendente",
        prioridade: "Média",
        tipo: "Projeto",
        solicitante: "Fernanda Alves",
        descricao: "Criação da página de gerenciamento de clientes.",
        funcionario: "Carlos Oliveira",
        dataCriacao: "18/09/2026",
        prazoEntrega: "29/09/2026",
        osRelacionada: "OS06"
    },

    {
        id: 15,
        titulo: "OS15 - Manutenção do servidor",
        setor: "Backend",
        status: "Concluído",
        prioridade: "Alta",
        tipo: "Manutenção",
        solicitante: "Marcos Ribeiro",
        descricao: "Manutenção preventiva do servidor principal.",
        funcionario: "Rafael Lima",
        dataCriacao: "06/09/2026",
        prazoEntrega: "13/09/2026",
        osRelacionada: "OS07"
    },

    {
        id: 16,
        titulo: "OS16 - Gráficos de desempenho",
        setor: "Frontend",
        status: "Em andamento",
        prioridade: "Média",
        tipo: "Relatório",
        solicitante: "Juliana Martins",
        descricao: "Criação de gráficos para acompanhamento de desempenho.",
        funcionario: "Lucas Mendes",
        dataCriacao: "18/09/2026",
        prazoEntrega: "26/09/2026",
        osRelacionada: "OS08"
    },

    {
        id: 17,
        titulo: "OS17 - Troca de equipamentos",
        setor: "Hardware",
        status: "Pendente",
        prioridade: "Prioritária",
        tipo: "Manutenção",
        solicitante: "Bruno Ferreira",
        descricao: "Substituição de equipamentos com defeito.",
        funcionario: "Carlos Oliveira",
        dataCriacao: "19/09/2026",
        prazoEntrega: "23/09/2026",
        osRelacionada: "OS11"
    },

    {
        id: 18,
        titulo: "OS18 - Cadastro de usuários",
        setor: "Backend",
        status: "Em andamento",
        prioridade: "Alta",
        tipo: "Projeto",
        solicitante: "Maria Souza",
        descricao: "Implementação do cadastro e gerenciamento de usuários.",
        funcionario: "Ana Costa",
        dataCriacao: "19/09/2026",
        prazoEntrega: "01/10/2026",
        osRelacionada: "OS05"
    },

    {
        id: 19,
        titulo: "OS19 - Relatório de projetos",
        setor: "Financeiro",
        status: "Pendente",
        prioridade: "Baixa",
        tipo: "Relatório",
        solicitante: "Pedro Santos",
        descricao: "Geração de relatório consolidado dos projetos.",
        funcionario: "Lucas Mendes",
        dataCriacao: "20/09/2026",
        prazoEntrega: "25/09/2026",
        osRelacionada: "OS03"
    },

    {
        id: 20,
        titulo: "OS20 - Segurança do sistema",
        setor: "Backend",
        status: "Em andamento",
        prioridade: "Prioritária",
        tipo: "Projeto",
        solicitante: "João Silva",
        descricao: "Implementação de medidas adicionais de segurança no sistema.",
        funcionario: "Rafael Lima",
        dataCriacao: "20/09/2026",
        prazoEntrega: "05/10/2026",
        osRelacionada: "OS13"
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

    const filteredOrders = ordens
        .filter((ordem) => {
            const matchesSearch = ordem.titulo
                .toLowerCase()
                .includes(search.toLowerCase());

            const matchesSetor =
                selectedSetor === "" ||
                ordem.setor === selectedSetor;

            return matchesSearch && matchesSetor;
        })
        .sort((a, b) => {
            const aConcluido = a.status === "Concluído";
            const bConcluido = b.status === "Concluído";

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
