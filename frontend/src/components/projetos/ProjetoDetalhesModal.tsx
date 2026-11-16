
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
    Cliente,
    Departamento,
    Projeto,
    ProjetoDetalhe,
    ProjetoInput,
    StatusProjeto,
} from "../../types/api";

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
    onAlterarAtivo: (projeto: Projeto, acao: "inativar" | "reativar") => void;
    clientes: Cliente[];
    departamentos: Departamento[];
    salvando: boolean;
    erro: string | null;
    onSalvar: (projetoId: number, dados: ProjetoInput) => Promise<boolean>;
}

interface ProjetoRascunho {
    nome: string;
    cliente_id: number;
    data_inicio: string;
    data_fim: string;
    status: StatusProjeto;
    departamentos: number[];
}

function dataFormatada(valor: string | null): string {
    if (!valor) return "Não informada";
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? "Não informada"
        : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function criarRascunho(projeto: ProjetoDetalhe): ProjetoRascunho {
    return {
        nome: projeto.nome,
        cliente_id: projeto.cliente_id,
        data_inicio: projeto.data_inicio?.slice(0, 10) ?? "",
        data_fim: projeto.data_fim?.slice(0, 10) ?? "",
        status: projeto.status,
        departamentos: [...projeto.departamentos],
    };
}

function dataParaApi(valor: string): string | null {
    return valor ? new Date(`${valor}T12:00:00.000Z`).toISOString() : null;
}

export default function ProjetoDetalhesModal({
    projeto,
    podeGerenciar,
    onClose,
    onAlterarAtivo,
    clientes,
    departamentos,
    salvando,
    erro,
    onSalvar,
}: ProjetoDetalhesModalProps) {
    const navigate = useNavigate();
    const [editando, setEditando] = useState(false);
    const [rascunho, setRascunho] = useState<ProjetoRascunho | null>(null);

    useEffect(() => {
        if (projeto) {
            setEditando(false);
            setRascunho(criarRascunho(projeto));
        } else {
            setEditando(false);
            setRascunho(null);
        }
    }, [projeto]);

    if (!projeto) return null;

    const rascunhoAtual = rascunho ?? criarRascunho(projeto);
    const rascunhoOriginal = criarRascunho(projeto);

    const possuiAlteracoes =
        JSON.stringify(rascunhoAtual) !== JSON.stringify(rascunhoOriginal);

    function confirmarSaida(): boolean {
        if (editando && possuiAlteracoes) {
            return window.confirm(
                "Existem alterações não salvas. Deseja descartá-las?"
            );
        }
        return true;
    }

    function fecharModal() {
        if (!confirmarSaida()) return;
        onClose();
    }

    function abrirOrdem(ordemId: number) {
        if (!confirmarSaida()) return;
        onClose();
        navigate(`/ordens/${ordemId}`);
    }

    function iniciarEdicao() {
        if (!projeto || !podeGerenciar || salvando) return;

        setRascunho(criarRascunho(projeto));
        setEditando(true);
    }

    function cancelarEdicao() {
        if (!projeto || !confirmarSaida()) return;

        setRascunho(criarRascunho(projeto));
        setEditando(false);
    }

    function atualizarCampo<K extends keyof ProjetoRascunho>(
        campo: K,
        valor: ProjetoRascunho[K]
    ) {
        setRascunho((atual) => {
            if (!atual) return atual;
            return { ...atual, [campo]: valor };
        });
    }

    function alternarDepartamento(id: number) {
        setRascunho((atual) => {
            if (!atual) return atual;

            const selecionados = atual.departamentos.includes(id)
                ? atual.departamentos.filter((item) => item !== id)
                : [...atual.departamentos, id];

            return { ...atual, departamentos: selecionados };
        });
    }


    async function salvarEdicao() {
        if (!projeto || !rascunho) return;

        if (
            !rascunho.nome.trim() ||
            !rascunho.cliente_id ||
            rascunho.departamentos.length === 0
        ) {
            return;
        }

        const dados: ProjetoInput = {
            nome: rascunho.nome.trim(),
            cliente_id: rascunho.cliente_id,
            data_inicio: dataParaApi(rascunho.data_inicio),
            data_fim: dataParaApi(rascunho.data_fim),
            status: rascunho.status,
            departamentos: rascunho.departamentos,
        };

        const salvo = await onSalvar(projeto.id, dados);

        if (salvo) {
            setEditando(false);
        }
    }

    return (
        <div className="projeto-modal-overlay" role="presentation">
            <section
                className="projeto-modal projeto-details-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="projeto-details-title"
            >
                <header className="projeto-modal-header">
                    <div>
                        <p className="projeto-modal-eyebrow">Projeto #{projeto.id}</p>
                        <h2 id="projeto-details-title">{projeto.nome}</h2>
                        <p>
                            {projeto.cliente?.nome ?? `Cliente #${projeto.cliente_id}`}
                            {" · "}
                            {STATUS_PROJETO_LABELS[projeto.status]}
                        </p>
                    </div>

                    {!editando && (
                        <div className="projeto-modal-toolbar">
                            {editando ? (
                                <>
                                    <button
                                        type="button"
                                        className="projeto-btn-secondary"
                                        onClick={cancelarEdicao}
                                        disabled={salvando}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="projeto-btn-primary"
                                        onClick={() => void salvarEdicao()}
                                        disabled={
                                            salvando ||
                                            !rascunhoAtual.nome.trim() ||
                                            !rascunhoAtual.cliente_id ||
                                            rascunhoAtual.departamentos.length === 0
                                        }
                                    >
                                        {salvando ? "Salvando..." : "Salvar alterações"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="projeto-btn-secondary"
                                        onClick={fecharModal}
                                    >
                                        Fechar
                                    </button>
                                    {podeGerenciar && (
                                        <button
                                            type="button"
                                            className="projeto-btn-secondary"
                                            onClick={iniciarEdicao}
                                            disabled={salvando}
                                        >
                                            Editar
                                        </button>
                                    )}
                                    {podeGerenciar && (
                                        projeto.ativo
                                            ? <button
                                                type="button"
                                                className="projeto-btn-danger"
                                                onClick={() => onAlterarAtivo(projeto, "inativar")}
                                            >
                                                Inativar
                                            </button>
                                            : <button
                                                type="button"
                                                className="projeto-btn-primary"
                                                onClick={() => onAlterarAtivo(projeto, "reativar")}
                                            >
                                                Reativar
                                            </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </header>
                {!projeto.ativo && (
                    <div className="projetos-feedback projetos-feedback--warning">
                        Este projeto está inativo. O registro e o histórico foram preservados.
                    </div>
                )}

                {erro && (
                    <div className="projetos-feedback projetos-feedback--error" role="alert">
                        {erro}
                    </div>
                )}

                <section className="projeto-details-section">
                    <h3>Visão geral</h3>

                    {editando ? (
                        <div className="projeto-details-grid projeto-edit-grid">
                            <div className="projeto-details-full projeto-edit-field">
                                <label htmlFor="projeto-editar-nome">Nome do projeto</label>
                                <input
                                    id="projeto-editar-nome"
                                    type="text"
                                    value={rascunhoAtual.nome}
                                    onChange={(event) => atualizarCampo("nome", event.target.value)}
                                    disabled={salvando}
                                />
                            </div>

                            <div className="projeto-details-full projeto-edit-field">
                                <label htmlFor="projeto-editar-cliente">Cliente</label>
                                <select
                                    id="projeto-editar-cliente"
                                    value={rascunhoAtual.cliente_id}
                                    onChange={(event) => atualizarCampo("cliente_id", Number(event.target.value))}
                                    disabled={salvando}
                                >
                                    <option value={0} disabled hidden>Selecione um cliente</option>
                                    {clientes.map((cliente) => (
                                        <option key={cliente.id} value={cliente.id}>
                                            {cliente.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="projeto-edit-field">
                                <label htmlFor="projeto-editar-inicio">Data de início</label>
                                <input
                                    id="projeto-editar-inicio"
                                    type="date"
                                    value={rascunhoAtual.data_inicio}
                                    onChange={(event) => atualizarCampo("data_inicio", event.target.value)}
                                    disabled={salvando}
                                />
                            </div>

                            <div className="projeto-edit-field">
                                <label htmlFor="projeto-editar-fim">Data de término</label>
                                <input
                                    id="projeto-editar-fim"
                                    type="date"
                                    value={rascunhoAtual.data_fim}
                                    onChange={(event) => atualizarCampo("data_fim", event.target.value)}
                                    disabled={salvando}
                                />
                            </div>

                            <div className="projeto-details-full projeto-edit-field">
                                <label htmlFor="projeto-editar-status">Status</label>
                                <select
                                    id="projeto-editar-status"
                                    value={rascunhoAtual.status}
                                    onChange={(event) => atualizarCampo("status", event.target.value as StatusProjeto)}
                                    disabled={salvando}
                                >
                                    {Object.entries(STATUS_PROJETO_LABELS).map(([valor, label]) => (
                                        <option key={valor} value={valor}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="projeto-details-full projeto-edit-field">
                                <label>Departamentos</label>
                                <div className="projeto-edit-departamentos">
                                    {departamentos.map((departamento) => (
                                        <label
                                            key={departamento.id}
                                            className="projeto-edit-departamento"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={rascunhoAtual.departamentos.includes(departamento.id)}
                                                onChange={() => alternarDepartamento(departamento.id)}
                                                disabled={salvando}
                                            />
                                            <span>{departamento.nome}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (

                        <div className="projeto-details-grid">
                            <div>
                                <span>Cliente</span>
                                <strong>{projeto.cliente?.nome ?? `#${projeto.cliente_id}`}</strong>
                                <small>{projeto.cliente?.razao_social ?? ""}</small>
                            </div>
                            <div>
                                <span>Estado do registro</span>
                                <strong>{projeto.ativo ? "Ativo" : "Inativo"}</strong>
                            </div>
                            <div>
                                <span>Data de início</span>
                                <strong>{dataFormatada(projeto.data_inicio)}</strong>
                            </div>
                            <div>
                                <span>Data de término</span>
                                <strong>{dataFormatada(projeto.data_fim)}</strong>
                            </div>
                            <div className="projeto-details-full">
                                <span>Departamentos</span>
                                <strong>
                                    {projeto.departamentos_detalhes.length
                                        ? projeto.departamentos_detalhes.map((item) => item.nome).join(", ")
                                        : "Nenhum departamento vinculado"}
                                </strong>
                            </div>
                        </div>
                    )}
                </section>

                <section className="projeto-details-section">
                    <div className="projeto-section-header">
                        <h3>Conclusão</h3>
                        <strong>
                            {projeto.percentual_conclusao === null
                                ? "Sem ordens de serviço"
                                : `${projeto.percentual_conclusao}%`}
                        </strong>
                    </div>
                    {projeto.percentual_conclusao !== null && (
                        <div
                            className="projeto-progress-track projeto-progress-track--large"
                            role="progressbar"
                            aria-label="Percentual de conclusão"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={projeto.percentual_conclusao}
                        >
                            <span style={{
                                width: `${Math.min(100, Math.max(0, projeto.percentual_conclusao))}%`,
                            }} />
                        </div>
                    )}
                    <p className="projeto-muted">
                        {projeto.os_concluidas} de {projeto.total_os_elegiveis} O.S. ativas consideradas no cálculo.{" "}
                        {podeGerenciar
                            ? "O histórico abaixo inclui ordens ativas e inativas."
                            : "A lista abaixo inclui somente O.S. ativas."}
                    </p>
                </section>

                <section className="projeto-details-section">
                    <div className="projeto-section-header">
                        <h3>Ordens de serviço vinculadas</h3>
                        <span className="projeto-count-badge">{projeto.ordens_servico.length}</span>
                    </div>
                    {projeto.ordens_servico.length === 0 ? (
                        <p className="projeto-empty-inline">
                            Nenhuma ordem de serviço vinculada a este projeto.
                        </p>
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
                                    <span className="projeto-os-main">
                                        <strong>OS #{ordem.id} · {ordem.titulo}</strong>
                                        <span>Criada em {dataFormatada(ordem.data_criacao)}</span>
                                    </span>
                                    <span className={`projeto-os-status projeto-os-status--${ordem.status}`}>
                                        {STATUS_OS_LABELS[ordem.status] ?? ordem.status}
                                    </span>
                                    <span className={`projeto-os-ativo ${ordem.ativo ? "is-active" : "is-inactive"}`}>
                                        {ordem.ativo ? "Ativa" : "Inativa"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {editando && (
                    <div className="projeto-modal-actions projeto-modal-actions--editing">
                        <button
                            type="button"
                            className="projeto-btn-secondary"
                            onClick={cancelarEdicao}
                            disabled={salvando}
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            className="projeto-btn-primary"
                            onClick={salvarEdicao}
                            disabled={salvando}
                        >
                            {salvando ? "Salvando..." : "Salvar alterações"}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
