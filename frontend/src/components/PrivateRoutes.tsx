import { Navigate, Outlet } from "react-router-dom";

function PrivateRoute() {
    const autenticado = sessionStorage.getItem("autenticado");

    if (!autenticado) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

export default PrivateRoute;