import { useEffect, useState, type FormEvent } from "react";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import { ApiError } from "../services/api";
import { departamentoService } from "../services/departamento";
import type { Departamento } from "../types/api";

function Departamentos() {
    const [nome, setNome] = useState("");
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        departamentoService.listar()
            .then(setDepartamentos)
            .catch((error: unknown) => setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os departamentos."))
            .finally(() => setCarregando(false));
    }, []);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            const criado = await departamentoService.criar({ nome: nome.trim(), responsavel_id: null });
            setDepartamentos((prev) => [...prev, criado].sort((a, b) => a.id - b.id));
            setNome("");
            setMensagem(`Departamento "${criado.nome}" cadastrado com sucesso.`);
        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Não foi possível cadastrar o departamento.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="layout">
            <main className="main">
                <div className="container">
                    <h1 className="form-title">Cadastrar departamento</h1>
                    {mensagem && <div className="form-feedback success">{mensagem}</div>}
                    {erro && <div className="form-feedback error">{erro}</div>}

                    <form className="form-card" onSubmit={handleSubmit}>
                        <div className="form-field">
                            <label htmlFor="nome-departamento">Nome</label>
                            <input
                                id="nome-departamento"
                                type="text"
                                className="form-input"
                                value={nome}
                                onChange={(event) => setNome(event.target.value)}
                                placeholder="Nome do departamento"
                                required
                            />
                        </div>
                        <p className="form-hint">O contrato aceita <code>responsavel_id</code> nulo; a tela mantém o campo sem inventar um responsável.</p>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={salvando}>
                                {salvando ? "Salvando..." : "Salvar departamento"}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => setNome("")} disabled={salvando}>
                                Cancelar
                            </button>
                        </div>
                    </form>

                    <div className="form-card" style={{ marginTop: 20 }}>
                        <strong style={{ color: "#fff" }}>Departamentos carregados da API</strong>
                        {carregando ? (
                            <p className="form-hint">Carregando...</p>
                        ) : departamentos.length === 0 ? (
                            <p className="form-hint">Nenhum departamento retornado pelo backend.</p>
                        ) : (
                            departamentos.map((departamento) => (
                                <div key={departamento.id} className="form-hint">
                                    #{departamento.id} — {departamento.nome}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
            <aside className="details" />
        </div>
    );
}

export default Departamentos;
