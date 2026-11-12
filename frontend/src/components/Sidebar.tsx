
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import logo from "../images/AZUL.CLARO_BRANCO_SemNome.png";
import { getStoredUser, authService } from "../services/auth";
import type { PerfilFuncionario } from "../types/api";
import {
    getGestecAvatarTone,
    getGestecInitials,
} from "../utils/gestecAvatar";

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
    const iniciais = getGestecInitials(nomeUsuario, "US");

    const corAvatar = getGestecAvatarTone(
        Math.max(0, (usuario?.id ?? 1) - 1)
    );

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
        <aside
            id="gestec-primary-sidebar"
            className="sidebar"
            aria-label="Navegação principal"
        >
            {/* LOGO */}
            <NavLink
                to="/home"
                className="sidebar-brand"
                aria-label="GesTec — página inicial"
            >
                <span className="sidebar-brand-mark">
                    <img src={logo} alt="" />
                </span>
            </NavLink>

            {/* NAVEGAÇÃO */}
            <nav className="sidebar-nav">

                {/* MENU PRINCIPAL */}
                <div className="sidebar-nav-section">

                    <NavLink
                        to="/home"
                        className="menu-item"
                        aria-label="Visão geral"
                    >
                        <i
                            className="fa-solid fa-house"
                            aria-hidden="true"
                        />
                        <span>Visão geral</span>
                    </NavLink>

                    <NavLink
                        to="/ordens"
                        className="menu-item"
                        aria-label="Ordens de serviço"
                    >
                        <i
                            className="fa-solid fa-clipboard-list"
                            aria-hidden="true"
                        />
                        <span>Ordens de serviço</span>
                    </NavLink>

                </div>

                {/* GESTÃO */}
                <div className="sidebar-nav-section">

                    <NavLink
                        to="/clientes"
                        className="menu-item"
                        aria-label="Clientes"
                    >
                        <i
                            className="fa-solid fa-users"
                            aria-hidden="true"
                        />
                        <span>Clientes</span>
                    </NavLink>

                    <NavLink
                        to="/projetos"
                        className="menu-item"
                        aria-label="Projetos"
                    >
                        <i
                            className="fa-solid fa-diagram-project"
                            aria-hidden="true"
                        />
                        <span>Projetos</span>
                    </NavLink>

                    <NavLink
                        to="/funcionarios"
                        className="menu-item"
                        aria-label="Funcionários"
                    >
                        <i
                            className="fa-solid fa-user-tie"
                            aria-hidden="true"
                        />
                        <span>Funcionários</span>
                    </NavLink>

                    <NavLink
                        to="/departamentos"
                        className="menu-item"
                        aria-label="Departamentos"
                    >
                        <i
                            className="fa-solid fa-building"
                            aria-hidden="true"
                        />
                        <span>Departamentos</span>
                    </NavLink>

                </div>

                {/* ANÁLISES */}
                <div className="sidebar-nav-section">

                    <NavLink
                        to="/auditoria"
                        className="menu-item"
                        aria-label="Logs de auditoria"
                    >
                        <i
                            className="fa-solid fa-clock-rotate-left"
                            aria-hidden="true"
                        />
                        <span>Logs de auditoria</span>
                    </NavLink>

                    <NavLink
                        to="/relatorios"
                        className="menu-item"
                        aria-label="Relatórios"
                    >
                        <i
                            className="fa-solid fa-chart-line"
                            aria-hidden="true"
                        />
                        <span>Relatórios</span>
                    </NavLink>

                </div>
            </nav>

            {/* PERFIL */}
            <div className="sidebar-perfil-container">

                {/* MENU SUSPENSO */}
                <div
                    className={`sidebar-perfil-menu${
                        perfilAberto ? " aberto" : ""
                    }`}
                    aria-hidden={!perfilAberto}
                >
                    <div className="perfil-menu-cabecalho">
                        <strong>{nomeUsuario}</strong>
                        <span>{nomePerfil}</span>
                    </div>

                    {/* ALTERAR TEMA */}
                    <button
                        type="button"
                        className="perfil-menu-item perfil-menu-tema"
                        onClick={() =>
                            setDarkMode((atual) => !atual)
                        }
                        aria-pressed={darkMode}
                    >
                        <i
                            className={`fa-solid ${
                                darkMode ? "fa-sun" : "fa-moon"
                            }`}
                            aria-hidden="true"
                        />

                        <span>
                            {darkMode
                                ? "Ativar tema claro"
                                : "Ativar tema escuro"}
                        </span>

                        <span
                            className={`sidebar-theme-switch${
                                darkMode ? " ligado" : ""
                            }`}
                            aria-hidden="true"
                        >
                            <span />
                        </span>
                    </button>

                    {/* SAIR */}
                    <button
                        type="button"
                        className="perfil-menu-item perfil-sair"
                        onClick={sair}
                    >
                        <i
                            className="fa-solid fa-right-from-bracket"
                            aria-hidden="true"
                        />
                        <span>Sair da conta</span>
                    </button>
                </div>

                {/* BOTÃO DO PERFIL */}
                <button
                    type="button"
                    className="sidebar-perfil"
                    onClick={() =>
                        setPerfilAberto((aberto) => !aberto)
                    }
                    aria-expanded={perfilAberto}
                    aria-label={`Perfil de ${nomeUsuario}`}
                >
                    <span
                        className={`perfil-avatar gestec-avatar--${corAvatar}`}
                    >
                        {iniciais}
                    </span>

                    <span className="perfil-informacoes">
                        <strong>{nomeUsuario}</strong>
                        <small>{nomePerfil}</small>
                    </span>

                    <i
                        className={`fa-solid ${
                            perfilAberto
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
