import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/PRETO_BRANCO.png";
import "../styles/login.css";

function Login() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState(false);

    function entrar(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (usuario === "admin" && senha === "1234") {
            setErro(false);
            navigate("/home");
        } else {
            setErro(true);
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <img src={logo} alt="GESTEC" className="logo" />

                <form onSubmit={entrar}>
                    {erro && (
                        <div className="erro-msg">
                            <i className="fa-solid fa-circle-xmark erro-icone"></i>
                            Acesso negado. Usuário ou senha incorretos.
                        </div>
                    )}

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

                    <button type="submit">Entrar</button>
                </form>
            </div>
        </div>
    );
}

export default Login;