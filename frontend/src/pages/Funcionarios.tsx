import { useState } from "react";
import "../styles/variaveis.css";
import "../styles/global.css";
import "../styles/layout.css";
import "../styles/sidebar.css";
import "../styles/filters.css";
import "../styles/cards.css";
import "../styles/details.css";
import "../styles/darkmode.css";
import "../styles/forms.css"
import type { SelectOption } from "../components/CustomSelect";
import CustomSelect from "../components/CustomSelect";

const DEPARTAMENTOS: SelectOption[] = [
    { value: "departamento-1", label: "Administrativo" },
    { value: "departamento-2", label: "Desenvolvimento" },
    { value: "departamento-3", label: "Financeiro" },
    { value: "departamento-4", label: "Suporte" },
];

const CATEGORIAS: SelectOption[] = [
    { value: "categoria-1", label: "Administrador" },
    { value: "categoria-2", label: "Gerente" },
    { value: "categoria-3", label: "Funcionário" },
];

interface FuncionarioFormState {
    nome: string;
    departamento: string | null;
    categoria: string | null;
    senha: string;
}

const INITIAL_FORM_STATE: FuncionarioFormState = {
    nome: "",
    departamento: null,
    categoria: null,
    senha: "",
};

function Funcionarios() {
    const [form, setForm] =
        useState<FuncionarioFormState>(INITIAL_FORM_STATE);

    function updateField<K extends keyof FuncionarioFormState>(
        field: K,
        value: FuncionarioFormState[K]
    ) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        // TODO: integrar com a API de cadastro de funcionários.
        console.log("Funcionário a enviar:", form);
    }

    function handleCancel() {
        setForm(INITIAL_FORM_STATE);
    }

    return (
        <div className="layout">

            <main className="main">
                <div className="container">

                    <h1 className="form-title">
                        Cadastrar funcionário
                    </h1>

                    <form
                        className="form-card"
                        onSubmit={handleSubmit}
                        autoComplete="off"
                    >

                        <div className="form-field">
                            <label htmlFor="nome">
                                Nome
                            </label>

                            <input
                                id="nome"
                                name="nome"
                                type="text"
                                className="form-input"
                                placeholder="Nome do funcionário"
                                value={form.nome}
                                onChange={(e) =>
                                    updateField(
                                        "nome",
                                        e.target.value
                                    )
                                }
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>
                                Departamento
                            </label>

                            <CustomSelect
                                options={DEPARTAMENTOS}
                                value={form.departamento}
                                onChange={(value) =>
                                    updateField(
                                        "departamento",
                                        value
                                    )
                                }
                                placeholder="Selecione um departamento"
                            />
                        </div>

                        <div className="form-field">
                            <label>
                                Categoria
                            </label>

                            <CustomSelect
                                options={CATEGORIAS}
                                value={form.categoria}
                                onChange={(value) =>
                                    updateField(
                                        "categoria",
                                        value
                                    )
                                }
                                placeholder="Selecione uma categoria"
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="senha">
                                Senha
                            </label>

                            <input
                                id="senha"
                                name="senha"
                                type="password"
                                className="form-input"
                                placeholder="Digite a senha"
                                value={form.senha}
                                onChange={(e) =>
                                    updateField(
                                        "senha",
                                        e.target.value
                                    )
                                }
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn-primary"
                            >
                                Salvar funcionário
                            </button>

                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={handleCancel}
                            >
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

export default Funcionarios;
