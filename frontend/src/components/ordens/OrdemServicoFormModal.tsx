/**
 * Modal de cadastro e edição de O.S.
 * Valida os campos obrigatórios antes de enviar e delega o salvamento para `onSave` (useOrdens).
 *
 * AJ-06: no cadastro, o gestor pode marcar "O.S. antiga / existente" para informar data de abertura
 * passada (com aviso na tela), status atual e, se concluída, data de conclusão e parecer técnico.
 * O SLA não é calculado aqui: quem calcula é o backend a partir da data de abertura.
 */

import { useEffect, useState, type FormEvent } from "react";
import type {
    Cliente,
    Departamento,
    NivelCriticidade,
    OrdemServico,
    OrdemServicoInput,
    Projeto,
    StatusOrdemServico,
    TipoOrdemServico,
} from "../../types/api";
import Autocomplete from "../common/Autocomplete";
import type { AutocompleteOption } from "../common/Autocomplete";
import { STATUS_LABELS } from "../../utils/ordemServicoUtils";

interface OrdemServicoFormModalProps {
    aberto: boolean;
    ordem: OrdemServico | null;
    clientes: Cliente[];
    departamentos: Departamento[];
    projetos: Projeto[];
    salvando: boolean;
    erro: string | null;
    /** AJ-06: libera o cadastro de O.S. antiga/existente (somente gestor). */
    podeCadastrarAntiga?: boolean;
    onClose: () => void;
    onSave: (dados: OrdemServicoInput) => Promise<void>;
    onClearError: () => void;
}

/** AJ-06: campos do cadastro de O.S. antiga/existente (migração manual). */
interface FormularioOrdemAntiga {
    ativo: boolean;
    dataAbertura: string;
    status: StatusOrdemServico;
    dataConclusao: string;
    parecerTecnico: string;
    /** Momento (ms) da última interação, usado como "agora" sem chamar Date.now() no render. */
    referencia: number;
}

const FORMULARIO_ANTIGA_INICIAL: FormularioOrdemAntiga = {
    ativo: false,
    referencia: 0,
    dataAbertura: "",
    status: "em_andamento",
    dataConclusao: "",
    parecerTecnico: "",
};

const STATUS_OPCOES: AutocompleteOption[] = (
    Object.keys(STATUS_LABELS) as StatusOrdemServico[]
).map((status) => ({ value: status, label: STATUS_LABELS[status] }));

/** Mesma folga de relógio usada pela API para considerar a abertura "no passado". */
const TOLERANCIA_DATA_PASSADA_MS = 5 * 60 * 1000;

/** Converte milissegundos para o formato do input datetime-local (AAAA-MM-DDTHH:mm), no fuso do navegador. */
function msParaInput(ms: number): string {
    const data = new Date(ms);
    const deslocamento = data.getTimezoneOffset() * 60000;
    return new Date(ms - deslocamento).toISOString().slice(0, 16);
}

/** Converte o valor do datetime-local (hora local) em milissegundos; NaN se vazio/inválido. */
function inputParaMs(valor: string): number {
    return valor ? new Date(valor).getTime() : Number.NaN;
}

interface FormularioOrdem {
    titulo: string;
    tipo: TipoOrdemServico | null;
    descricao: string;
    clienteId: number | null;
    departamentoId: number | null;
    projetoId: number | null;
    criticidade: NivelCriticidade | null;
}

const FORMULARIO_INICIAL: FormularioOrdem = {
    titulo: "",
    tipo: null,
    descricao: "",
    clienteId: null,
    departamentoId: null,
    projetoId: null,
    criticidade: null,
};

const TIPOS: AutocompleteOption[] = [
    { value: "instalacao", label: "Instalação" },
    { value: "manutencao", label: "Manutenção" },
];

const CRITICIDADES: AutocompleteOption[] = [
    { value: "baixo", label: "Baixo" },
    { value: "medio", label: "Médio" },
    { value: "alto", label: "Alto" },
    { value: "muito_alto", label: "Muito alto" },
    { value: "urgente", label: "Urgente" },
];

function OrdemServicoFormModal({
    aberto,
    ordem,
    clientes,
    departamentos,
    projetos,
    salvando,
    erro,
    podeCadastrarAntiga = false,
    onClose,
    onSave,
    onClearError,
}: OrdemServicoFormModalProps) {
    const [form, setForm] =
        useState<FormularioOrdem>(FORMULARIO_INICIAL);
    const [erroLocal, setErroLocal] = useState<string | null>(null);

    // AJ-06: campos da O.S. antiga, reiniciados sempre que o modal abre
    const [antiga, setAntiga] = useState<FormularioOrdemAntiga>(
        FORMULARIO_ANTIGA_INICIAL,
    );
    const [abertoAnterior, setAbertoAnterior] = useState(aberto);

    if (aberto !== abertoAnterior) {
        setAbertoAnterior(aberto);
        if (aberto) {
            setAntiga(FORMULARIO_ANTIGA_INICIAL);
        }
    }

    const exibirCadastroAntiga = podeCadastrarAntiga && ordem === null;
    const cadastroAntigaAtivo = exibirCadastroAntiga && antiga.ativo;
    const aberturaNoPassado =
        cadastroAntigaAtivo &&
        inputParaMs(antiga.dataAbertura) < antiga.referencia;
    const antigaConcluida =
        cadastroAntigaAtivo && antiga.status === "concluido";

    useEffect(() => {
        if (!aberto) return;

        setForm(
            ordem
                ? {
                      titulo: ordem.titulo ?? "",
                      tipo: ordem.tipo,
                      descricao: ordem.descricao ?? "",
                      clienteId: ordem.cliente_id,
                      departamentoId: ordem.departamento_id,
                      projetoId: ordem.projeto_id,
                      criticidade: ordem.criticidade,
                  }
                : FORMULARIO_INICIAL,
        );

        setErroLocal(null);
    }, [aberto, ordem]);

    useEffect(() => {
        if (!aberto) return;

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape" && !salvando) {
                onClose();
            }
        }

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [aberto, salvando, onClose]);

    const clienteOptions: AutocompleteOption[] = clientes
        .filter((cliente) => cliente.ativo)
        .map((cliente) => ({
            value: cliente.id,
            label: cliente.nome,
            description: cliente.razao_social,
        }));

    const departamentoOptions: AutocompleteOption[] = departamentos.map(
        (departamento) => ({
            value: departamento.id,
            label: departamento.nome,
        }),
    );

    const projetoOptions: AutocompleteOption[] = projetos
        .filter(
            (projeto) =>
                form.clienteId !== null &&
                projeto.cliente_id === form.clienteId,
        )
        .map((projeto) => ({
            value: projeto.id,
            label: `Projeto #${projeto.id}`,
            description: `Cliente #${projeto.cliente_id}`,
        }));

    function atualizarCampo<K extends keyof FormularioOrdem>(
        campo: K,
        valor: FormularioOrdem[K],
    ) {
        setForm((anterior) => ({
            ...anterior,
            [campo]: valor,
            ...(campo === "clienteId" ? { projetoId: null } : {}),
        }));

        setErroLocal(null);
        onClearError();
    }

    function atualizarCampoAntiga<K extends keyof FormularioOrdemAntiga>(
        campo: K,
        valor: FormularioOrdemAntiga[K],
    ) {
        setAntiga((anterior) => ({
            ...anterior,
            [campo]: valor,
            referencia: Date.now(),
        }));
        setErroLocal(null);
        onClearError();
    }

    /** AJ-06: valida os campos da O.S. antiga. Devolve a mensagem de erro ou null. */
    function validarCadastroAntiga(): string | null {
        const abertura = inputParaMs(antiga.dataAbertura);

        if (Number.isNaN(abertura)) {
            return "Informe a data de abertura da O.S. antiga.";
        }

        if (abertura >= Date.now() - TOLERANCIA_DATA_PASSADA_MS) {
            return "Para cadastrar uma O.S. antiga, a data de abertura deve ser anterior à data atual.";
        }

        if (antiga.status !== "concluido") {
            return null;
        }

        if (!antiga.parecerTecnico.trim()) {
            return "O parecer técnico é obrigatório para cadastrar uma O.S. concluída.";
        }

        const conclusao = inputParaMs(antiga.dataConclusao);

        if (Number.isNaN(conclusao)) {
            return "Informe a data de conclusão da O.S. concluída.";
        }

        if (conclusao < abertura) {
            return "A data de conclusão não pode ser anterior à data de abertura.";
        }

        if (conclusao > Date.now()) {
            return "A data de conclusão não pode estar no futuro.";
        }

        return null;
    }

    /** AJ-06: campos extras enviados à API quando o cadastro é de O.S. antiga. */
    function montarDadosAntiga(): Partial<OrdemServicoInput> {
        if (!cadastroAntigaAtivo) return {};

        return {
            data_criacao: new Date(antiga.dataAbertura).toISOString(),
            status: antiga.status,
            ...(antiga.status === "concluido"
                ? {
                      parecer_tecnico: antiga.parecerTecnico.trim(),
                      data_fim: new Date(antiga.dataConclusao).toISOString(),
                  }
                : {}),
        };
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (
            !form.titulo.trim() ||
            !form.descricao.trim() ||
            !form.tipo ||
            form.clienteId === null ||
            form.departamentoId === null
        ) {
            setErroLocal(
                "Preencha título, descrição, tipo, cliente e departamento.",
            );
            return;
        }

        if (cadastroAntigaAtivo) {
            const erroAntiga = validarCadastroAntiga();
            if (erroAntiga) {
                setErroLocal(erroAntiga);
                return;
            }
        }

        setErroLocal(null);

        await onSave({
            titulo: form.titulo.trim(),
            tipo: form.tipo,
            descricao: form.descricao.trim(),
            cliente_id: form.clienteId,
            departamento_id: form.departamentoId,
            projeto_id: form.projetoId,
            anterior_id: ordem?.anterior_id ?? null,
            criticidade: form.criticidade,
            ...montarDadosAntiga(),
        });
    }

    if (!aberto) return null;

    return (
        <div
            className="ordem-modal-overlay"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !salvando
                ) {
                    onClose();
                }
            }}
        >
            <section
                className="ordem-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ordem-form-titulo"
            >
                <header className="ordem-modal-header">
                    <div>
                        <span className="ordem-card-id">
                            {ordem ? `OS #${ordem.id}` : "Nova solicitação"}
                        </span>

                        <h2 id="ordem-form-titulo">
                            {ordem
                                ? "Editar ordem de serviço"
                                : "Cadastrar ordem de serviço"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="ordem-modal-close"
                        onClick={onClose}
                        disabled={salvando}
                        aria-label="Fechar formulário"
                    >
                        ×
                    </button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="ordem-modal-body ordem-form">
                        {(erroLocal || erro) && (
                            <div
                                className="ordens-feedback ordens-feedback--error"
                                role="alert"
                            >
                                {erroLocal || erro}
                            </div>
                        )}

                        <div className="ordem-form-grid">
                            <div className="ordem-form-field ordem-form-field--wide">
                                <label htmlFor="os-titulo">Título *</label>
                                <input
                                    id="os-titulo"
                                    type="text"
                                    value={form.titulo}
                                    onChange={(event) =>
                                        atualizarCampo("titulo", event.target.value)
                                    }
                                    maxLength={60}
                                    required
                                />
                            </div>

                            <div className="ordem-form-field">
                                <label htmlFor="os-tipo">Tipo *</label>
                                <Autocomplete
                                    id="os-tipo"
                                    options={TIPOS}
                                    value={form.tipo}
                                    onChange={(valor) =>
                                        atualizarCampo(
                                            "tipo",
                                            valor as TipoOrdemServico | null,
                                        )
                                    }
                                    placeholder="Selecione o tipo"
                                />
                            </div>

                            <div className="ordem-form-field">
                                <label htmlFor="os-criticidade">
                                    Criticidade
                                </label>
                                <Autocomplete
                                    id="os-criticidade"
                                    options={CRITICIDADES}
                                    value={form.criticidade}
                                    onChange={(valor) =>
                                        atualizarCampo(
                                            "criticidade",
                                            valor as NivelCriticidade | null,
                                        )
                                    }
                                    placeholder="Selecione a criticidade"
                                    clearable
                                />
                            </div>

                            <div className="ordem-form-field">
                                <label htmlFor="os-cliente">Cliente *</label>
                                <Autocomplete
                                    id="os-cliente"
                                    options={clienteOptions}
                                    value={form.clienteId}
                                    onChange={(valor) =>
                                        atualizarCampo(
                                            "clienteId",
                                            valor === null ? null : Number(valor),
                                        )
                                    }
                                    placeholder="Buscar cliente..."
                                />
                            </div>

                            <div className="ordem-form-field">
                                <label htmlFor="os-departamento">
                                    Departamento *
                                </label>
                                <Autocomplete
                                    id="os-departamento"
                                    options={departamentoOptions}
                                    value={form.departamentoId}
                                    onChange={(valor) =>
                                        atualizarCampo(
                                            "departamentoId",
                                            valor === null ? null : Number(valor),
                                        )
                                    }
                                    placeholder="Buscar departamento..."
                                />
                            </div>

                            <div className="ordem-form-field ordem-form-field--wide">
                                <label htmlFor="os-projeto">Projeto</label>
                                <Autocomplete
                                    id="os-projeto"
                                    options={projetoOptions}
                                    value={form.projetoId}
                                    onChange={(valor) =>
                                        atualizarCampo(
                                            "projetoId",
                                            valor === null ? null : Number(valor),
                                        )
                                    }
                                    placeholder={
                                        form.clienteId === null
                                            ? "Selecione um cliente primeiro"
                                            : "Buscar projeto do cliente..."
                                    }
                                    disabled={form.clienteId === null}
                                    clearable
                                />
                            </div>

                            <div className="ordem-form-field ordem-form-field--wide">
                                <label htmlFor="os-descricao">Descrição *</label>
                                <textarea
                                    id="os-descricao"
                                    value={form.descricao}
                                    onChange={(event) =>
                                        atualizarCampo(
                                            "descricao",
                                            event.target.value,
                                        )
                                    }
                                    rows={5}
                                    maxLength={1000}
                                    required
                                />
                            </div>

                            {exibirCadastroAntiga && (
                                <fieldset className="ordem-form-field--wide ordem-form-antiga">
                                    <legend className="ordem-form-antiga-legenda">
                                        O.S. antiga / existente
                                    </legend>

                                    <label
                                        className="ordem-form-check"
                                        htmlFor="os-antiga-ativo"
                                    >
                                        <input
                                            id="os-antiga-ativo"
                                            type="checkbox"
                                            checked={antiga.ativo}
                                            onChange={(event) =>
                                                atualizarCampoAntiga(
                                                    "ativo",
                                                    event.target.checked,
                                                )
                                            }
                                            disabled={salvando}
                                        />
                                        Cadastrar uma O.S. que já existia antes do sistema (migração manual)
                                    </label>

                                    {cadastroAntigaAtivo && (
                                        <div className="ordem-form-grid">
                                            <div className="ordem-form-field">
                                                <label htmlFor="os-antiga-abertura">
                                                    Data de abertura *
                                                </label>
                                                <input
                                                    id="os-antiga-abertura"
                                                    type="datetime-local"
                                                    value={antiga.dataAbertura}
                                                    max={msParaInput(antiga.referencia)}
                                                    onChange={(event) =>
                                                        atualizarCampoAntiga(
                                                            "dataAbertura",
                                                            event.target.value,
                                                        )
                                                    }
                                                    required
                                                />
                                            </div>

                                            <div className="ordem-form-field">
                                                <label htmlFor="os-antiga-status">
                                                    Status atual *
                                                </label>
                                                <Autocomplete
                                                    id="os-antiga-status"
                                                    options={STATUS_OPCOES}
                                                    value={antiga.status}
                                                    onChange={(valor) =>
                                                        atualizarCampoAntiga(
                                                            "status",
                                                            (valor ??
                                                                "em_andamento") as StatusOrdemServico,
                                                        )
                                                    }
                                                    placeholder="Selecione o status"
                                                />
                                            </div>

                                            {aberturaNoPassado && (
                                                <div
                                                    className="ordem-form-field--wide ordens-feedback ordens-feedback--aviso"
                                                    role="status"
                                                >
                                                    <strong>Atenção:</strong> a data de abertura informada é anterior à data atual.
                                                    O prazo de SLA será calculado pelo sistema a partir dessa data e a O.S. pode
                                                    ser cadastrada já vencida.
                                                </div>
                                            )}

                                            {antigaConcluida && (
                                                <>
                                                    <div className="ordem-form-field">
                                                        <label htmlFor="os-antiga-conclusao">
                                                            Data de conclusão *
                                                        </label>
                                                        <input
                                                            id="os-antiga-conclusao"
                                                            type="datetime-local"
                                                            value={antiga.dataConclusao}
                                                            min={antiga.dataAbertura || undefined}
                                                            max={msParaInput(antiga.referencia)}
                                                            onChange={(event) =>
                                                                atualizarCampoAntiga(
                                                                    "dataConclusao",
                                                                    event.target.value,
                                                                )
                                                            }
                                                            required
                                                        />
                                                    </div>

                                                    <div className="ordem-form-field ordem-form-field--wide">
                                                        <label htmlFor="os-antiga-parecer">
                                                            Parecer técnico de conclusão *
                                                        </label>
                                                        <textarea
                                                            id="os-antiga-parecer"
                                                            value={antiga.parecerTecnico}
                                                            onChange={(event) =>
                                                                atualizarCampoAntiga(
                                                                    "parecerTecnico",
                                                                    event.target.value,
                                                                )
                                                            }
                                                            rows={4}
                                                            maxLength={1000}
                                                            required
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </fieldset>
                            )}
                        </div>
                    </div>

                    <footer className="ordem-modal-actions">
                        <button
                            type="button"
                            className="ordens-btn-secondary"
                            onClick={onClose}
                            disabled={salvando}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="ordens-btn-primary"
                            disabled={salvando}
                        >
                            {salvando
                                ? "Salvando..."
                                : ordem
                                  ? "Salvar alterações"
                                  : "Cadastrar O.S."}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

export default OrdemServicoFormModal;
