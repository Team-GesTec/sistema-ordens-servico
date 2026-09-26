import { useEffect, useState, type FormEvent } from "react";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/filters.css";
import "../styles/cards.css";
import "../styles/details.css";
import "../styles/darkmode.css";
import "../styles/forms.css";
import type { SelectOption } from "../components/CustomSelect";
import CustomSelect from "../components/CustomSelect";
import { ApiError } from "../services/api";
import { clienteService } from "../services/cliente";
import type { Cliente } from "../types/api";

const CATEGORIAS: SelectOption[] = [
    { value: "Pessoa Física", label: "Pessoa Física" },
    { value: "Pessoa Jurídica", label: "Pessoa Jurídica" },
    { value: "Governo", label: "Governo" },
];

interface ClienteFormState {
    nome: string;
    categoria: string | null;
    razaoSocial: string;
    ramoAtuacao: string;
}

const INITIAL_FORM_STATE: ClienteFormState = {
    nome: "",
    categoria: null,
    razaoSocial: "",
    ramoAtuacao: "",
};

function Clientes() {
    const [form, setForm] = useState<ClienteFormState>(INITIAL_FORM_STATE);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        clienteService.listar()
            .then(setClientes)
            .catch((error: unknown) => setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os clientes."))
            .finally(() => setCarregando(false));
    }, []);

    function updateField<K extends keyof ClienteFormState>(field: K, value: ClienteFormState[K]) {
        setForm((prev) => ({ ...prev, [field]: value }));
        setMensagem(null);
        setErro(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.categoria) {
            setErro("Selecione uma categoria.");
            return;
        }

        setSalvando(true);
        setMensagem(null);
        setErro(null);

        try {
            const criado = await clienteService.criar({
                nome: form.nome.trim(),
                categoria: form.categoria,
                razao_social: form.razaoSocial.trim() || null,
                ramo_atuacao: form.ramoAtuacao.trim() || null,
                locais_operacionais: [],
            });
            setClientes((prev) => [...prev, criado].sort((a, b) => a.id - b.id));
            setForm(INITIAL_FORM_STATE);
            setMensagem(`Cliente "${criado.nome}" cadastrado com sucesso.`);
        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Não foi possível cadastrar o cliente.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="layout">
            <main className="main">
                <div className="container">
                    <h1 className="form-title">Cadastrar cliente</h1>
                    {mensagem && <div className="form-feedback success">{mensagem}</div>}
                    {erro && <div className="form-feedback error">{erro}</div>}

                    <form className="form-card" onSubmit={handleSubmit}>
                        <div className="form-field">
                            <label htmlFor="nome">Nome</label>
                            <input
                                id="nome"
                                type="text"
                                className="form-input"
                                placeholder="Nome do cliente"
                                value={form.nome}
                                onChange={(event) => updateField("nome", event.target.value)}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Categoria</label>
                            <CustomSelect
                                options={CATEGORIAS}
                                value={form.categoria}
                                onChange={(value) => updateField("categoria", String(value))}
                                placeholder="Selecione uma categoria"
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="razaoSocial">Razão social</label>
                            <input
                                id="razaoSocial"
                                type="text"
                                className="form-input"
                                placeholder="Digite a razão social"
                                value={form.razaoSocial}
                                onChange={(event) => updateField("razaoSocial", event.target.value)}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="ramoAtuacao">Ramo de atuação</label>
                            <input
                                id="ramoAtuacao"
                                type="text"
                                className="form-input"
                                placeholder="Digite o ramo"
                                value={form.ramoAtuacao}
                                onChange={(event) => updateField("ramoAtuacao", event.target.value)}
                            />
                        </div>

                        <p className="form-hint">
                            A API exige <code>locais_operacionais</code>; nesta tela ele é enviado como lista vazia, sem inventar dados operacionais.
                        </p>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={salvando || carregando}>
                                {salvando ? "Salvando..." : "Salvar cliente"}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => setForm(INITIAL_FORM_STATE)} disabled={salvando}>
                                Cancelar
                            </button>
                        </div>
                    </form>

                    <div className="form-card" style={{ marginTop: 20 }}>
                        <strong style={{ color: "#fff" }}>Clientes carregados da API</strong>
                        {carregando ? (
                            <p className="form-hint">Carregando...</p>
                        ) : clientes.length === 0 ? (
                            <p className="form-hint">Nenhum cliente retornado pelo backend.</p>
                        ) : (
                            clientes.map((cliente) => (
                                <div key={cliente.id} className="form-hint">
                                    #{cliente.id} — {cliente.nome} — {cliente.categoria}
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

export default Clientes;
