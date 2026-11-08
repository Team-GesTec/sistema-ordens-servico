
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Lottie, type LottieHandle } from "lottie-react";
import { ApiError } from "../services/api";
import { authService } from "../services/auth";
import logo from "../images/claro.png";

function Login() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);
    const [animacao, setAnimacao] = useState<object | null>(null);

    const lottieRef = useRef<LottieHandle>(null);

    const introducaoExecutada = useRef(false);

    const direcaoAtual = useRef<"forward" | "reverse">("forward");

    // Verifica se o usuário já está autenticado
    useEffect(() => {
        if (authService.hasSession()) {
            navigate("/home", { replace: true });
        }
    }, [navigate]);

    // Carrega a animação JSON
    useEffect(() => {
        const controller = new AbortController();

        async function carregarAnimacao() {
            try {
                const resposta = await fetch(
                    `${import.meta.env.BASE_URL}animations/gif.json`,
                    { signal: controller.signal }
                );

                if (!resposta.ok) {
                    throw new Error("Não foi possível carregar a animação.");
                }

                const dados = await resposta.json();
                setAnimacao(dados);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("Erro ao carregar animação:", error);
                }
            }
        }

        carregarAnimacao();

        return () => controller.abort();
    }, []);

    // Controla a introdução e o looping reverso
    function controlarAnimacao() {
        if (!introducaoExecutada.current) {
            introducaoExecutada.current = true;

            direcaoAtual.current = "forward";

            lottieRef.current?.setDirection("forward");
            lottieRef.current?.playSegments([100, 280]);

            return;
        }

        // Alterna entre movimento normal e reverso
        const novaDirecao =
            direcaoAtual.current === "forward" ? "reverse" : "forward";

        direcaoAtual.current = novaDirecao;

        lottieRef.current?.setDirection(novaDirecao);
        lottieRef.current?.playSegments([100, 280]);
    }

    // Realiza o login
    async function entrar(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErro(null);
        setCarregando(true);

        try {
            await authService.login(usuario, senha);
            navigate("/home", { replace: true });
        } catch (error) {
            const mensagem =
                error instanceof ApiError
                    ? error.message
                    : "Não foi possível realizar o login.";

            setErro(mensagem);
        } finally {
            setCarregando(false);
        }
    }

    return (
        <main className="login-page">

            {/* LADO ESQUERDO - FORMULÁRIO */}
            <section
                className="login-form-area"
                aria-label="Acesso ao sistema"
            >
                <div className="login-card">

                    <div className="login-logo">
                        <img
                            src={logo}
                            alt="Logo GesTec"
                        />
                    </div>

                    <form onSubmit={entrar} autoComplete="on">

                        {erro && (
                            <div className="erro-msg" role="alert">
                                <i
                                    className="fa-solid fa-circle-xmark erro-icone"
                                    aria-hidden="true"
                                />
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

                            {!carregando && (
                                <i
                                    className="fa-solid fa-arrow-right"
                                    aria-hidden="true"
                                />
                            )}
                        </button>

                    </form>
                </div>
            </section>

            {/* LADO DIREITO - ANIMAÇÃO */}
            <section
                className="login-animation-area"
                aria-hidden="true"
            >
                {animacao && (
                    <Lottie
                        lottieRef={lottieRef}
                        src={animacao}
                        autoplay
                        loop={false}
                        subscriptions={{
                            complete: controlarAnimacao,
                        }}
                        renderer="svg"
                        style={{
                            width: "400px",
                            height: "400px",
                        }}
                    />
                )}
            </section>

        </main>
    );
}

export default Login;
