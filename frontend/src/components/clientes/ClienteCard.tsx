
import type { Cliente } from "../../types/api";
import {
    gerarIniciais,
    type AcaoStatus,
} from "../../utils/clienteUtils";

interface ClienteCardProps {
    cliente: Cliente;
    podeGerenciar: boolean;
    bloqueado: boolean;
    onEditar: (cliente: Cliente) => void;
    onAlterarStatus: (cliente: Cliente, acao: AcaoStatus) => void;
}

function ClienteCard({
    cliente,
    podeGerenciar,
    bloqueado,
    onEditar,
    onAlterarStatus,
}: ClienteCardProps) {
    return (
        <article
            className={`cliente-card ${
                cliente.ativo ? "" : "cliente-card--inativo"
            }`}
        >
            <div className="cliente-card-header">
                <div className="cliente-avatar">
                    {gerarIniciais(cliente.nome) || "CL"}
                </div>

                <div className="cliente-identificacao">
                    <h2
                        className="cliente-nome"
                        title={cliente.nome}
                    >
                        {cliente.nome}
                    </h2>

                    <span
                        className="cliente-razao"
                        title={cliente.razao_social}
                    >
                        {cliente.razao_social}
                    </span>
                </div>

                <span
                    className={`cliente-badge ${
                        cliente.ativo ? "" : "cliente-badge--inativo"
                    }`}
                >
                    {cliente.ativo ? "Ativo" : "Inativo"}
                </span>
            </div>

            <div className="cliente-card-footer">
                <span
                    className="cliente-ramo"
                    title={cliente.ramo_atuacao}
                >
                    {`#${cliente.id} · ${cliente.ramo_atuacao}`}
                </span>

                {podeGerenciar && (
                    <div className="cliente-card-actions">
                        {cliente.ativo ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => onEditar(cliente)}
                                    disabled={bloqueado}
                                >
                                    Editar
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onAlterarStatus(cliente, "inativar")
                                    }
                                    disabled={bloqueado}
                                >
                                    Inativar
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    onAlterarStatus(cliente, "reativar")
                                }
                                disabled={bloqueado}
                            >
                                Reativar
                            </button>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}

export default ClienteCard;
