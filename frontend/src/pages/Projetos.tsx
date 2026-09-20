import { useState } from "react";
import CustomSelect from "../components/CustomSelect";
import type { SelectOption } from "../components/CustomSelect"
import "../styles/projeto.css"

const DEPARTAMENTOS: SelectOption[] = [
  { value: "dep-x", label: "Departamento X" },
  { value: "dep-y", label: "Departamento Y" },
  { value: "dep-z", label: "Departamento Z" },
];

const CLIENTES: SelectOption[] = [
  { value: "cliente-1", label: "Cliente A" },
  { value: "cliente-2", label: "Cliente B" },
];

interface ProjetoFormState {
  nome: string;
  descricao: string;
  clienteAssociado: string | null;
}

const INITIAL_FORM_STATE: ProjetoFormState = {
  nome: "",
  descricao: "",
  clienteAssociado: null,
};

interface ProjetoPayload extends ProjetoFormState {
  departamentos: string[];
}

export default function Projetos() {
  const [form, setForm] = useState<ProjetoFormState>(INITIAL_FORM_STATE);

  // Departamento pendente no select, antes de ser confirmado.
  const [departamentoAtual, setDepartamentoAtual] = useState<string | null>(null);
  // Departamentos já confirmados (as "tags" Departamento X / Departamento Y do print).
  const [departamentos, setDepartamentos] = useState<SelectOption[]>([]);

  function updateField<K extends keyof ProjetoFormState>(
    field: K,
    value: ProjetoFormState[K]
  ) {
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

    const payload: ProjetoPayload = {
      ...form,
      departamentos: departamentos.map((dep) => dep.value),
    };

    // TODO: integrar com a API de cadastro de projetos.
    console.log("Projeto a salvar:", payload);
  }

  function handleCancel() {
    setForm(INITIAL_FORM_STATE);
    setDepartamentos([]);
    setDepartamentoAtual(null);
  }

  return (
    <div className="layout">
      <div className="overlay"></div>

      <main className="main">
        <div className="container">
          <h1 className="form-title">Cadastrar Projeto</h1>

          <form className="form-card" onSubmit={handleSubmit}>
            <div className="form-columns">
              <div className="form-column">
                <div className="form-field">
                  <label htmlFor="nome-projeto">Nome do Projeto</label>
                  <input
                    id="nome-projeto"
                    type="text"
                    className="form-input"
                    placeholder="Defina um nome para o projeto"
                    value={form.nome}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateField("nome", e.target.value)
                    }
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="descricao-projeto">Descrição</label>
                  <textarea
                    id="descricao-projeto"
                    className="form-input form-textarea form-textarea-lg"
                    placeholder="Descreva o Projeto"
                    value={form.descricao}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      updateField("descricao", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="form-column">
                <div className="form-field">
                  <label>Departamento(s) envolvido(s)</label>
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
                  <label>Cliente associado</label>
                  <CustomSelect
                    options={CLIENTES}
                    value={form.clienteAssociado}
                    onChange={(value) => updateField("clienteAssociado", value)}
                    placeholder="Selecione o cliente"
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
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
