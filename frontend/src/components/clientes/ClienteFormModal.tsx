
import { useEffect, useState, type FormEvent } from "react";
import type { Cliente } from "../../types/api";
import type { DadosFormularioCliente } from "../../utils/clienteUtils";

interface ClienteFormModalProps {
    aberto: boolean;
    cliente: Cliente | null;
    salvando: boolean;
    erro: string | null;
    onClose: () => void;
    onSave: (dados: DadosFormularioCliente) => Promise<void>;
    onClearError: () => void;
}

interface FormularioState {
    nome: string;
    razaoSocial: string;
    ramoAtuacao: string;
}

const FORMULARIO_INICIAL: FormularioState = {
    nome: "",
    razaoSocial: "",
    ramoAtuacao: "",
};

function ClienteFormModal({
    aberto,
    cliente,
    salvando,
    erro,
    onClose,
    onSave,
    onClearError,
}: ClienteFormModalProps) {
    const [form, setForm] =
        useState<FormularioState>(FORMULARIO_INICIAL);

    const [erroLocal, setErroLocal] = useState<string | null>(null);

    useEffect(() => {
        if (!aberto) {
            return;
        }

        setForm(
            cliente
                ? {
                      nome: cliente.nome,
                      razaoSocial: cliente.razao_social,
                      ramoAtuacao: cliente.ramo_atuacao,
                  }
                : FORMULARIO_INICIAL
        );

        setErroLocal(null);
    }, [aberto, cliente]);

    function atualizarCampo(
        campo: keyof FormularioState,
        valor: string
    ) {
        setForm((anterior) => ({
            ...anterior,
            [campo]: valor,
        }));

        setErroLocal(null);
        onClearError();
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nome = form.nome.trim();
        const razaoSocial = form.razaoSocial.trim();
        const ramoAtuacao = form.ramoAtuacao.trim();

        if (!nome || !razaoSocial || !ramoAtuacao) {
            setErroLocal(
                "Preencha nome, razão social e ramo de atuação."
            );
            return;
        }

        setErroLocal(null);

        await onSave({
            nome,
            razao_social: razaoSocial,
            ramo_atuacao: ramoAtuacao,
        });
    }

    if (!aberto) {
        return null;
    }

    return (
        <div
            className="cliente-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className="cliente-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cliente-modal-titulo"
            >
                <header className="cliente-modal-header">
                    <h2 id="cliente-modal-titulo">
                        {cliente ? "Editar cliente" : "Cadastrar cliente"}
                    </h2>

                    <button
                        type="button"
                        className="cliente-modal-close"
                        aria-label="Fechar formulário"
                        onClick={onClose}
                        disabled={salvando}
                    >
                        ×
                    </button>
                </header>

                <form className="cliente-form" onSubmit={handleSubmit}>
                    {(erroLocal || erro) && (
                        <div
                            className="clientes-feedback clientes-feedback--error"
                            role="alert"
                        >
                            {erroLocal || erro}
                        </div>
                    )}

                    <div className="cliente-form-field">
                        <label htmlFor="cliente-nome">Nome</label>
                        <input
                            id="cliente-nome"
                            type="text"
                            value={form.nome}
                            onChange={(event) =>
                                atualizarCampo("nome", event.target.value)
                            }
                            maxLength={255}
                            required
                        />
                    </div>

                    <div className="cliente-form-field">
                        <label htmlFor="cliente-razao">
                            Razão social
                        </label>
                        <input
                            id="cliente-razao"
                            type="text"
                            value={form.razaoSocial}
                            onChange={(event) =>
                                atualizarCampo(
                                    "razaoSocial",
                                    event.target.value
                                )
                            }
                            maxLength={255}
                            required
                        />
                    </div>

                    <div className="cliente-form-field">
                        <label htmlFor="cliente-ramo">
                            Ramo de atuação
                        </label>
                        <input
                            id="cliente-ramo"
                            type="text"
                            value={form.ramoAtuacao}
                            onChange={(event) =>
                                atualizarCampo(
                                    "ramoAtuacao",
                                    event.target.value
                                )
                            }
                            maxLength={255}
                            required
                        />
                    </div>

                    <div className="cliente-modal-actions">
                        <button
                            type="button"
                            className="clientes-btn-secondary"
                            onClick={onClose}
                            disabled={salvando}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="clientes-btn-primary"
                            disabled={salvando}
                        >
                            {salvando
                                ? "Salvando..."
                                : cliente
                                  ? "Salvar alterações"
                                  : "Cadastrar cliente"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}

export default ClienteFormModal;
