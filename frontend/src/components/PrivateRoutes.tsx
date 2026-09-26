import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { ApiError } from "../services/api";
import { authService, getStoredUser } from "../services/auth";
import type { Funcionario } from "../types/api";

function PrivateRoute() {
    const [usuario, setUsuario] = useState<Funcionario | null>(getStoredUser());
    const [validando, setValidando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (!authService.hasSession()) {
            setValidando(false);
            return;
        }

        let ativo = true;

        authService.me()
            .then((dados) => {
                if (!ativo) return;
                setUsuario(dados);
                setErro(null);
            })
            .catch((error: unknown) => {
                if (!ativo) return;
                if (error instanceof ApiError && error.status === 401) {
                    authService.logout();
                    setUsuario(null);
                    return;
                }
                setErro(error instanceof Error ? error.message : "Não foi possível validar a sessão.");
            })
            .finally(() => {
                if (ativo) setValidando(false);
            });

        return () => {
            ativo = false;
        };
    }, []);

    if (validando) {
        return <div className="page-state">Validando sessão...</div>;
    }

    if (!authService.hasSession() || !usuario) {
        return <Navigate to="/login" replace />;
    }

    if (erro) {
        return <div className="page-state error">{erro}</div>;
    }

    return <Outlet />;
}

export default PrivateRoute;
