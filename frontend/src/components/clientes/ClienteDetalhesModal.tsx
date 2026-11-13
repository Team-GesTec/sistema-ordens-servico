
import { useEffect, useState } from "react";
import type { Cliente } from "../../types/api";

type DadosEdicao = Pick<Cliente, "nome" | "razao_social" | "ramo_atuacao">;

interface ClienteDetalhesModalProps {
    cliente: Cliente | null;
    podeGerenciar: boolean;
    onClose: () => void;
    salvando: boolean;
    erro: string | null;
    onSalvar: (clienteId: number, dados: DadosEdicao) => Promise<Cliente | null>;
}

export default function ClienteDetalhesModal({
    cliente,
    podeGerenciar,
    onClose,
    salvando,
    erro,
    onSalvar,
}: ClienteDetalhesModalProps) {
    const [editando, setEditando] = useState(false);
    const [rascunho, setRascunho] = useState<DadosEdicao>({
        nome: "",
        razao_social: "",
        ramo_atuacao: "",
    });
    const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
    const [acaoPendente, setAcaoPendente] = useState<"fechar" | "cancelar" | null>(null);

    useEffect(() => {
        if (!cliente) return;

        setRascunho({
            nome: cliente.nome,
            razao_social: cliente.razao_social,
            ramo_atuacao: cliente.ramo_atuacao,
        });
        setEditando(false);
        setConfirmacaoAberta(false);
        setAcaoPendente(null);
    }, [cliente]);

    if (!cliente) return null;

    const clienteAtual = cliente;

    const alterado =
        rascunho.nome !== clienteAtual.nome ||
        rascunho.razao_social !== clienteAtual.razao_social ||
        rascunho.ramo_atuacao !== clienteAtual.ramo_atuacao;

    function atualizarCampo(campo: keyof DadosEdicao, valor: string) {
        setRascunho((anterior) => ({
            ...anterior,
            [campo]: valor,
        }));
    }

    function solicitarSaida(acao: "fechar" | "cancelar") {
        if (salvando) return;

        if (alterado) {
            setAcaoPendente(acao);
            setConfirmacaoAberta(true);
            return;
        }

        setEditando(false);

        if (acao === "fechar") onClose();
    }

    function descartarAlteracoes() {
        setRascunho({
            nome: clienteAtual.nome,
            razao_social: clienteAtual.razao_social,
            ramo_atuacao: clienteAtual.ramo_atuacao,
        });

        setEditando(false);
        setConfirmacaoAberta(false);

        if (acaoPendente === "fechar") onClose();

        setAcaoPendente(null);
    }

    async function salvarEdicao() {
        if (
            !rascunho.nome.trim() ||
            !rascunho.razao_social.trim() ||
            !rascunho.ramo_atuacao.trim()
        ) {
            return;
        }

        const atualizado = await onSalvar(clienteAtual.id, {
            nome: rascunho.nome.trim(),
            razao_social: rascunho.razao_social.trim(),
            ramo_atuacao: rascunho.ramo_atuacao.trim(),
        });

        if (atualizado) setEditando(false);
    }

    return (
        <>
            <div
                className="projeto-modal-overlay"
                role="presentation"
                onMouseDown={(event) => {
                    if (event.target === event.currentTarget) solicitarSaida("fechar");
                }}
            >
                <section
                    className="projeto-modal cliente-details-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cliente-details-title"
                >
                    <header className="projeto-modal-header">
                        <div>
                            <p className="projeto-modal-eyebrow">
                                CADASTRO DE CLIENTE · #{clienteAtual.id}
                            </p>
                            <h2 id="cliente-details-title">
                                {clienteAtual.nome || `Cliente #${clienteAtual.id}`}
                            </h2>
                            <p>{clienteAtual.razao_social || "Razão social não informada"}</p>
                        </div>

                        <div className="projeto-modal-toolbar">
                            {!editando && (
                                <>
                                    <button
                                        type="button"
                                        className="projeto-btn-secondary"
                                        onClick={() => solicitarSaida("fechar")}
                                    >
                                        Fechar
                                    </button>

                                    {podeGerenciar && clienteAtual.ativo && (
                                        <button
                                            type="button"
                                            className="projeto-btn-secondary"
                                            onClick={() => setEditando(true)}
                                        >
                                            Editar cadastro
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </header>

                    <section className="projeto-details-section">
                        <h3>
                            {editando ? "Editar cadastro" : "Informações do cadastro"}
                        </h3>

                        <div className="projeto-details-grid">
                            <div>
                                <span>Identificador</span>
                                <strong>Cliente #{clienteAtual.id}</strong>
                            </div>

                            <div>
                                <span>Situação</span>
                                <strong>{clienteAtual.ativo ? "Ativo" : "Inativo"}</strong>
                            </div>

                            <div className="projeto-details-full">
                                <span>Nome / contato</span>
                                {editando ? (
                                    <input
                                        className="projeto-edit-field"
                                        value={rascunho.nome}
                                        onChange={(event) =>
                                            atualizarCampo("nome", event.target.value)
                                        }
                                    />
                                ) : (
                                    <strong>{clienteAtual.nome || "Não informado"}</strong>
                                )}
                            </div>

                            <div className="projeto-details-full">
                                <span>Razão social</span>
                                {editando ? (
                                    <input
                                        className="projeto-edit-field"
                                        value={rascunho.razao_social}
                                        onChange={(event) =>
                                            atualizarCampo("razao_social", event.target.value)
                                        }
                                    />
                                ) : (
                                    <strong>
                                        {clienteAtual.razao_social || "Não informada"}
                                    </strong>
                                )}
                            </div>

                            <div className="projeto-details-full">
                                <span>Ramo de atuação</span>
                                {editando ? (
                                    <input
                                        className="projeto-edit-field"
                                        value={rascunho.ramo_atuacao}
                                        onChange={(event) =>
                                            atualizarCampo("ramo_atuacao", event.target.value)
                                        }
                                    />
                                ) : (
                                    <strong>
                                        {clienteAtual.ramo_atuacao || "Não informado"}
                                    </strong>
                                )}
                            </div>
                        </div>

                        {erro && editando && (
                            <div
                                className="projetos-feedback projetos-feedback--error"
                                role="alert"
                            >
                                {erro}
                            </div>
                        )}
                    </section>

                    {editando && (
                        <footer className="projeto-modal-actions">
                            <button
                                type="button"
                                className="projeto-btn-secondary"
                                onClick={() => solicitarSaida("cancelar")}
                                disabled={salvando}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="projeto-btn-primary"
                                onClick={salvarEdicao}
                                disabled={
                                    salvando ||
                                    !alterado ||
                                    !rascunho.nome.trim() ||
                                    !rascunho.razao_social.trim() ||
                                    !rascunho.ramo_atuacao.trim()
                                }
                            >
                                {salvando ? "Salvando..." : "Salvar alterações"}
                            </button>
                        </footer>
                    )}
                </section>
            </div>

            {confirmacaoAberta && (
                <div className="projeto-modal-overlay" role="presentation">
                    <section
                        className="projeto-modal"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="cliente-confirmar-saida"
                    >
                        <h2 id="cliente-confirmar-saida">Alterações não salvas</h2>
                        <p>
                            Você tem alterações que ainda não foram salvas.
                            Deseja descartá-las?
                        </p>

                        <footer className="projeto-modal-actions">
                            <button
                                type="button"
                                className="projeto-btn-secondary"
                                onClick={() => {
                                    setConfirmacaoAberta(false);
                                    setAcaoPendente(null);
                                }}
                            >
                                Continuar editando
                            </button>

                            <button
                                type="button"
                                className="projeto-btn-primary"
                                onClick={descartarAlteracoes}
                            >
                                Descartar alterações
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </>
    );
}
