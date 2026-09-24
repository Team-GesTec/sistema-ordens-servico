import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Login from "./pages/Login";
import Home from "./pages/Home";
import Funcionarios from "./pages/Funcionarios";
import Clientes from "./pages/Clientes";
import Ordens from "./pages/Ordens";
import Projetos from "./pages/Projetos";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route path="/login" element={<Login />} />

            <Route element={<MainLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/ordens" element={<Ordens />} />
                <Route path="/projetos" element={<Projetos />} />
                <Route path="/funcionarios" element={<Funcionarios />} />
            </Route>
        </Routes>
    );
}

export default App;