import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/PRETO_BRANCO.png";
import "../styles/login.css";
import { ApiError } from "../services/api";
import { authService } from "../services/auth";

function Login() {
    const navigate = useNavigate();
    const [usuario, setUsuario] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);

    useEffect(() => {
        if (authService.hasSession()) {
            navigate("/home", { replace: true });
        }
    }, [navigate]);

    async function entrar(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErro(null);
        setCarregando(true);

        try {
            await authService.login(usuario, senha);
            navigate("/home", { replace: true });
        } catch (error) {
            const mensagem = error instanceof ApiError ? error.message : "Não foi possível realizar o login.";
            setErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <img src={logo} alt="GESTEC" className="logo" />

                <form onSubmit={entrar} autoComplete="on">
                    {erro && (
                        <div className="erro-msg" role="alert">
                            <i className="fa-solid fa-circle-xmark erro-icone"></i>
                            {erro}
                        </div>
                    )}

                    <input
                        id="usuario"
                        name="username"
                        type="text"
                        placeholder="Usuário"
                        value={usuario}
                        onChange={(event) => {
                            setUsuario(event.target.value);
                            setErro(null);
                        }}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        required
                    />

                    <input
                        id="senha"
                        name="password"
                        type="password"
                        placeholder="Senha"
                        value={senha}
                        onChange={(event) => {
                            setSenha(event.target.value);
                            setErro(null);
                        }}
                        autoComplete="current-password"
                        required
                    />

                    <button type="submit" disabled={carregando}>
                        {carregando ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Login;
