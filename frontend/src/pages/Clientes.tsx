import { useState } from "react";
import "../styles/home.css";
import "../styles/darkmode.css";
import "../styles/ordens.css";
import type { SelectOption } from "../components/CustomSelect";
import CustomSelect from "../components/CustomSelect";

const CATEGORIAS: SelectOption[] = [
    { value: "categoria-1", label: "Pessoa Física" },
    { value: "categoria-2", label: "Pessoa Jurídica" },
    { value: "categoria-3", label: "Governo" },
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

    function updateField<K extends keyof ClienteFormState>(
        field: K,
        value: ClienteFormState[K]
    ) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // TODO: integrar com a API de cadastro de clientes.
        console.log("Cliente a enviar:", form);
    }

    function handleCancel() {
        setForm(INITIAL_FORM_STATE);
    }

    return (
        <div className={`layout`}>

            <main className="main">
                <div className="container">
                    <h1 className="form-title">Cadastrar cliente</h1>
                    <form className="form-card" onSubmit={handleSubmit}>

                        <div className="form-field">
                            <label htmlFor="nome">Nome</label>
                            <input
                                id="nome"
                                type="text"
                                className="form-input"
                                placeholder="Nome do cliente"
                                value={form.nome}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateField("nome", e.target.value)
                                }
                            />
                        </div>

                        <div className="form-field">
                            <label>Categoria</label>
                            <CustomSelect
                                options={CATEGORIAS}
                                value={form.categoria}
                                onChange={(value) => updateField("categoria", value)}
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateField("razaoSocial", e.target.value)
                                }
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateField("ramoAtuacao", e.target.value)
                                }
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                Salvar cliente
                            </button>
                            <button type="button" className="btn-secondary" onClick={handleCancel}>
                                Cancelar
                            </button>
                        </div>

                    </form>
                </div>

            </main>


            <aside className="details">

            </aside>

        </div>
    );

}

export default Clientes;
