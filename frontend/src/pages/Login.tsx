import { useState } from "react";
import Home from "./Home";
import logo from "../images/logo_gestec.png";
import "../styles/login.css";

function Login() {
    const [logado, setLogado] = useState(false);
    const [usuario, setUsuario] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState(false);

    function entrar(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (usuario === "admin" && senha === "1234") {
            setLogado(true);
            setErro(false);
        } else {
            setErro(true);
        }
    }

    if (logado) {
        return <Home />;
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <img src={logo} alt="GESTEC" className="logo" />

                <form onSubmit={entrar}>
                    <input
                        type="text"
                        placeholder="Usuário"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Senha"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                    />

                    {erro && (
                        <div className="erro-msg">
                            <span className="erro-icone">✕</span>
                            Acesso negado. Usuário ou senha incorretos.
                        </div>
                    )}

                    <button type="submit">Entrar</button>
                </form>
            </div>
        </div>
    );
}

export default Login;