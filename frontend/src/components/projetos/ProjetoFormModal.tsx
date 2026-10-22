import { useEffect, useState, type FormEvent } from "react";
import Autocomplete, { type AutocompleteOption } from "../common/Autocomplete";
import type { Cliente, Departamento, Projeto, ProjetoInput, StatusProjeto } from "../../types/api";

const STATUS_OPTIONS: { value: StatusProjeto; label: string }[] = [
    { value: "em_planejamento", label: "Em planejamento" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "pausado", label: "Pausado" },
    { value: "concluido", label: "Concluído" },
];

interface FormularioProjeto {
    nome: string;
    clienteId: number | null;
    dataInicio: string;
    dataFim: string;
    status: StatusProjeto;
    departamentos: number[];
}

const FORM_INICIAL: FormularioProjeto = {
    nome: "",
    clienteId: null,
    dataInicio: "",
    dataFim: "",
    status: "em_planejamento",
    departamentos: [],
};

function dataInput(valor: string | null | undefined): string {
    return valor ? valor.slice(0, 10) : "";
}

interface ProjetoFormModalProps {
    aberto: boolean;
    projeto: Projeto | null;
    modoDuplicacao?: boolean;
    clientes: Cliente[];
    departamentos: Departamento[];
    salvando: boolean;
    erro: string | null;
    carregandoOpcoes?: boolean;
    onClose: () => void;
    onSave: (dados: ProjetoInput) => Promise<void>;
}

export default function ProjetoFormModal({ aberto, projeto, modoDuplicacao = false, clientes, departamentos, salvando, erro, carregandoOpcoes = false, onClose, onSave }: ProjetoFormModalProps) {
    const [form, setForm] = useState<FormularioProjeto>(FORM_INICIAL);
    const [departamentoAtual, setDepartamentoAtual] = useState<number | null>(null);
    const [erroLocal, setErroLocal] = useState<string | null>(null);

    useEffect(() => {
        if (!aberto) return;
        setForm(projeto ? {
            nome: projeto.nome,
            clienteId: modoDuplicacao && !clientes.some((cliente) => cliente.id === projeto.cliente_id && cliente.ativo) ? null : projeto.cliente_id,
            dataInicio: dataInput(projeto.data_inicio),
            dataFim: dataInput(projeto.data_fim),
            status: projeto.status,
            departamentos: [...projeto.departamentos],
        } : FORM_INICIAL);
        setDepartamentoAtual(null);
        setErroLocal(null);
    }, [aberto, projeto, modoDuplicacao, clientes]);

    if (!aberto) return null;

    const clienteOptions: AutocompleteOption[] = clientes.map((cliente) => ({
        value: cliente.id,
        label: `#${cliente.id} — ${cliente.nome}`,
        description: cliente.razao_social,
        disabled: !cliente.ativo,
    }));
    const departamentoOptions: AutocompleteOption[] = departamentos.map((departamento) => ({
        value: departamento.id,
        label: `#${departamento.id} — ${departamento.nome}`,
    }));

    function adicionarDepartamento(): void {
        if (departamentoAtual === null || form.departamentos.includes(departamentoAtual)) return;
        setForm((anterior) => ({ ...anterior, departamentos: [...anterior.departamentos, departamentoAtual] }));
        setDepartamentoAtual(null);
    }

    async function enviar(event: FormEvent<HTMLFormElement>): Promise<void> {
        event.preventDefault();
        setErroLocal(null);
        if (!form.nome.trim()) {
            setErroLocal("Informe o nome do projeto.");
            return;
        }
        if (form.clienteId === null) {
            setErroLocal("Selecione um cliente existente.");
            return;
        }
        if (form.departamentos.length === 0) {
            setErroLocal("Selecione pelo menos um departamento.");
            return;
        }
        await onSave({
            nome: form.nome.trim(),
            cliente_id: form.clienteId,
            data_inicio: form.dataInicio ? new Date(`${form.dataInicio}T00:00:00`).toISOString() : null,
            data_fim: form.dataFim ? new Date(`${form.dataFim}T00:00:00`).toISOString() : null,
            status: form.status,
            departamentos: form.departamentos,
        });
    }

    return (
        <div className="projeto-modal-overlay" role="presentation">
            <section className="projeto-modal projeto-form-modal" role="dialog" aria-modal="true" aria-labelledby="projeto-form-title">
                <header className="projeto-modal-header">
                    <div>
                        <h2 id="projeto-form-title">{modoDuplicacao ? "Duplicar projeto — revisar dados" : projeto ? "Editar projeto" : "Cadastrar projeto"}</h2>
                        <p>Preencha os dados do projeto e seus relacionamentos.</p>
                    </div>
                    <button type="button" className="projeto-modal-close" onClick={onClose} disabled={salvando} aria-label="Fechar">×</button>
                </header>
                {(erroLocal || erro) && <div className="projetos-feedback projetos-feedback--error" role="alert">{erroLocal ?? erro}</div>}
                <form onSubmit={enviar}>
                    <div className="projeto-form-grid">
                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="projeto-nome">Nome do projeto *</label>
                            <input id="projeto-nome" value={form.nome} onChange={(event) => setForm((anterior) => ({ ...anterior, nome: event.target.value }))} required disabled={salvando} />
                        </div>
                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="projeto-cliente">Cliente *</label>
                            <Autocomplete id="projeto-cliente" options={clienteOptions} value={form.clienteId} onChange={(value) => setForm((anterior) => ({ ...anterior, clienteId: value === null ? null : Number(value) }))} placeholder="Pesquise pelo nome ou razão social" disabled={salvando} loading={carregandoOpcoes} loadingMessage="Carregando clientes..." emptyMessage="Nenhum cliente encontrado." />
                        </div>
                        <div className="projeto-field">
                            <label htmlFor="projeto-status">Status *</label>
                            <select id="projeto-status" value={form.status} onChange={(event) => setForm((anterior) => ({ ...anterior, status: event.target.value as StatusProjeto }))} disabled={salvando}>
                                {STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                            </select>
                        </div>
                        <div className="projeto-field">
                            <label htmlFor="projeto-data-inicio">Data de início</label>
                            <input id="projeto-data-inicio" type="date" value={form.dataInicio} onChange={(event) => setForm((anterior) => ({ ...anterior, dataInicio: event.target.value }))} disabled={salvando} />
                        </div>
                        <div className="projeto-field">
                            <label htmlFor="projeto-data-fim">Data de término</label>
                            <input id="projeto-data-fim" type="date" value={form.dataFim} onChange={(event) => setForm((anterior) => ({ ...anterior, dataFim: event.target.value }))} disabled={salvando} />
                        </div>
                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="projeto-departamento">Departamentos envolvidos *</label>
                            <div className="projeto-departamento-adicao">
                                <Autocomplete id="projeto-departamento" options={departamentoOptions} value={departamentoAtual} onChange={(value) => setDepartamentoAtual(value === null ? null : Number(value))} placeholder="Pesquise um departamento" disabled={salvando} loading={carregandoOpcoes} loadingMessage="Carregando departamentos..." emptyMessage="Nenhum departamento encontrado." clearable />
                                <button type="button" className="projeto-btn-secondary" onClick={adicionarDepartamento} disabled={salvando || departamentoAtual === null || form.departamentos.includes(departamentoAtual)}>Adicionar</button>
                            </div>
                            <div className="projeto-departamento-tags">
                                {form.departamentos.map((id) => {
                                    const departamento = departamentos.find((item) => item.id === id);
                                    return <span key={id} className="projeto-departamento-tag">{departamento?.nome ?? `#${id}`}<button type="button" aria-label={`Remover ${departamento?.nome ?? id}`} onClick={() => setForm((anterior) => ({ ...anterior, departamentos: anterior.departamentos.filter((item) => item !== id) }))} disabled={salvando}>×</button></span>;
                                })}
                            </div>
                        </div>
                    </div>
                    <footer className="projeto-modal-actions">
                        <button type="button" className="projeto-btn-secondary" onClick={onClose} disabled={salvando}>Cancelar</button>
                        <button type="submit" className="projeto-btn-primary" disabled={salvando}>{salvando ? "Salvando…" : modoDuplicacao ? "Criar novo projeto" : projeto ? "Salvar alterações" : "Cadastrar projeto"}</button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
