import type { Cliente } from "../../types/api";
import type { AcaoStatus } from "../../utils/clienteUtils";

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
    const nomeAvatar = cliente.nome.trim() || cliente.razao_social.trim();
    const inicial = nomeAvatar.charAt(0).toLocaleUpperCase("pt-BR") || "C";
    const nomeExibicao = cliente.nome.trim() || `Cliente #${cliente.id}`;

    return (
        <article className={`projeto-card cliente-card${cliente.ativo ? "" : " projeto-card--inativo cliente-card--inativo"}`}>
            <header className="projeto-card-header cliente-card-header">
                <div className="cliente-avatar" aria-hidden="true">{inicial}</div>

                <div className="cliente-identificacao">
                    <span className="cliente-id">CLIENTE #{cliente.id}</span>
                    <h2 className="projeto-card-title cliente-nome" title={nomeExibicao}>
                        {nomeExibicao}
                    </h2>
                    <span className="cliente-razao" title={cliente.razao_social}>
                        {cliente.razao_social || "Razão social não informada"}
                    </span>
                </div>

                <span className={`projeto-status cliente-status-badge${cliente.ativo ? "" : " cliente-status-badge--inativo"}`}>
                    {cliente.ativo ? "Ativo" : "Inativo"}
                </span>
            </header>

            <div className="projeto-card-metadata cliente-card-metadata">
                <span title={cliente.ramo_atuacao || "Ramo de atuação não informado"}>
                    {cliente.ramo_atuacao || "Ramo de atuação não informado"}
                </span>
            </div>

            {podeGerenciar && (
                <div className="projeto-card-actions cliente-actions">
                    {cliente.ativo ? (
                        <>
                            <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(cliente)} disabled={bloqueado}>
                                Editar
                            </button>
                            <button type="button" className="projeto-btn-danger" onClick={() => onAlterarStatus(cliente, "inativar")} disabled={bloqueado}>
                                Inativar
                            </button>
                        </>
                    ) : (
                        <button type="button" className="projeto-btn-primary" onClick={() => onAlterarStatus(cliente, "reativar")} disabled={bloqueado}>
                            Reativar
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}

export default ClienteCard;
