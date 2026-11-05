import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Departamento, VisaoEquipe } from "../../types/api";

interface DepartamentoDetalhesModalProps {
    departamento: Departamento | null;
    visao: VisaoEquipe | null;
    carregando: boolean;
    erro: string | null;
    incluirHistorico: boolean;
    podeEditar: boolean;
    onClose: () => void;
    onEditar: (departamento: Departamento) => void;
}

type SecaoDetalhes = "projetos" | "ordens" | "funcionarios";

function dataPt(valor: string | null | undefined): string {
    if (!valor) return "Não informada";
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? "Não informada"
        : data.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function statusOs(status: string): string {
    const labels: Record<string, string> = {
        em_andamento: "Em andamento",
        aguardando: "Aguardando",
        validacao_testes: "Validação de testes",
        bloqueado: "Bloqueada",
        concluido: "Concluída",
    };
    return labels[status] ?? status.replaceAll("_", " ");
}

function statusProjeto(status: string): string {
    const labels: Record<string, string> = {
        em_planejamento: "Em planejamento",
        em_andamento: "Em andamento",
        pausado: "Pausado",
        concluido: "Concluído",
    };
    return labels[status] ?? status.replaceAll("_", " ");
}

export default function DepartamentoDetalhesModal({
    departamento,
    visao,
    carregando,
    erro,
    incluirHistorico,
    podeEditar,
    onClose,
    onEditar,
}: DepartamentoDetalhesModalProps) {
    const [secoesAbertas, setSecoesAbertas] = useState<Record<SecaoDetalhes, boolean>>({
        projetos: true,
        ordens: true,
        funcionarios: true,
    });
    const navigate = useNavigate();

    useEffect(() => {
        setSecoesAbertas({ projetos: true, ordens: true, funcionarios: true });
    }, [departamento?.id]);

    useEffect(() => {
        if (!departamento) return;
        function aoPressionarTecla(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        document.addEventListener("keydown", aoPressionarTecla);
        return () => document.removeEventListener("keydown", aoPressionarTecla);
    }, [departamento, onClose]);

    if (!departamento) return null;

    const funcionarios = visao?.funcionarios ?? [];
    const responsavel = funcionarios.find((item) => item.id === departamento.responsavel_id);
    const projetos = visao?.projetos ?? [];
    const ordens = visao?.ordens_servico ?? [];

    function alternarSecao(secao: SecaoDetalhes) {
        setSecoesAbertas((atuais) => ({ ...atuais, [secao]: !atuais[secao] }));
    }

    function abrirOrdem(ordemId: number) {
        onClose();
        navigate(`/ordens?visualizar=${ordemId}`);
    }

    return (
        <div
            className="projeto-modal-overlay"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className="projeto-modal projeto-details-modal departamento-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="departamento-details-title"
                aria-describedby="departamento-details-subtitle"
            >
                <header className="projeto-modal-header">
                    <div>
                        <p className="projeto-modal-eyebrow">Departamento #{departamento.id}</p>
                        <h2 id="departamento-details-title">{departamento.nome}</h2>
                        <p id="departamento-details-subtitle">
                            Estrutura operacional · Responsável: {responsavel?.nome ?? (departamento.responsavel_id ? `Funcionário #${departamento.responsavel_id}` : "Não definido")}
                        </p>
                    </div>
                    <button type="button" className="projeto-modal-close" onClick={onClose} aria-label="Fechar detalhes do departamento" autoFocus>×</button>
                </header>

                <div className="departamento-details-content">
                    {carregando && <p className="projeto-empty-inline" role="status">Carregando vínculos do departamento…</p>}
                    {erro && <p className="projetos-feedback projetos-feedback--error" role="alert">{erro}</p>}
                    {!carregando && !erro && !visao && <p className="projeto-empty-inline">Não há detalhes disponíveis para este departamento.</p>}

                    {visao && !carregando && (
                        <>
                            {incluirHistorico && <div className="projetos-feedback projetos-feedback--warning">A consulta inclui registros históricos/inativos permitidos no seu escopo. Os registros inativos são somente para leitura.</div>}
                            <section className="projeto-details-section">
                                <h3>Visão geral</h3>
                                <div className="projeto-details-grid">
                                    <div><span>Identificador</span><strong>Departamento #{departamento.id}</strong></div>
                                    <div><span>Estado</span><strong>Registro existente</strong><small>O schema atual não persiste estado ativo/inativo para departamentos.</small></div>
                                    <div><span>Funcionários</span><strong>{funcionarios.length}</strong></div>
                                    <div><span>Projetos</span><strong>{projetos.length}</strong></div>
                                    <div><span>Ordens de serviço</span><strong>{ordens.length}</strong></div>
                                    <div><span>Responsável</span><strong>{responsavel?.nome ?? (departamento.responsavel_id ? `Funcionário #${departamento.responsavel_id}` : "Não definido")}</strong></div>
                                </div>
                            </section>

                            <section className="projeto-details-section departamento-accordion-section">
                                <button type="button" className="projeto-section-header departamento-accordion-trigger" onClick={() => alternarSecao("projetos")} aria-expanded={secoesAbertas.projetos} aria-controls="departamento-projetos-vinculados">
                                    <h3>Projetos do departamento</h3><span className="projeto-count-badge">{projetos.length}</span><span className="departamento-accordion-chevron" aria-hidden="true">{secoesAbertas.projetos ? "−" : "+"}</span>
                                </button>
                                {secoesAbertas.projetos && <div id="departamento-projetos-vinculados" className="projeto-os-list">
                                    {projetos.length === 0 ? <p className="projeto-empty-inline">Nenhum projeto vinculado.</p> : projetos.map((projeto) => (
                                        <button type="button" key={projeto.id} className={`departamento-vinculo-item departamento-vinculo-item--link${projeto.ativo ? "" : " departamento-vinculo-item--inativo"}`} onClick={() => { onClose(); navigate(`/projetos?visualizar=${projeto.id}`); }} aria-label={`Abrir detalhes do projeto ${projeto.nome}`}>
                                            <span className="departamento-vinculo-main"><strong>Projeto #{projeto.id} · {projeto.nome}</strong><span>{statusProjeto(projeto.status)}</span></span>
                                            <span className={`projeto-os-ativo ${projeto.ativo ? "is-active" : "is-inactive"}`}>{projeto.ativo ? "Ativo" : "Inativo"}</span>
                                        </button>
                                    ))}
                                </div>}
                            </section>

                            <section className="projeto-details-section departamento-accordion-section">
                                <button type="button" className="projeto-section-header departamento-accordion-trigger" onClick={() => alternarSecao("ordens")} aria-expanded={secoesAbertas.ordens} aria-controls="departamento-ordens-vinculadas">
                                    <h3>Ordens de serviço do departamento</h3><span className="projeto-count-badge">{ordens.length}</span><span className="departamento-accordion-chevron" aria-hidden="true">{secoesAbertas.ordens ? "−" : "+"}</span>
                                </button>
                                {secoesAbertas.ordens && <div id="departamento-ordens-vinculadas" className="projeto-os-list">
                                    {ordens.length === 0 ? <p className="projeto-empty-inline">Nenhuma O.S. vinculada.</p> : ordens.map((ordem) => (
                                        <button type="button" key={ordem.id} className={`projeto-os-item projeto-os-item--link${ordem.ativo ? "" : " projeto-os-item--inativo"}`} onClick={() => abrirOrdem(ordem.id)} aria-label={`Abrir O.S. #${ordem.id}: ${ordem.titulo}`}>
                                            <span className="projeto-os-main"><strong>OS #{ordem.id} · {ordem.titulo}</strong><span>Entrega: {dataPt(ordem.data_limite_sla)}</span></span>
                                            <span className={`projeto-os-status projeto-os-status--${ordem.status}`}>{statusOs(ordem.status)}</span>
                                            <span className={`projeto-os-ativo ${ordem.ativo ? "is-active" : "is-inactive"}`}>{ordem.ativo ? "Ativa" : "Inativa"}</span>
                                        </button>
                                    ))}
                                </div>}
                            </section>

                            <section className="projeto-details-section departamento-accordion-section">
                                <button type="button" className="projeto-section-header departamento-accordion-trigger" onClick={() => alternarSecao("funcionarios")} aria-expanded={secoesAbertas.funcionarios} aria-controls="departamento-funcionarios-vinculados">
                                    <h3>Funcionários do departamento</h3><span className="projeto-count-badge">{funcionarios.length}</span><span className="departamento-accordion-chevron" aria-hidden="true">{secoesAbertas.funcionarios ? "−" : "+"}</span>
                                </button>
                                {secoesAbertas.funcionarios && <div id="departamento-funcionarios-vinculados" className="projeto-os-list">
                                    {funcionarios.length === 0 ? <p className="projeto-empty-inline">Nenhum funcionário vinculado.</p> : funcionarios.map((funcionario) => (
                                        <article key={funcionario.id} className={`departamento-vinculo-item${funcionario.ativo ? "" : " departamento-vinculo-item--inativo"}`}>
                                            <div className="departamento-vinculo-main"><strong>{funcionario.nome} · #{funcionario.id}</strong><span>{funcionario.tipo} · {funcionario.usuario}</span></div>
                                            <span className={`projeto-os-ativo ${funcionario.ativo ? "is-active" : "is-inactive"}`}>{funcionario.ativo ? "Ativo" : "Inativo"}</span>
                                        </article>
                                    ))}
                                </div>}
                            </section>
                        </>
                    )}
                </div>

                <footer className="projeto-modal-actions">
                    <button type="button" className="projeto-btn-secondary" onClick={onClose}>Fechar</button>
                    {podeEditar && <button type="button" className="projeto-btn-secondary" onClick={() => onEditar(departamento)}>Editar</button>}
                </footer>
            </section>
        </div>
    );
}
