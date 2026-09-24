import { NavLink } from "react-router-dom";
import logo from "../images/logo_gestec.png";

interface SidebarProps {
    darkMode: boolean;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

function Sidebar({ darkMode, setDarkMode }: SidebarProps) {

    return (
        <aside className="sidebar">

            <img src={logo} alt="Logo da Altave" />

            <nav className="sidebar-nav">

                <button
                    className="theme-button"
                    onClick={() => setDarkMode(!darkMode)}
                >
                    <i className={darkMode ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
                </button>

                <NavLink to="/home" className="menu-item">
                    <i className="fa-solid fa-house"></i>
                    <span>Início</span>
                </NavLink>

                <NavLink to="/clientes" className="menu-item">
                    <i className="fa-solid fa-users"></i>
                    <span>Clientes</span>
                </NavLink>

                <NavLink to="/ordens" className="menu-item">
                    <i className="fa-solid fa-clipboard-list"></i>
                    <span>Ordens de Serviço</span>
                </NavLink>

                <NavLink to="/projetos" className="menu-item">
                    <i className="fa-solid fa-diagram-project"></i>
                    <span>Projetos</span>
                </NavLink>

                <NavLink to="/funcionarios" className="menu-item">
                    <i className="fa-solid fa-user-tie"></i>
                    <span>Funcionários</span>
                </NavLink>

                <NavLink to="/relatorios" className="menu-item">
                    <i className="fa-solid fa-chart-line"></i>
                    <span>Relatórios</span>
                </NavLink>

                <NavLink to="/configuracoes" className="menu-item">
                    <i className="fa-solid fa-gear"></i>
                    <span>Configurações</span>
                </NavLink>

            </nav>

        </aside>
    );
}

export default Sidebar;
