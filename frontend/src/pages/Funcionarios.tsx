import { useEffect, useState, type FormEvent } from "react";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import type { SelectOption } from "../components/CustomSelect";
import CustomSelect from "../components/CustomSelect";
import { ApiError } from "../services/api";
import { departamentoService } from "../services/departamento";
import { funcionarioService } from "../services/funcionario";
import type { Departamento, Funcionario } from "../types/api";

const PERFIS: SelectOption[] = [
    { value: "gestor", label: "Gestor" },
    { value: "analista", label: "Analista" },
    { value: "tecnico", label: "Técnico" },
];

interface FuncionarioFormState {
    nome: string;
    usuario: string;
    departamento: number | null;
    tipo: string | null;
    senha: string;
}

const INITIAL_FORM_STATE: FuncionarioFormState = {
    nome: "",
    usuario: "",
    departamento: null,
    tipo: null,
    senha: "",
};

function Funcionarios() {
    const [form, setForm] = useState<FuncionarioFormState>(INITIAL_FORM_STATE);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([departamentoService.listar(), funcionarioService.listar()])
            .then(([departamentosApi, funcionariosApi]) => {
                setDepartamentos(departamentosApi);
                setFuncionarios(funcionariosApi);
            })
            .catch((error: unknown) => setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os dados."))
            .finally(() => setCarregando(false));
    }, []);

    function updateField<K extends keyof FuncionarioFormState>(field: K, value: FuncionarioFormState[K]) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setMensagem(null);
        setErro(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.departamento || !form.tipo) {
            setErro("Selecione o departamento e o perfil do funcionário.");
            return;
        }

        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            const criado = await funcionarioService.criar({
                departamento_id: form.departamento,
                usuario: form.usuario.trim(),
                senha: form.senha,
                nome: form.nome.trim(),
                tipo: form.tipo as "gestor" | "analista" | "tecnico",
            });
            setFuncionarios((prev) => [...prev, criado].sort((a, b) => a.id - b.id));
            setForm(INITIAL_FORM_STATE);
            setMensagem(`Funcionário "${criado.nome}" cadastrado com sucesso.`);
        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Não foi possível cadastrar o funcionário.");
        } finally {
            setSalvando(false);
        }
    }

    const departamentoOptions: SelectOption[] = departamentos.map((departamento) => ({
        value: departamento.id,
        label: `#${departamento.id} — ${departamento.nome}`,
    }));

    return (
        <div className="layout">
            <main className="main">
                <div className="container">
                    <h1 className="form-title">Cadastrar funcionário</h1>
                    {mensagem && <div className="form-feedback success">{mensagem}</div>}
                    {erro && <div className="form-feedback error">{erro}</div>}

                    <form className="form-card" onSubmit={handleSubmit} autoComplete="off">
                        <div className="form-grid">
                            <div className="form-field">
                                <label htmlFor="nome-funcionario">Nome</label>
                                <input
                                    id="nome-funcionario"
                                    type="text"
                                    className="form-input"
                                    value={form.nome}
                                    onChange={(event) => updateField("nome", event.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="usuario-funcionario">Usuário</label>
                                <input
                                    id="usuario-funcionario"
                                    type="text"
                                    className="form-input"
                                    placeholder="login do funcionário"
                                    value={form.usuario}
                                    onChange={(event) => updateField("usuario", event.target.value)}
                                    required
                                />
                                <span className="form-hint">Obrigatório pela API; aceita letras, números e . _ - @.</span>
                            </div>

                            <div className="form-field">
                                <label>Departamento</label>
                                <CustomSelect
                                    options={departamentoOptions}
                                    value={form.departamento}
                                    onChange={(value) => updateField("departamento", Number(value))}
                                    placeholder={carregando ? "Carregando..." : "Selecione um departamento"}
                                />
                            </div>

                            <div className="form-field">
                                <label>Perfil</label>
                                <CustomSelect
                                    options={PERFIS}
                                    value={form.tipo}
                                    onChange={(value) => updateField("tipo", String(value))}
                                    placeholder="Selecione um perfil"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="senha-funcionario">Senha</label>
                                <input
                                    id="senha-funcionario"
                                    type="password"
                                    className="form-input"
                                    value={form.senha}
                                    onChange={(event) => updateField("senha", event.target.value)}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                />
                                <span className="form-hint">A API exige senha com no mínimo 8 caracteres.</span>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={salvando || carregando}>
                                {salvando ? "Salvando..." : "Salvar funcionário"}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => setForm(INITIAL_FORM_STATE)} disabled={salvando}>
                                Cancelar
                            </button>
                        </div>
                    </form>

                    <div className="form-card" style={{ marginTop: 20 }}>
                        <strong style={{ color: "#fff" }}>Funcionários carregados da API</strong>
                        {funcionarios.length === 0 ? (
                            <p className="form-hint">Nenhum funcionário retornado pelo backend.</p>
                        ) : (
                            funcionarios.map((funcionario) => (
                                <div key={funcionario.id} className="form-hint">
                                    #{funcionario.id} — {funcionario.nome} — {funcionario.usuario} — {funcionario.tipo}
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

export default Funcionarios;
