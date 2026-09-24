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

const CLIENTES: SelectOption[] = [
    { value: "cliente-1", label: "Cliente A" },
    { value: "cliente-2", label: "Cliente B" },
];

const DEPARTAMENTOS: SelectOption[] = [
    { value: "dep-x", label: "Departamento X" },
    { value: "dep-y", label: "Departamento Y" },
    { value: "dep-z", label: "Departamento Z" },
];

const PROJETOS: SelectOption[] = [
    { value: "projeto-1", label: "Projeto Alpha" },
    { value: "projeto-2", label: "Projeto Beta" },
];

const RESPONSAVEIS: SelectOption[] = [
    { value: "user-1", label: "João Silva" },
    { value: "user-2", label: "Maria Souza" },
];

const OS_ANTERIORES: SelectOption[] = [
    { value: "os-101", label: "O.S #101" },
    { value: "os-102", label: "O.S #102" },
];

const TIPOS: SelectOption[] = [
    { value: "corretiva", label: "Corretiva" },
    { value: "preventiva", label: "Preventiva" },
    { value: "melhoria", label: "Melhoria" },
];

const CRITICIDADES: SelectOption[] = [
    { value: "1", label: "Alta" },
    { value: "2", label: "Media" },
    { value: "3", label: "Baixa" },
];

interface OSFormState {
    nome: string;
    cliente: string | null;
    projeto: string | null;
    responsavel: string | null;
    departamento: string | null;
    osAnterior: string | null;
    tipo: string | null;
    criticidade: string | null;
    descricao: string;
}

const INITIAL_FORM_STATE: OSFormState = {
    nome: "",
    cliente: null,
    projeto: null,
    responsavel: null,
    departamento: null,
    osAnterior: null,
    tipo: null,
    criticidade: null,
    descricao: "",
};

function Ordens() {
    const [form, setForm] = useState<OSFormState>(INITIAL_FORM_STATE);

    // Departamento pendente no select, antes de ser confirmado.
    const [departamentoAtual, setDepartamentoAtual] = useState<string | null>(null);
    // Departamentos já confirmados (as "tags" Departamento X / Departamento Y do print).
    const [departamentos, setDepartamentos] = useState<SelectOption[]>([]);

    function updateField<K extends keyof OSFormState>(field: K, value: OSFormState[K]) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const payload: OSFormState = {
            ...form
        };
        // TODO: integrar com a API de cadastro de ordens de serviço.
        console.log("Ordem de serviço a enviar:", payload);
    }

    function handleCancel() {
        setForm(INITIAL_FORM_STATE);
        setDepartamentos([]);
        setDepartamentoAtual(null);
    }
    return (
        <div className={`layout`}>

            <main className="main">
                <div className="container">
                    <h1 className="form-title">Cadastrar Ordem de Serviço</h1>
                    <form className="form-card" onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label htmlFor="nome">Nome</label>
                                <input
                                    id="nome"
                                    type="text"
                                    className="form-input"
                                    placeholder="Nome da O.S"
                                    value={form.nome}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        updateField("nome", e.target.value)
                                    }
                                />
                            </div>

                            <div className="form-field">
                                <label>Cliente</label>
                                <CustomSelect
                                    options={CLIENTES}
                                    value={form.cliente}
                                    onChange={(value) => updateField("cliente", value)}
                                    placeholder="Selecione o cliente"
                                />
                            </div>

                            <div className="form-field">
                                <label>Departamento</label>
                                <CustomSelect
                                    options={DEPARTAMENTOS}
                                    value={form.departamento}
                                    onChange={(value) => updateField("departamento", value)}
                                    placeholder="Selecione o departamento"
                                />
                            </div>

                            <div className="form-field">
                                <label>Projeto</label>
                                <CustomSelect
                                    options={PROJETOS}
                                    value={form.projeto}
                                    onChange={(value) => updateField("projeto", value)}
                                    placeholder="Selecione um projeto (opcional)"
                                />
                            </div>

                            <div className="form-field">
                                <label>Responsável</label>
                                <CustomSelect
                                    options={RESPONSAVEIS}
                                    value={form.responsavel}
                                    onChange={(value) => updateField("responsavel", value)}
                                    placeholder="Selecione a pessoa responsável"
                                />
                            </div>

                            <div className="form-field">
                                <label>O.S anterior</label>
                                <CustomSelect
                                    options={OS_ANTERIORES}
                                    value={form.osAnterior}
                                    onChange={(value) => updateField("osAnterior", value)}
                                    placeholder="Selecione alguma O.S com relação"
                                />
                            </div>

                            <div className="form-field">
                                <label>Tipo</label>
                                <CustomSelect
                                    options={TIPOS}
                                    value={form.tipo}
                                    onChange={(value) => updateField("tipo", value)}
                                    placeholder="Selecione o tipo"
                                />
                            </div>

                            <div className="form-field">
                                <label>criticidade</label>
                                <CustomSelect
                                    options={CRITICIDADES}
                                    value={form.criticidade}
                                    onChange={(value) => updateField("criticidade", value)}
                                    placeholder="Selecione a criticidade"
                                />
                            </div>

                            <div className="form-field full-width">
                                <label htmlFor="descricao">Descreva a solicitação</label>
                                <textarea
                                    id="descricao"
                                    className="form-input form-textarea"
                                    placeholder="Descreva a solicitação"
                                    value={form.descricao}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                        updateField("descricao", e.target.value)
                                    }
                                />
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary">
                                Enviar ordem de serviço
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

export default Ordens;