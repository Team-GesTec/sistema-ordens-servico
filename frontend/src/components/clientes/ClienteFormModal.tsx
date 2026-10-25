
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
    const [form, setForm] = useState<FormularioState>(FORMULARIO_INICIAL);
    const [erroLocal, setErroLocal] = useState<string | null>(null);

    useEffect(() => {
        if (!aberto) return;

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

    function atualizarCampo(campo: keyof FormularioState, valor: string) {
        setForm((anterior) => ({ ...anterior, [campo]: valor }));
        setErroLocal(null);
        onClearError();
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const nome = form.nome.trim();
        const razaoSocial = form.razaoSocial.trim();
        const ramoAtuacao = form.ramoAtuacao.trim();

        if (!nome || !razaoSocial || !ramoAtuacao) {
            setErroLocal("Preencha nome, razão social e ramo de atuação.");
            return;
        }

        setErroLocal(null);
        await onSave({ nome, razao_social: razaoSocial, ramo_atuacao: ramoAtuacao });
    }

    if (!aberto) return null;

    return (
        <div
            className="projeto-modal-overlay cliente-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !salvando) onClose();
            }}
        >
            <section
                className="projeto-modal projeto-form-modal cliente-form-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cliente-modal-titulo"
            >
                <header className="projeto-modal-header">
                    <div>
                        <span className="projetos-eyebrow">GESTÃO DE CLIENTES</span>
                        <h2 id="cliente-modal-titulo">
                            {cliente ? "Editar cliente" : "Cadastrar cliente"}
                        </h2>
                        <p>Dados cadastrais e identificação do cliente.</p>
                    </div>
                    <button
                        type="button"
                        className="projeto-modal-close"
                        aria-label="Fechar formulário"
                        onClick={onClose}
                        disabled={salvando}
                    >
                        ×
                    </button>
                </header>

                <form onSubmit={handleSubmit} aria-busy={salvando}>
                    {(erroLocal || erro) && (
                        <div className="projetos-feedback projetos-feedback--error" role="alert">
                            {erroLocal || erro}
                        </div>
                    )}

                    <div className="projeto-form-grid cliente-form-grid">
                        <div className="projeto-field">
                            <label htmlFor="cliente-nome">Nome *</label>
                            <input
                                id="cliente-nome"
                                type="text"
                                value={form.nome}
                                onChange={(event) => atualizarCampo("nome", event.target.value)}
                                maxLength={255}
                                required
                                disabled={salvando}
                                autoComplete="organization-title"
                            />
                        </div>

                        <div className="projeto-field">
                            <label htmlFor="cliente-razao">Razão social *</label>
                            <input
                                id="cliente-razao"
                                type="text"
                                value={form.razaoSocial}
                                onChange={(event) => atualizarCampo("razaoSocial", event.target.value)}
                                maxLength={255}
                                required
                                disabled={salvando}
                                autoComplete="organization"
                            />
                        </div>

                        <div className="projeto-field projeto-field--wide">
                            <label htmlFor="cliente-ramo">Ramo de atuação *</label>
                            <input
                                id="cliente-ramo"
                                type="text"
                                value={form.ramoAtuacao}
                                onChange={(event) => atualizarCampo("ramoAtuacao", event.target.value)}
                                maxLength={255}
                                required
                                disabled={salvando}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <footer className="projeto-modal-actions cliente-modal-actions">
                        <button type="button" className="projeto-btn-secondary" onClick={onClose} disabled={salvando}>
                            Cancelar
                        </button>
                        <button type="submit" className="projeto-btn-primary" disabled={salvando}>
                            {salvando ? "Salvando..." : cliente ? "Salvar alterações" : "Cadastrar cliente"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

export default ClienteFormModal;
