import { useNavigate } from "react-router-dom";
import type { Projeto, ProjetoDetalhe, StatusProjeto } from "../../types/api";

const STATUS_PROJETO_LABELS: Record<StatusProjeto, string> = {
    em_planejamento: "Em planejamento",
    em_andamento: "Em andamento",
    pausado: "Pausado",
    concluido: "Concluído",
};

const STATUS_OS_LABELS: Record<string, string> = {
    em_andamento: "Em andamento",
    aguardando: "Aguardando",
    validacao_testes: "Validação de testes",
    bloqueado: "Bloqueado",
    concluido: "Concluída",
};

interface ProjetoDetalhesModalProps {
    projeto: ProjetoDetalhe | null;
    podeGerenciar: boolean;
    onClose: () => void;
    onEditar: (projeto: Projeto) => void;
    onAlterarAtivo: (projeto: Projeto, acao: "inativar" | "reativar") => void;
}

function dataFormatada(valor: string | null): string {
    if (!valor) return "Não informada";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? "Não informada" : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function ProjetoDetalhesModal({ projeto, podeGerenciar, onClose, onEditar, onAlterarAtivo }: ProjetoDetalhesModalProps) {
    const navigate = useNavigate();

    function abrirOrdem(ordemId: number) {
        onClose();
        navigate(`/ordens?visualizar=${ordemId}`);
    }

    if (!projeto) return null;
    return (
        <div className="projeto-modal-overlay" role="presentation">
            <section className="projeto-modal projeto-details-modal" role="dialog" aria-modal="true" aria-labelledby="projeto-details-title">
                <header className="projeto-modal-header">
                    <div>
                        <p className="projeto-modal-eyebrow">Projeto #{projeto.id}</p>
                        <h2 id="projeto-details-title">{projeto.nome}</h2>
                        <p>{projeto.cliente?.nome ?? `Cliente #${projeto.cliente_id}`} · {STATUS_PROJETO_LABELS[projeto.status]}</p>
                    </div>
                    <button type="button" className="projeto-modal-close" onClick={onClose} aria-label="Fechar detalhes">×</button>
                </header>
                {!projeto.ativo && <div className="projetos-feedback projetos-feedback--warning">Este projeto está inativo. O registro e o histórico foram preservados.</div>}
                <section className="projeto-details-section">
                    <h3>Visão geral</h3>
                    <div className="projeto-details-grid">
                        <div><span>Cliente</span><strong>{projeto.cliente?.nome ?? `#${projeto.cliente_id}`}</strong><small>{projeto.cliente?.razao_social ?? ""}</small></div>
                        <div><span>Estado do registro</span><strong>{projeto.ativo ? "Ativo" : "Inativo"}</strong></div>
                        <div><span>Data de início</span><strong>{dataFormatada(projeto.data_inicio)}</strong></div>
                        <div><span>Data de término</span><strong>{dataFormatada(projeto.data_fim)}</strong></div>
                        <div className="projeto-details-full"><span>Departamentos</span><strong>{projeto.departamentos_detalhes.length ? projeto.departamentos_detalhes.map((item) => item.nome).join(", ") : "Nenhum departamento vinculado"}</strong></div>
                    </div>
                </section>
                <section className="projeto-details-section">
                    <div className="projeto-section-header"><h3>Conclusão</h3><strong>{projeto.percentual_conclusao === null ? "Sem ordens de serviço" : `${projeto.percentual_conclusao}%`}</strong></div>
                    {projeto.percentual_conclusao !== null && <div className="projeto-progress-track projeto-progress-track--large" role="progressbar" aria-label="Percentual de conclusão" aria-valuemin={0} aria-valuemax={100} aria-valuenow={projeto.percentual_conclusao}><span style={{ width: `${Math.min(100, Math.max(0, projeto.percentual_conclusao))}%` }} /></div>}
                    <p className="projeto-muted">{projeto.os_concluidas} de {projeto.total_os_elegiveis} O.S. ativas consideradas no cálculo. {podeGerenciar ? "O histórico abaixo inclui ordens ativas e inativas." : "A lista abaixo inclui somente O.S. ativas."}</p>
                </section>
                <section className="projeto-details-section">
                    <div className="projeto-section-header"><h3>Ordens de serviço vinculadas</h3><span className="projeto-count-badge">{projeto.ordens_servico.length}</span></div>
                    {projeto.ordens_servico.length === 0 ? (
                        <p className="projeto-empty-inline">Nenhuma ordem de serviço vinculada a este projeto.</p>
                    ) : (
                        <div className="projeto-os-list">
                            {projeto.ordens_servico.map((ordem) => (
                                <button
                                    type="button"
                                    className={`projeto-os-item projeto-os-item--link${ordem.ativo ? "" : " projeto-os-item--inativo"}`}
                                    key={ordem.id}
                                    onClick={() => abrirOrdem(ordem.id)}
                                    aria-label={`Abrir detalhes da O.S. #${ordem.id}: ${ordem.titulo}`}
                                    title="Abrir detalhes da ordem de serviço"
                                >
                                    <span className="projeto-os-main"><strong>OS #{ordem.id} · {ordem.titulo}</strong><span>Criada em {dataFormatada(ordem.data_criacao)}</span></span>
                                    <span className={`projeto-os-status projeto-os-status--${ordem.status}`}>{STATUS_OS_LABELS[ordem.status] ?? ordem.status}</span>
                                    <span className={`projeto-os-ativo ${ordem.ativo ? "is-active" : "is-inactive"}`}>{ordem.ativo ? "Ativa" : "Inativa"}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>
                <footer className="projeto-modal-actions">
                    <button type="button" className="projeto-btn-secondary" onClick={onClose}>Fechar</button>
                    {podeGerenciar && <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(projeto)}>Editar</button>}
                    {podeGerenciar && (projeto.ativo
                        ? <button type="button" className="projeto-btn-danger" onClick={() => onAlterarAtivo(projeto, "inativar")}>Inativar</button>
                        : <button type="button" className="projeto-btn-primary" onClick={() => onAlterarAtivo(projeto, "reativar")}>Reativar</button>)}
                </footer>
            </section>
        </div>
    );
}