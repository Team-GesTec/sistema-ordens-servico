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
import { ordemServicoService } from "../services/ordemServico";
import type { Cliente, Departamento, Projeto, TipoOrdemServico } from "../types/api";

const TIPOS: SelectOption[] = [
    { value: "instalacao", label: "Instalação" },
    { value: "manutencao", label: "Manutenção" },
];

// TODO: confirmar com o schema (enum nivel_criticidade) se os values batem exatamente.
const CRITICIDADES: SelectOption[] = [
    { value: "baixo", label: "Baixo" },
    { value: "medio", label: "Médio" },
    { value: "alto", label: "Alto" },
    { value: "muito_alto", label: "Muito alto" },
    { value: "urgente", label: "Urgente" },
];

function Ordens() {
    const [cliente, setCliente] = useState<number | null>(null);
    const [departamento, setDepartamento] = useState<number | null>(null);
    const [projeto, setProjeto] = useState<number | null>(null);
    const [tipo, setTipo] = useState<TipoOrdemServico | null>(null);
    const [criticidade, setCriticidade] = useState<string | null>(null);
    const [descricao, setDescricao] = useState("");
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [projetos, setProjetos] = useState<Projeto[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            clienteService.listar(),
            departamentoService.listar(),
            projetoService.listar(),
        ])
            .then(([clientesApi, departamentosApi, projetosApi]) => {
                setClientes(clientesApi);
                setDepartamentos(departamentosApi);
                setProjetos(projetosApi);
            })
            .catch((error: unknown) => setErro(error instanceof ApiError ? error.message : "Não foi possível carregar os dados necessários."))
            .finally(() => setCarregando(false));
    }, []);

    const clienteOptions: SelectOption[] = clientes.map((item) => ({ value: item.id, label: `#${item.id} — ${item.nome}` }));
    const departamentoOptions: SelectOption[] = departamentos.map((item) => ({ value: item.id, label: `#${item.id} — ${item.nome}` }));
    const projetoOptions: SelectOption[] = projetos.map((item) => ({ value: item.id, label: `#${item.id} — cliente #${item.cliente_id}` }));

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!cliente || !departamento || !tipo || !descricao.trim()) {
            setErro("Informe tipo, descrição, cliente e departamento.");
            return;
        }

        setSalvando(true);
        setErro(null);
        setMensagem(null);

        try {
            const criada = await ordemServicoService.criar({
                tipo,
                descricao: descricao.trim(),
                cliente_id: cliente,
                departamento_id: departamento,
                projeto_id: projeto,
                anterior_id: null,
                criticidade: criticidade,
            });
            setDescricao("");
            setCriticidade(null);
            setMensagem(`Ordem de serviço #${criada.id} enviada com sucesso.`);
        } catch (error) {
            setErro(error instanceof ApiError ? error.message : "Não foi possível criar a ordem de serviço.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="layout">
            <main className="main">
                <div className="container">
                    <h1 className="form-title">Cadastrar ordem de serviço</h1>
                    {mensagem && <div className="form-feedback success">{mensagem}</div>}
                    {erro && <div className="form-feedback error">{erro}</div>}

                    <form className="form-card" onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-field">
                                <label>Tipo</label>
                                <CustomSelect
                                    options={TIPOS}
                                    value={tipo}
                                    onChange={(value) => setTipo(String(value) as TipoOrdemServico)}
                                    placeholder="Selecione o tipo"
                                />
                            </div>

                            <div className="form-field">
                                <label>Cliente</label>
                                <CustomSelect
                                    options={clienteOptions}
                                    value={cliente}
                                    onChange={(value) => setCliente(Number(value))}
                                    placeholder={carregando ? "Carregando..." : "Selecione o cliente"}
                                />
                            </div>

                            <div className="form-field">
                                <label>Departamento</label>
                                <CustomSelect
                                    options={departamentoOptions}
                                    value={departamento}
                                    onChange={(value) => setDepartamento(Number(value))}
                                    placeholder={carregando ? "Carregando..." : "Selecione o departamento"}
                                />
                            </div>

                            <div className="form-field">
                                <label>Projeto</label>
                                <CustomSelect
                                    options={projetoOptions}
                                    value={projeto}
                                    onChange={(value) => setProjeto(Number(value))}
                                    placeholder="Nenhum projeto / selecione"
                                />
                            </div>

                            <div className="form-field">
                                <label>Criticidade</label>
                                <CustomSelect
                                    options={CRITICIDADES}
                                    value={criticidade}
                                    onChange={(value) => setCriticidade(String(value))}
                                    placeholder="Selecione a criticidade"
                                />
                            </div>

                            <div className="form-field full-width">
                                <label htmlFor="descricao">Descrição</label>
                                <textarea
                                    id="descricao"
                                    className="form-input form-textarea"
                                    placeholder="Descreva a solicitação"
                                    value={descricao}
                                    onChange={(event) => setDescricao(event.target.value)}
                                    maxLength={1000}
                                    required
                                />
                            </div>
                        </div>

                        <p className="form-hint">
                            O solicitante é definido pelo usuário autenticado no backend. A tela não envia <code>solicitante_id</code> manualmente. Não existe GET de O.S nem rota de relatórios no backend atual, portanto não são inventados selects ou listagens de O.S anteriores.
                        </p>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary" disabled={salvando || carregando}>
                                {salvando ? "Enviando..." : "Enviar ordem de serviço"}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => { setCliente(null); setDepartamento(null); setProjeto(null); setTipo(null); setCriticidade(null); setDescricao(""); }} disabled={salvando}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </main>
            <aside className="details" />
        </div>
    );
}

export default Ordens;