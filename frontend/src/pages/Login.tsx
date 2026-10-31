import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/AZUL.CLARO_BRANCO_SemNome.png";
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
        <main className="login-page">
            <section className="login-brand-panel" aria-label="Sobre a GesTec">
                <div className="login-brand-lockup">
                    <span className="login-brand-mark"><img src={logo} alt="" /></span>
                    <span><strong>GesTec</strong><small>SISTEMA DE GESTÃO</small></span>
                </div>
                <div className="login-brand-copy">
                    <p className="login-eyebrow">GESTÃO EM UM SÓ LUGAR</p>
                    <h1>Seu trabalho conectado. Resultados em movimento.</h1>
                    <p>Uma visão integrada para gerenciar ordens de serviço, clientes e projetos com mais clareza, organização e previsibilidade.</p>
                    <ul className="login-feature-list">
                        <li><i className="fa-solid fa-clipboard-list" aria-hidden="true" /> Acompanhe ordens de serviço</li>
                        <li><i className="fa-solid fa-diagram-project" aria-hidden="true" /> Conecte clientes e projetos</li>
                        <li><i className="fa-solid fa-chart-line" aria-hidden="true" /> Organize a operação em um só lugar</li>
                    </ul>
                </div>
                <small className="login-brand-foot">GesTec · Gestão de serviços</small>
            </section>

            <section className="login-form-area" aria-label="Acesso ao sistema">
                <div className="login-card">
                    <p className="login-form-eyebrow">ACESSO AO SISTEMA</p>
                    <h2>Bem-vindo de volta</h2>
                    <p className="login-form-description">Entre com suas credenciais para continuar.</p>

                    <form onSubmit={entrar} autoComplete="on">
                        {erro && (
                            <div className="erro-msg" role="alert">
                                <i className="fa-solid fa-circle-xmark erro-icone" aria-hidden="true" />
                                <span>{erro}</span>
                            </div>
                        )}

                        <div className="login-field">
                            <label htmlFor="usuario">Usuário</label>
                            <input
                                id="usuario"
                                name="username"
                                type="text"
                                placeholder="Digite seu usuário"
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
                        </div>

                        <div className="login-field">
                            <label htmlFor="senha">Senha</label>
                            <input
                                id="senha"
                                name="password"
                                type="password"
                                placeholder="Digite sua senha"
                                value={senha}
                                onChange={(event) => {
                                    setSenha(event.target.value);
                                    setErro(null);
                                }}
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <button type="submit" disabled={carregando}>
                            {carregando ? "Entrando…" : "Entrar no sistema"}
                            {!carregando && <i className="fa-solid fa-arrow-right" aria-hidden="true" />}
                        </button>
                    </form>
                    <p className="login-form-foot">Acesso restrito a usuários autorizados.</p>
                </div>
            </section>
        </main>
    );
}

export default Login;
