import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import logo from "../images/logo_gestec.png";
import { getStoredUser, authService } from "../services/auth";
import type { PerfilFuncionario } from "../types/api";

interface SidebarProps {
    darkMode: boolean;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const NOMES_PERFIL: Record<PerfilFuncionario, string> = {
    gestor: "Gestor",
    analista: "Analista",
    tecnico: "Técnico",
};

function Sidebar({ darkMode, setDarkMode }: SidebarProps) {
    const navigate = useNavigate();
    const usuario = getStoredUser();

    const [perfilAberto, setPerfilAberto] = useState(false);

    const nomeUsuario = usuario?.nome ?? "Usuário";

    const iniciais = nomeUsuario
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0]?.toUpperCase() ?? "")
        .join("");

    const nomePerfil = usuario?.tipo
        ? NOMES_PERFIL[usuario.tipo]
        : "Funcionário";

    useEffect(() => {
        function fecharPerfil(event: MouseEvent) {
            const alvo = event.target;

            if (
                alvo instanceof Element &&
                !alvo.closest(".sidebar-perfil-container")
            ) {
                setPerfilAberto(false);
            }
        }

        document.addEventListener("click", fecharPerfil);

        return () => {
            document.removeEventListener("click", fecharPerfil);
        };
    }, []);

    function sair() {
        authService.logout();
        navigate("/login", { replace: true });
    }

    return (
        <aside className="sidebar">
            <img
                src={logo}
                alt="Logo da GESTEC"
                className="logo"
            />

            <nav className="sidebar-nav">
                <NavLink to="/home" className="menu-item">
                    <i className="fa-solid fa-house" />
                    <span>Início</span>
                </NavLink>

                <NavLink to="/clientes" className="menu-item">
                    <i className="fa-solid fa-users" />
                    <span>Clientes</span>
                </NavLink>

                <NavLink to="/ordens" className="menu-item">
                    <i className="fa-solid fa-clipboard-list" />
                    <span>Ordens de Serviço</span>
                </NavLink>

                <NavLink to="/projetos" className="menu-item">
                    <i className="fa-solid fa-diagram-project" />
                    <span>Projetos</span>
                </NavLink>

                <NavLink to="/funcionarios" className="menu-item">
                    <i className="fa-solid fa-user-tie" />
                    <span>Funcionários</span>
                </NavLink>
            </nav>

            <div className="sidebar-perfil-container">
                {perfilAberto && (
                    <div className="sidebar-perfil-menu">
                        <div className="perfil-menu-cabecalho">
                            <strong>{nomeUsuario}</strong>
                            <span>{nomePerfil}</span>
                        </div>

                        <button
                            type="button"
                            className="perfil-menu-item"
                            onClick={() =>
                                setDarkMode((atual) => !atual)
                            }
                        >
                            <i
                                className={
                                    darkMode
                                        ? "fa-solid fa-sun"
                                        : "fa-solid fa-moon"
                                }
                            />
                            <span>
                                {darkMode
                                    ? "Ativar modo claro"
                                    : "Ativar modo escuro"}
                            </span>
                        </button>

                        <button
                            type="button"
                            className="perfil-menu-item perfil-sair"
                            onClick={sair}
                        >
                            <i className="fa-solid fa-right-from-bracket" />
                            <span>Sair da conta</span>
                        </button>
                    </div>
                )}

                <button
                    type="button"
                    className="sidebar-perfil"
                    onClick={() =>
                        setPerfilAberto((aberto) => !aberto)
                    }
                    aria-expanded={perfilAberto}
                    aria-label={`Perfil de ${nomeUsuario}`}
                >
                    <span className="perfil-avatar">
                        {iniciais || "U"}
                    </span>

                    <span className="perfil-informacoes">
                        <strong>{nomeUsuario}</strong>
                        <small>{nomePerfil}</small>
                    </span>

                    <i
                        className={`fa-solid ${perfilAberto
                                ? "fa-chevron-down"
                                : "fa-chevron-up"
                            }`}
                        aria-hidden="true"
                    />
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
