import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import NotificationCenter from "../components/notifications/NotificationCenter";
import "../styles/filters.css";
import ToastViewport from "../components/feedback/ToastViewport";
import { useFeedback } from "../context/FeedbackContext";

function MainLayout() {
    const [darkMode, setDarkMode] = useState(false);
    const { toasts, dismissToast } = useFeedback();

    return (
        <div className={`gestec-app${darkMode ? " dark-mode" : ""}`}>
            <Sidebar darkMode={darkMode} setDarkMode={setDarkMode} />
            <div className="app-workspace">
                <Outlet />
            </div>
            <NotificationCenter />
            <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}

export default MainLayout;
