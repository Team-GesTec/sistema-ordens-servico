import "./styles/variaveis.css";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/sidebar.css";
import "./styles/darkmode.css";
import "./styles/forms.css";
import "./styles/autocomplete.css";
import "./styles/details.css";
import "./styles/ordens.css";
import "./styles/projetos.css";
import "./styles/filters.css";
import "./styles/cards.css";
import "./styles/clientes.css";
import "./styles/funcionarios.css";
import "./styles/equipes.css";
import "./styles/dashboard.css";
import "./styles/gestec-reference-pages.css";
import "./styles/gestec-design.css";
import "./styles/login.css";
import "./styles/analises.css";
import "./styles/feedback.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App";
import { FeedbackProvider } from "./context/FeedbackContext";
const router = createBrowserRouter([
    {
        path: "*",
        element: <App />,
    },
]);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <FeedbackProvider>
            <RouterProvider router={router} />
        </FeedbackProvider>
    </StrictMode>
);
