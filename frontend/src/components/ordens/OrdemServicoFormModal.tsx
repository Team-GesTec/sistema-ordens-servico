
import { useEffect, useState, type FormEvent } from "react";
import type {
    Cliente,
    Departamento,
    NivelCriticidade,
    OrdemServico,
    OrdemServicoInput,
    Projeto,
    TipoOrdemServico,
} from "../../types/api";
import Autocomplete from "../common/Autocomplete";
import type { AutocompleteOption } from "../common/Autocomplete";

interface OrdemServicoFormModalProps {
    aberto: boolean;
    ordem: OrdemServico | null;
    clientes: Cliente[];
    departamentos: Departamento[];
    projetos: Projeto[];
    salvando: boolean;
    erro: string | null;
    onClose: () => void;
    onSave: (dados: OrdemServicoInput) => Promise<void>;
    onClearError: () => void;
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
    onClose,
    onSave,
    onClearError,
}: OrdemServicoFormModalProps) {
    const [form, setForm] =
        useState<FormularioOrdem>(FORMULARIO_INICIAL);
    const [erroLocal, setErroLocal] = useState<string | null>(null);

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
