import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import logo from "../images/AZUL.CLARO_BRANCO_SemNome.png";
import { getStoredUser, authService } from "../services/auth";
import type { PerfilFuncionario } from "../types/api";
import { getGestecAvatarTone, getGestecInitials } from "../utils/gestecAvatar";

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
    const corAvatar = getGestecAvatarTone(Math.max(0, (usuario?.id ?? 1) - 1));
    const nomePerfil = usuario?.tipo ? NOMES_PERFIL[usuario.tipo] : "Funcionário";

    useEffect(() => {
        function fecharPerfil(event: MouseEvent) {
            const alvo = event.target;
            if (alvo instanceof Element && !alvo.closest(".sidebar-perfil-container")) {
                setPerfilAberto(false);
            }
        }
        document.addEventListener("click", fecharPerfil);
        return () => document.removeEventListener("click", fecharPerfil);
    }, []);

    function sair() {
        authService.logout();
        navigate("/login", { replace: true });
    }

    return (
        <aside id="gestec-primary-sidebar" className="sidebar" aria-label="Navegação principal">
            <NavLink to="/home" className="sidebar-brand" aria-label="GesTec — página inicial">
                <span className="sidebar-brand-mark">
                    <img src={logo} alt="" />
                </span>
                <span className="sidebar-brand-text">
                    <strong>GesTec</strong>
                    <small>SISTEMA DE GESTÃO</small>
                </span>
            </NavLink>

            <nav className="sidebar-nav">
                <div className="sidebar-nav-section">
                    <p className="sidebar-section-label">Menu principal</p>
                    <NavLink to="/home" className="menu-item" title="Visão geral" aria-label="Visão geral">
                        <i className="fa-solid fa-house" aria-hidden="true" />
                        <span>Visão geral</span>
                    </NavLink>
                    <NavLink to="/ordens" className="menu-item" title="Ordens de serviço" aria-label="Ordens de serviço">
                        <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
                        <span>Ordens de serviço</span>
                    </NavLink>
                </div>

                <div className="sidebar-nav-section">
                    <p className="sidebar-section-label">Gestão</p>
                    <NavLink to="/clientes" className="menu-item" title="Clientes" aria-label="Clientes">
                        <i className="fa-solid fa-users" aria-hidden="true" />
                        <span>Clientes</span>
                    </NavLink>
                    <NavLink to="/projetos" className="menu-item" title="Projetos" aria-label="Projetos">
                        <i className="fa-solid fa-diagram-project" aria-hidden="true" />
                        <span>Projetos</span>
                    </NavLink>
                    <NavLink to="/funcionarios" className="menu-item" title="Funcionários" aria-label="Funcionários">
                        <i className="fa-solid fa-user-tie" aria-hidden="true" />
                        <span>Funcionários</span>
                    </NavLink>
                    <NavLink to="/departamentos" className="menu-item" title="Departamentos" aria-label="Departamentos">
                        <i className="fa-solid fa-building" aria-hidden="true" />
                        <span>Departamentos</span>
                    </NavLink>
                </div>

                <div className="sidebar-nav-section">
                    <p className="sidebar-section-label">Análises</p>
                    <NavLink to="/auditoria" className="menu-item" title="Logs de auditoria" aria-label="Logs de auditoria">
                        <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
                        <span>Logs de auditoria</span>
                    </NavLink>
                    <NavLink to="/relatorios" className="menu-item" title="Relatórios" aria-label="Relatórios">
                        <i className="fa-solid fa-chart-line" aria-hidden="true" />
                        <span>Relatórios</span>
                    </NavLink>
                </div>
            </nav>

            <div className="sidebar-perfil-container">
                {perfilAberto && (
                    <div className={`sidebar-perfil-menu${perfilAberto ? " aberto" : ""}`}>
                        <div className="perfil-menu-cabecalho">
                            <strong>{nomeUsuario}</strong>
                            <span>{nomePerfil}</span>
                        </div>
                        <button
                            type="button"
                            className="perfil-menu-item perfil-menu-tema"
                            onClick={() => setDarkMode((atual) => !atual)}
                            aria-pressed={darkMode}
                        >
                            <i className={`fa-solid ${darkMode ? "fa-sun" : "fa-moon"}`} aria-hidden="true" />
                            <span>{darkMode ? "Ativar tema claro" : "Ativar tema escuro"}</span>
                            <span className={`sidebar-theme-switch${darkMode ? " ligado" : ""}`} aria-hidden="true"><span /></span>
                        </button>
                        <button type="button" className="perfil-menu-item perfil-sair" onClick={sair}>
                            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
                            <span>Sair da conta</span>
                        </button>
                    </div>
                )}
                <button
                    type="button"
                    className="sidebar-perfil"
                    onClick={() => setPerfilAberto((aberto) => !aberto)}
                    aria-expanded={perfilAberto}
                    aria-label={`Perfil de ${nomeUsuario}`}
                >
                    <span className={`perfil-avatar gestec-avatar--${corAvatar}`}>{iniciais}</span>
                    <span className="perfil-informacoes">
                        <strong>{nomeUsuario}</strong>
                        <small>{nomePerfil}</small>
                    </span>
                    <i className={`fa-solid ${perfilAberto ? "fa-chevron-down" : "fa-chevron-up"}`} aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
