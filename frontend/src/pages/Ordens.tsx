import { useState } from "react";
import "../styles/home.css";
import "../styles/darkmode.css";
import "../styles/ordens.css"
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

const SLAs: SelectOption[] = [
    { value: "1", label: "SLA01" },
    { value: "2", label: "SLA02" },
    { value: "3", label: "SLA03" },
];

interface OSFormState {
    nome: string;
    cliente: string | null;
    projeto: string | null;
    responsavel: string | null;
    osAnterior: string | null;
    tipo: string | null;
    sla: string | null;
    descricao: string;
}

const INITIAL_FORM_STATE: OSFormState = {
    nome: "",
    cliente: null,
    projeto: null,
    responsavel: null,
    osAnterior: null,
    tipo: null,
    sla: null,
    descricao: "",
};

interface OSPayload extends OSFormState {
    departamentos: string[];
}

function Ordens() {
    const [form, setForm] = useState<OSFormState>(INITIAL_FORM_STATE);

    // Departamento pendente no select, antes de ser confirmado.
    const [departamentoAtual, setDepartamentoAtual] = useState<string | null>(null);
    // Departamentos já confirmados (as "tags" Departamento X / Departamento Y do print).
    const [departamentos, setDepartamentos] = useState<SelectOption[]>([]);

    function updateField<K extends keyof OSFormState>(field: K, value: OSFormState[K]) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleConfirmDepartamento() {
        if (!departamentoAtual) return;

        const jaAdicionado = departamentos.some((dep) => dep.value === departamentoAtual);
        if (jaAdicionado) {
            setDepartamentoAtual(null);
            return;
        }

        const departamentoSelecionado = DEPARTAMENTOS.find(
            (dep) => dep.value === departamentoAtual
        );
        if (!departamentoSelecionado) return;

        setDepartamentos((prev) => [...prev, departamentoSelecionado]);
        setDepartamentoAtual(null);
    }

    function handleRemoveDepartamento(value: string) {
        setDepartamentos((prev) => prev.filter((dep) => dep.value !== value));
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const payload: OSPayload = {
            ...form,
            departamentos: departamentos.map((dep) => dep.value),
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
                                <div className="department-group">
                                    <CustomSelect
                                        options={DEPARTAMENTOS}
                                        value={departamentoAtual}
                                        onChange={setDepartamentoAtual}
                                        placeholder="Selecione o departamento"
                                    />
                                    <button
                                        type="button"
                                        className="department-confirm"
                                        onClick={handleConfirmDepartamento}
                                        aria-label="Adicionar departamento"
                                    >
                                        <i className="fa-solid fa-check"></i>
                                    </button>
                                </div>

                                {departamentos.length > 0 && (
                                    <div className="department-tags">
                                        {departamentos.map((dep) => (
                                            <span className="department-tag" key={dep.value}>
                                                {dep.label}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDepartamento(dep.value)}
                                                    aria-label={`Remover ${dep.label}`}
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
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
                                <label>SLA</label>
                                <CustomSelect
                                    options={SLAs}
                                    value={form.sla}
                                    onChange={(value) => updateField("sla", value)}
                                    placeholder="Selecione a SLA"
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