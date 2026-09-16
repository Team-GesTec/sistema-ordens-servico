import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

function MainLayout() {
    const [darkMode, setDarkMode] = useState(false);

    return (
        <div className={darkMode ? "dark-mode" : ""}>
            <Sidebar
                darkMode={darkMode}
                setDarkMode={setDarkMode}
            />

            <Outlet />
        </div>
    );
}

export default MainLayout;