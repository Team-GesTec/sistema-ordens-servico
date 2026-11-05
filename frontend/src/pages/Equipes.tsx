import { Navigate } from "react-router-dom";

/** Compatibilidade de navegação: Equipes e Departamentos usam a mesma estrutura de dados e tela. */
export default function Equipes() {
    return <Navigate to="/departamentos" replace />;
}
