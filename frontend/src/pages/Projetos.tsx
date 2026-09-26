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
import { clienteService } from "../services/cliente";
import { departamentoService } from "../services/departamento";
import { projetoService } from "../services/projeto";
import type { Cliente, Departamento, Projeto, StatusProjeto } from "../types/api";

const STATUS: SelectOption[] = [
    { value: "pendente", label: "Pendente" },
    { value: "em_andamento", label: "Em andamento" },
    { value: "aguardando_embarque", label: "Aguardando embarque" },
    { value: "validacao_testes", label: "Validação de testes" },
    { value: "bloqueado", label: "Bloqueado" },
    { value: "review", label: "Review" },
    { value: "concluido", label: "Concluído" },
];

interface ProjetoFormState {
    clienteId: number | null;
    dataPrazo: string;
    status: StatusProjeto;
}

const INITIAL_FORM_STATE: ProjetoFormState = {
    clienteId: null,
    dataPrazo: "",
    status: "pendente",
};

function Projetos() {
    const [form, setForm] = useState<ProjetoFormState>(INITIAL_FORM_STATE);
    const [departamentoAtual, setDepartamentoAtual] = useState<number | null>(null);
    const [departamentosSelecionados, setDepartamentosSelecionados] = useState<number[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([clienteService.listar(), departamentoService.listar(), projetoService.listar()])
            .then(([clientesApi, departamentosApi, projetosApi]) => {
                setClientes(clientesApi);
                setDepartamentos(departamentosApi);
                setProjetos(projetosApi);
            })
            .catch((error: unknown) => setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os dados do projeto."))
            .finally(() => setCarregando(false));
    }, []);

    const clienteOptions: SelectOption[] = clientes.map((cliente) => ({ value: cliente.id, label: `#${cliente.id} — ${cliente.nome}` }));
    const departamentoOptions: SelectOption[] = departamentos.map((departamento) => ({ value: departamento.id, label: `#${departamento.id} — ${departamento.nome}` }));

    function adicionarDepartamento(): void {
        if (!departamentoAtual || departamentosSelecionados.includes(departamentoAtual)) {
            setDepartamentoAtual(null);
            return;
        }
        setDepartamentosSelecionados((prev) => [...prev, departamentoAtual]);
        setDepartamentoAtual(null);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.clienteId || departamentosSelecionados.length === 0) {
            setErro("Selecione um cliente e pelo menos um departamento.");
            return;
        }

        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            const criado = await projetoService.criar({
                cliente_id: form.clienteId,
                data_prazo: form.dataPrazo ? new Date(`${form.dataPrazo}T00:00:00`).toISOString() : null,
                status: form.status,
                departamentos: departamentosSelecionados,
            });
            setProjetos((prev) => [...prev, criado].sort((a, b) => a.id - b.id));
            setForm(INITIAL_FORM_STATE);
            setDepartamentosSelecionados([]);
            setMensagem(`Projeto #${criado.id} cadastrado com sucesso.`);
        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Não foi possível cadastrar o projeto.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="layout">
            <main className="main">
                <div className="container">
                    <h1 className="form-title">Cadastrar projeto</h1>
                    {mensagem && <div className="form-feedback success">{mensagem}</div>}
                    {erro && <div className="form-feedback error">{erro}</div>}

                    <form className="form-card" onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Cliente</label>
                                <CustomSelect
                                    options={clienteOptions}
                                    value={form.clienteId}
                                    onChange={(value) => setForm((prev) => ({ ...prev, clienteId: Number(value) }))}
                                    placeholder={carregando ? "Carregando..." : "Selecione o cliente"}
                                />
                            </div>

                            <div className="form-field">
                                <label>Status</label>
                                <CustomSelect
                                    options={STATUS}
                                    value={form.status}
                                    onChange={(value) => setForm((prev) => ({ ...prev, status: String(value) as StatusProjeto }))}
                                    placeholder="Selecione o status"
                                />
                            </div>

                            <div className="form-field">
                                <label htmlFor="data-prazo">Data de prazo</label>
                                <input
                                    id="data-prazo"
                                    type="date"
                                    className="form-input"
                                    value={form.dataPrazo}
                                    onChange={(event) => setForm((prev) => ({ ...prev, dataPrazo: event.target.value }))}
                                />
                            </div>

                            <div className="form-field">
                                <label>Departamento</label>
                                <div className="department-group">
                                    <CustomSelect
                                        options={departamentoOptions}
                                        value={departamentoAtual}
                                        onChange={(value) => setDepartamentoAtual(Number(value))}
                                        placeholder="Selecione um departamento"
                                    />
                                    <button type="button" className="department-confirm" onClick={adicionarDepartamento} aria-label="Adicionar departamento">
                                        <i className="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                                <div className="department-tags">
                                    {departamentosSelecionados.map((id) => {
                                        const departamento = departamentos.find((item) => item.id === id);
                                        return (
                                            <div className="department-tag" key={id}>
                                                {departamento ? departamento.nome : `#${id}`}
                                                <button type="button" onClick={() => setDepartamentosSelecionados((prev) => prev.filter((item) => item !== id))} aria-label={`Remover ${departamento?.nome ?? id}`}>
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <p className="form-hint">
                            O backend não possui coluna de nome/descrição para projeto. A tela usa somente <code>cliente_id</code>, <code>departamentos</code>, <code>data_prazo</code> e <code>status</code> do contrato real.
                        </p>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={salvando || carregando}>
                                {salvando ? "Salvando..." : "Salvar projeto"}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => { setForm(INITIAL_FORM_STATE); setDepartamentosSelecionados([]); setDepartamentoAtual(null); }} disabled={salvando}>
                                Cancelar
                            </button>
                        </div>
                    </form>

                    <div className="form-card" style={{ marginTop: 20 }}>
                        <strong style={{ color: "#fff" }}>Projetos carregados da API</strong>
                        {projetos.length === 0 ? (
                            <p className="form-hint">Nenhum projeto retornado pelo backend.</p>
                        ) : (
                            projetos.map((projeto) => (
                                <div key={projeto.id} className="form-hint">
                                    #{projeto.id} — cliente #{projeto.cliente_id} — {projeto.status} — departamentos: {projeto.departamentos.join(", ")}
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

export default Projetos;
