
import { useEffect, useRef, useState } from "react";
import {
    NavLink,
    useNavigate,
    useLocation,
} from "react-router-dom";

import logoReduzida from "../images/SemNome_Preta.AzulClaro.png";
import logoDarkReduzida from "../images/AZUL.CLARO_BRANCO_SemNome.png";

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
    const location = useLocation();

    const usuario = getStoredUser();

    const [perfilAberto, setPerfilAberto] = useState(false);
    const [sidebarExpandida, setSidebarExpandida] = useState(false);

    // Referências
    const sidebarRef = useRef<HTMLElement>(null);
    const navViewportRef = useRef<HTMLDivElement>(null);

    const mousePosRef = useRef<{ x: number; y: number } | null>(null);

    const animationFrameRef = useRef<number | null>(null);
    const mouseYRef = useRef<number | null>(null);

    const nomeUsuario = usuario?.nome ?? "Usuário";
    const iniciais = getGestecInitials(nomeUsuario, "US");

    const corAvatar = getGestecAvatarTone(
        Math.max(0, (usuario?.id ?? 1) - 1)
    );

    const nomePerfil = usuario?.tipo
        ? NOMES_PERFIL[usuario.tipo]
        : "Funcionário";

    // =========================================
    // FECHAR MENU DO PERFIL AO TROCAR DE PÁGINA
    // =========================================

    useEffect(() => {
        setPerfilAberto(false);
    }, [location.pathname]);

    // =========================================
    // CONTROLE DA EXPANSÃO PELA POSIÇÃO DO MOUSE
    // =========================================

    useEffect(() => {
        function verificarPosicaoMouse(event: PointerEvent) {
            if (event.pointerType !== "mouse") return;

            const sidebar = sidebarRef.current;

            if (!sidebar) return;

            mousePosRef.current = {
                x: event.clientX,
                y: event.clientY,
            };

            const retangulo = sidebar.getBoundingClientRect();

            const mouseDentro =
                event.clientX >= retangulo.left &&
                event.clientX <= retangulo.right &&
                event.clientY >= retangulo.top &&
                event.clientY <= retangulo.bottom;

            setSidebarExpandida(mouseDentro);
        }

        document.addEventListener(
            "pointermove",
            verificarPosicaoMouse
        );

        return () => {
            document.removeEventListener(
                "pointermove",
                verificarPosicaoMouse
            );
        };
    }, []);

    // =========================================
    // FECHAR MENU DO PERFIL AO CLICAR FORA
    // =========================================

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

    // =========================================
    // SCROLL AUTOMÁTICO POR APROXIMAÇÃO
    // =========================================

    useEffect(() => {
        const viewport = navViewportRef.current;

        if (!viewport) return;

        const zonaSensivel = 65;
        const velocidadeMaxima = 350;

        let ultimoTempo = 0;

        function pararScroll() {
            mouseYRef.current = null;
            ultimoTempo = 0;

            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        }

        function atualizarScroll(tempo: number) {
            if (mouseYRef.current === null) {
                animationFrameRef.current = null;
                return;
            }

            const retangulo = viewport!.getBoundingClientRect();
            const mouseY = mouseYRef.current;

            if (
                viewport!.scrollHeight <= viewport!.clientHeight
            ) {
                animationFrameRef.current = null;
                ultimoTempo = 0;
                return;
            }

            let direcao = 0;
            let intensidade = 0;

            // Aproximação do topo
            if (mouseY < retangulo.top + zonaSensivel) {
                direcao = -1;

                intensidade = Math.min(
                    1,
                    (retangulo.top + zonaSensivel - mouseY) /
                    zonaSensivel
                );
            }

            // Aproximação da parte inferior
            else if (mouseY > retangulo.bottom - zonaSensivel) {
                direcao = 1;

                intensidade = Math.min(
                    1,
                    (mouseY - (retangulo.bottom - zonaSensivel)) /
                    zonaSensivel
                );
            }

            if (direcao === 0) {
                animationFrameRef.current = null;
                ultimoTempo = 0;
                return;
            }

            const deltaTempo = ultimoTempo
                ? Math.min((tempo - ultimoTempo) / 1000, 0.05)
                : 0;

            const scrollAnterior = viewport!.scrollTop;

            viewport!.scrollTop +=
                direcao *
                velocidadeMaxima *
                intensidade *
                deltaTempo;

            ultimoTempo = tempo;

            if (viewport!.scrollTop === scrollAnterior) {
                animationFrameRef.current = null;
                ultimoTempo = 0;
                return;
            }

            animationFrameRef.current =
                requestAnimationFrame(atualizarScroll);
        }

        function moverMouse(event: PointerEvent) {
            if (event.pointerType !== "mouse") return;

            mouseYRef.current = event.clientY;

            if (animationFrameRef.current === null) {
                animationFrameRef.current =
                    requestAnimationFrame(atualizarScroll);
            }
        }

        viewport.addEventListener("pointermove", moverMouse);
        viewport.addEventListener("pointerleave", pararScroll);

        return () => {
            pararScroll();

            viewport.removeEventListener("pointermove", moverMouse);
            viewport.removeEventListener("pointerleave", pararScroll);
        };
    }, []);

    // =========================================
    // LOGOUT
    // =========================================

    function sair() {
        authService.logout();
        navigate("/login", { replace: true });
    }

    // =========================================
    // RENDERIZAÇÃO
    // =========================================

    return (
        <aside
            ref={sidebarRef}
            id="gestec-primary-sidebar"
            className={`sidebar ${sidebarExpandida ? "expandida" : ""}`}
            aria-label="Navegação principal"
        >
            {/* LOGO */}

            <NavLink
                to="/home"
                className="sidebar-brand"
                aria-label="GesTec — página inicial"
            >
                <div className="sidebar-brand-logo">
                    <img
                        className="sidebar-logo-expandida"
                        src={logoReduzida}
                        alt="GesTec"
                    />

                    <img
                        className="sidebar-logo-reduzida"
                        src={logoReduzida}
                        alt="GesTec"
                    />

                    <img
                        className="sidebar-logo-dark-expandida"
                        src={logoDarkReduzida}
                        alt="GesTec"
                    />

                    <img
                        className="sidebar-logo-dark-reduzida"
                        src={logoDarkReduzida}
                        alt="GesTec"
                    />
                </div>
            </NavLink>

            {/* NAVEGAÇÃO ROLÁVEL */}

            <div
                className="sidebar-nav-viewport"
                ref={navViewportRef}
            >
                <nav className="sidebar-nav">

                    {/* MENU PRINCIPAL */}

                    <div className="sidebar-divider">
                        <span>MENU PRINCIPAL</span>
                    </div>

                    <div className="sidebar-nav-section">

                        <NavLink
                            to="/home"
                            className="menu-item"
                            title="Visão geral"
                            aria-label="Visão geral"
                        >
                            <i className="fa-solid fa-house" aria-hidden="true" />
                            <span>Visão geral</span>
                        </NavLink>

                        <NavLink
                            to="/ordens"
                            className="menu-item"
                            title="Ordens de serviço"
                            aria-label="Ordens de serviço"
                        >
                            <i className="fa-solid fa-clipboard-list" aria-hidden="true" />
                            <span>Ordens de serviço</span>
                        </NavLink>

                    </div>

                    {/* GESTÃO */}

                    <div className="sidebar-divider">
                        <span>GESTÃO</span>
                    </div>

                    <div className="sidebar-nav-section">

                        <NavLink
                            to="/clientes"
                            className="menu-item"
                            title="Clientes"
                            aria-label="Clientes"
                        >
                            <i className="fa-solid fa-users" aria-hidden="true" />
                            <span>Clientes</span>
                        </NavLink>

                        <NavLink
                            to="/projetos"
                            className="menu-item"
                            title="Projetos"
                            aria-label="Projetos"
                        >
                            <i className="fa-solid fa-diagram-project" aria-hidden="true" />
                            <span>Projetos</span>
                        </NavLink>

                        <NavLink
                            to="/funcionarios"
                            className="menu-item"
                            title="Funcionários"
                            aria-label="Funcionários"
                        >
                            <i className="fa-solid fa-user-tie" aria-hidden="true" />
                            <span>Funcionários</span>
                        </NavLink>

                        <NavLink
                            to="/departamentos"
                            className="menu-item"
                            title="Departamentos"
                            aria-label="Departamentos"
                        >
                            <i className="fa-solid fa-building" aria-hidden="true" />
                            <span>Departamentos</span>
                        </NavLink>

                    </div>

                    {/* ANÁLISES */}

                    <div className="sidebar-divider">
                        <span>ANÁLISES</span>
                    </div>

                    <div className="sidebar-nav-section">

                        {/* US#2.10: a auditoria é exclusiva do gestor (o backend responde 403 aos demais) */}
                        {usuario?.tipo === "gestor" && (
                            <NavLink
                                to="/auditoria"
                                className="menu-item"
                                title="Logs de auditoria"
                                aria-label="Logs de auditoria"
                            >
                                <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
                                <span>Logs de auditoria</span>
                            </NavLink>
                        )}

                        <NavLink
                            to="/relatorios"
                            className="menu-item"
                            title="Relatórios"
                            aria-label="Relatórios"
                        >
                            <i className="fa-solid fa-chart-line" aria-hidden="true" />
                            <span>Relatórios</span>
                        </NavLink>

                        <NavLink to="/ajuda" className="menu-item" title="Ajuda" aria-label="Ajuda">
                            <i className="fa-solid fa-circle-question" aria-hidden="true" />
                            <span>Ajuda</span>
                        </NavLink>

                    </div>

                </nav>
            </div>

            {/* PERFIL FIXO */}

            <div className="sidebar-perfil-container">

                {/* MENU DO PERFIL */}

                <div
                    className={`sidebar-perfil-menu${perfilAberto ? " aberto" : ""}`}
                    aria-hidden={!perfilAberto}
                >
                    <div className="perfil-menu-cabecalho">
                        <strong>{nomeUsuario}</strong>
                        <span>{nomePerfil}</span>
                    </div>

                    {/* ALTERNAR TEMA */}

                    <button
                        type="button"
                        className="perfil-menu-item perfil-menu-tema"
                        onClick={() =>
                            setDarkMode((atual) => !atual)
                        }
                        aria-pressed={darkMode}
                    >
                        <i
                            className={`fa-solid ${darkMode ? "fa-sun" : "fa-moon"}`}
                            aria-hidden="true"
                        />

                        <span>
                            {darkMode
                                ? "Ativar tema claro"
                                : "Ativar tema escuro"}
                        </span>

                        <span
                            className={`sidebar-theme-switch${darkMode ? " ligado" : ""}`}
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
