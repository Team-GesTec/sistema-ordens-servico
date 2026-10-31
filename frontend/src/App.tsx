import { Routes, Route, Navigate } from "react-router-dom";
import Departamentos from "./pages/Departamentos";
import MainLayout from "./layouts/MainLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Funcionarios from "./pages/Funcionarios";
import Clientes from "./pages/Clientes";
import Ordens from "./pages/Ordens";
import OrdemServicoDetalhes from "./pages/OrdemServicoDetalhes";
import Projetos from "./pages/Projetos";
import Relatorios from "./pages/Relatorios";
import Auditoria from "./pages/Auditoria";
import PrivateRoute from "./components/PrivateRoutes";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route path="/login" element={<Login />} />

            <Route element={<PrivateRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/ordens" element={<Ordens />} />
                    <Route path="/ordens/:id" element={<OrdemServicoDetalhes />} />
                    <Route path="/projetos" element={<Projetos />} />
                    <Route path="/funcionarios" element={<Funcionarios />} />
                    <Route path="/departamentos" element={<Departamentos />} />
                    <Route path="/auditoria" element={<Auditoria />} />
                    <Route path="/relatorios" element={<Relatorios />} />
                </Route>
            </Route>
        </Routes>
    );
}

export default App;