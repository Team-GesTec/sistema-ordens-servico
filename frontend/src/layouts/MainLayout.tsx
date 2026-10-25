import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import logo from "../images/claro.png";
import logoDark from "../images/dark.png";

function MainLayout() {
    const [darkMode, setDarkMode] = useState(false);

    return (
        <div
            className={darkMode ? "dark-mode" : ""}
            style={{
                "--logo-gestec": `url(${logo})`,
                "--logo-gestec-dark": `url(${logoDark})`,
            } as React.CSSProperties}
        >
            <Sidebar
                darkMode={darkMode}
                setDarkMode={setDarkMode}
            />

            <Outlet />
        </div>
    );
}

export default MainLayout;
