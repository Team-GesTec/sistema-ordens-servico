import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Autocomplete, { type AutocompleteOption } from "../common/Autocomplete";
import OrdemServicoHistorico from "./OrdemServicoHistorico";
import type {
    Cliente,
    Departamento,
    OrdemServico,
    Funcionario,
    StatusOrdemServico,
} from "../../types/api";
import {
    CRITICIDADE_LABELS,
    STATUS_LABELS,
    TIPO_LABELS,
    formatarDataOrdem,
    ordemEstaAtrasada,
} from "../../utils/ordemServicoUtils";

interface OrdemServicoDetalhesModalProps {
    aberto: boolean;
    ordem: OrdemServico | null;
    clientes: Cliente[];
    departamentos: Departamento[];
    funcionarios: Funcionario[];
    funcionariosElegiveis: Funcionario[];
    atribuindoResponsavel: boolean;
    carregando: boolean;
    erro: string | null;
    podeEditar: boolean;
    podeDuplicar: boolean;
    podeAlterarStatus: boolean;
    alterandoStatusId: number | null;
    podeReatribuirResponsavel: boolean;
    onAtribuirResponsavel: (funcionarioId: number) => void;
    onFechar: () => void;
    onEditar: (ordem: OrdemServico) => void;
    onDuplicar: (ordem: OrdemServico) => void;
    onAlterarStatus: (
        status: StatusOrdemServico,
        parecerTecnico?: string,
    ) => void;
    podeSalvarParecerTecnico: boolean;
    salvandoParecerTecnicoId: number | null;
    onSalvarParecerTecnico: (parecerTecnico: string) => void;
    onBaixarPDF: (ordemId: number) => void;
    baixandoRelatorioId: number | null;
    statusSugerido?: StatusOrdemServico | null;
}

const STATUS_EDITAVEIS: StatusOrdemServico[] = [
    "em_andamento",
    "aguardando",
    "validacao_testes",
    "concluido",
];

function OrdemServicoDetalhesModal({
    aberto,
    ordem,
    carregando,
    erro,
    podeEditar,
    podeDuplicar,
    podeAlterarStatus,
    alterandoStatusId,
    clientes,
    departamentos,
    funcionarios,
    funcionariosElegiveis,
    atribuindoResponsavel,
    podeReatribuirResponsavel,
    onAtribuirResponsavel,
    onFechar,
    onEditar,
    onDuplicar,
    onAlterarStatus,
    podeSalvarParecerTecnico,
    salvandoParecerTecnicoId,
    onSalvarParecerTecnico,
    statusSugerido = null,
}: OrdemServicoDetalhesModalProps) {
    const [parecerTemporario, setParecerTemporario] = useState("");
    const [responsavelNovoId, setResponsavelNovoId] = useState<number | null>(
        null,
    );
    const [statusSelecionado, setStatusSelecionado] =
        useState<StatusOrdemServico>("em_andamento");

    useEffect(() => {
        setParecerTemporario(ordem?.parecer_tecnico ?? "");
    }, [aberto, ordem?.id, ordem?.parecer_tecnico]);

    useEffect(() => {
        const sugestaoValida =
            statusSugerido && STATUS_EDITAVEIS.includes(statusSugerido)
                ? statusSugerido
                : null;

        setStatusSelecionado(
            sugestaoValida ?? ordem?.status ?? "em_andamento",
        );
    }, [aberto, ordem?.id, ordem?.status, statusSugerido]);

    useEffect(() => {
        setResponsavelNovoId(null);
    }, [aberto, ordem?.id, ordem?.responsavel_id]);

    useEffect(() => {
        if (!aberto) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onFechar();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [aberto, onFechar]);

    if (!aberto) return null;

    const podeEditarOrdem =
        podeEditar &&
        ordem !== null &&
        ordem.ativo &&
        ordem.status !== "bloqueado" &&
        ordem.status !== "concluido";

    const cliente = ordem
        ? clientes.find((item) => item.id === ordem.cliente_id)
        : undefined;

    const departamento = ordem
        ? departamentos.find((item) => item.id === ordem.departamento_id)
        : undefined;

    const responsavelAtual = ordem?.responsavel_id
        ? funcionarios.find(
              (item) => item.id === ordem.responsavel_id,
          )
        : undefined;

    const responsavelOptions: AutocompleteOption[] =
        funcionariosElegiveis.map((funcionario) => ({
            value: funcionario.id,
            label: funcionario.nome || `Funcionário #${funcionario.id}`,
            description: `${funcionario.usuario} · ${
                funcionario.ativo ? "Ativo" : "Inativo"
            }`,
        }));

    return (
        <div
            className="ordem-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onFechar();
                }
            }}
        >
            <section
                className="ordem-modal ordem-modal--detalhes"
                role="dialog"
                aria-modal="true"
                aria-labelledby="ordem-detalhes-titulo"
            >
                <header className="ordem-modal-header">
                    <div>
                        <span className="ordem-card-id">
                            {ordem ? `OS #${ordem.id}` : "Ordem de serviço"}
                        </span>

                        <h2 id="ordem-detalhes-titulo">
                            {ordem?.titulo ??
                                "Detalhes da ordem de serviço"}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="ordem-modal-close"
                        onClick={onFechar}
                        aria-label="Fechar detalhes"
                    >
                        ×
                    </button>
                </header>

                <div className="ordem-modal-body">
                    {carregando && (
                        <p className="ordens-feedback" role="status">
                            Carregando detalhes...
                        </p>
                    )}

                    {erro && (
                        <p
                            className="ordens-feedback ordens-feedback--error"
                            role="alert"
                        >
                            {erro}
                        </p>
                    )}

                    {!ordem && !carregando && !erro && (
                        <p>Não há detalhes disponíveis para esta ordem.</p>
                    )}

                    {ordem && (
                        <>
                            <div className="ordem-detalhes-resumo">
                                <div className="ordem-detalhe">
                                    <span>Cliente</span>
                                    <strong>
                                        {cliente ? (
                                            <Link
                                                to={`/clientes?visualizar=${cliente.id}`}
                                                className="ordem-relacionamento-link"
                                            >
                                                {cliente.nome}
                                            </Link>
                                        ) : ordem.cliente_id ? (
                                            `Cliente #${ordem.cliente_id}`
                                        ) : (
                                            "Não associado"
                                        )}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Departamento</span>
                                    <strong>
                                        {departamento ? (
                                            <Link
                                                to={`/departamentos?visualizar=${departamento.id}`}
                                                className="ordem-relacionamento-link"
                                            >
                                                {departamento.nome}
                                            </Link>
                                        ) : (
                                            `Departamento #${ordem.departamento_id}`
                                        )}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Tipo</span>
                                    <strong>{TIPO_LABELS[ordem.tipo]}</strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Status</span>
                                    <strong
                                        className={`ordem-status-badge ordem-status-badge--${ordem.status}`}
                                    >
                                        {STATUS_LABELS[ordem.status]}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Criticidade</span>
                                    <strong>
                                        {ordem.criticidade
                                            ? CRITICIDADE_LABELS[
                                                  ordem.criticidade
                                              ]
                                            : "Não definida"}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Data de abertura</span>
                                    <strong>
                                        {formatarDataOrdem(
                                            ordem.data_criacao,
                                            true,
                                        )}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Projeto</span>
                                    <strong>
                                        {ordem.projeto_id
                                            ? `Projeto #${ordem.projeto_id}`
                                            : "Sem projeto associado"}
                                    </strong>
                                </div>

                                <div
                                    className={`ordem-detalhe${
                                        ordemEstaAtrasada(ordem)
                                            ? " ordem-detalhe--atrasado"
                                            : ""
                                    }`}
                                >
                                    <span>Prazo do SLA</span>
                                    <strong>
                                        {formatarDataOrdem(
                                            ordem.data_limite_sla,
                                            true,
                                        )}
                                        {ordemEstaAtrasada(ordem) && (
                                            <span
                                                className="ordem-prazo-vencido"
                                                role="status"
                                            >
                                                Prazo vencido
                                            </span>
                                        )}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Data de conclusão</span>
                                    <strong>
                                        {formatarDataOrdem(
                                            ordem.data_fim,
                                            true,
                                        )}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Última alteração registrada</span>
                                    <strong>
                                        {formatarDataOrdem(
                                            ordem.data_ultima_atualizacao,
                                            true,
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <section className="ordem-detalhes-descricao ordem-responsavel-edicao">
                                <h3>Responsável</h3>

                                <p className="ordem-responsavel-atual">
                                    {responsavelAtual
                                        ? `${responsavelAtual.nome} (${responsavelAtual.usuario})`
                                        : ordem.responsavel_id !== null
                                          ? `Funcionário #${ordem.responsavel_id}`
                                          : "Sem responsável atribuído"}

                                    {responsavelAtual &&
                                        !responsavelAtual.ativo && (
                                            <span className="ordem-responsavel-inativo">
                                                {" "}
                                                · Inativo — vínculo histórico
                                                preservado
                                            </span>
                                        )}
                                </p>

                                {podeReatribuirResponsavel &&
                                    ordem.ativo &&
                                    ordem.status !== "concluido" && (
                                        <div className="ordem-reatribuicao-controles">
                                            <div className="ordem-reatribuicao-campo">
                                                <label htmlFor="ordem-responsavel-novo">
                                                    {podeEditar
                                                        ? "Atribuir ou reatribuir para funcionário ativo"
                                                        : "Assumir O.S. não atribuída do seu departamento"}
                                                </label>

                                                <Autocomplete
                                                    id="ordem-responsavel-novo"
                                                    options={responsavelOptions}
                                                    value={responsavelNovoId}
                                                    onChange={(value) =>
                                                        setResponsavelNovoId(
                                                            value === null
                                                                ? null
                                                                : Number(value),
                                                        )
                                                    }
                                                    placeholder={
                                                        podeEditar
                                                            ? "Pesquisar funcionário ativo"
                                                            : "Selecionar seu usuário"
                                                    }
                                                    clearable
                                                    disabled={
                                                        atribuindoResponsavel
                                                    }
                                                    emptyMessage="Nenhum funcionário ativo encontrado."
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                className="ordens-btn-primary ordem-responsavel-atualizar"
                                                onClick={() => {
                                                    if (
                                                        responsavelNovoId !==
                                                        null
                                                    ) {
                                                        onAtribuirResponsavel(
                                                            responsavelNovoId,
                                                        );
                                                    }
                                                }}
                                                disabled={
                                                    atribuindoResponsavel ||
                                                    responsavelNovoId ===
                                                        null ||
                                                    responsavelNovoId ===
                                                        ordem.responsavel_id
                                                }
                                                aria-busy={
                                                    atribuindoResponsavel
                                                }
                                            >
                                                {atribuindoResponsavel
                                                    ? "Salvando..."
                                                    : !podeEditar
                                                      ? "Assumir O.S."
                                                      : ordem.responsavel_id ===
                                                          null
                                                        ? "Atribuir responsável"
                                                        : "Reatribuir responsável"}
                                            </button>
                                        </div>
                                    )}
                            </section>

                            {ordem.ativo &&
                                ordem.status !== "bloqueado" &&
                                ordem.status !== "concluido" &&
                                (podeAlterarStatus ? (
                                    <section className="ordem-detalhes-descricao ordem-status-edicao">
                                        <h3>Alterar status</h3>

                                        <div className="ordem-status-controls">
                                            <div className="ordem-status-field">
                                                <label htmlFor="ordem-status-select">
                                                    Novo status
                                                </label>

                                                <select
                                                    id="ordem-status-select"
                                                    className="ordem-status-select"
                                                    value={statusSelecionado}
                                                    onChange={(event) =>
                                                        setStatusSelecionado(
                                                            event.target
                                                                .value as StatusOrdemServico,
                                                        )
                                                    }
                                                    disabled={
                                                        alterandoStatusId !==
                                                            null ||
                                                        salvandoParecerTecnicoId !==
                                                            null
                                                    }
                                                >
                                                    {STATUS_EDITAVEIS.map(
                                                        (status) => (
                                                            <option
                                                                key={status}
                                                                value={status}
                                                            >
                                                                {
                                                                    STATUS_LABELS[
                                                                        status
                                                                    ]
                                                                }
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                className="ordens-btn-primary ordem-status-atualizar"
                                                onClick={() =>
                                                    onAlterarStatus(
                                                        statusSelecionado,
                                                        statusSelecionado ===
                                                            "concluido"
                                                            ? parecerTemporario.trim()
                                                            : undefined,
                                                    )
                                                }
                                                disabled={
                                                    alterandoStatusId !==
                                                        null ||
                                                    statusSelecionado ===
                                                        ordem.status ||
                                                    (statusSelecionado ===
                                                        "concluido" &&
                                                        !parecerTemporario.trim())
                                                }
                                                aria-busy={
                                                    alterandoStatusId ===
                                                    ordem.id
                                                }
                                            >
                                                {alterandoStatusId ===
                                                ordem.id
                                                    ? "Atualizando..."
                                                    : "Atualizar status"}
                                            </button>
                                        </div>
                                    </section>
                                ) : (
                                    <section
                                        className="ordem-detalhes-descricao ordem-status-edicao"
                                        role="note"
                                    >
                                        <h3>Alteração de status</h3>
                                        <p>
                                            Apenas o Gestor ou o responsável
                                            pela O.S. pode alterar seu status.
                                        </p>
                                    </section>
                                ))}

                            <section className="ordem-detalhes-descricao">
                                <h3>Descrição da solicitação</h3>
                                <p>
                                    {ordem.descricao || "Sem descrição."}
                                </p>
                            </section>

                            {/* Histórico de pareceres técnicos registrados */}
                            <section className="ordem-detalhes-descricao ordem-parecer-historico">
                                <h3>Histórico de pareceres técnicos</h3>

                                {ordem.parecer_tecnico?.trim() ? (
                                    <article className="ordem-parecer-item">
                                        <p className="ordem-parecer-item-texto">
                                            {ordem.parecer_tecnico}
                                        </p>
                                        <span className="ordem-form-note">
                                            Parecer técnico atualmente
                                            registrado nesta O.S.
                                        </span>
                                    </article>
                                ) : (
                                    <p>
                                        Nenhum parecer técnico registrado para
                                        esta ordem de serviço.
                                    </p>
                                )}
                            </section>

                            <OrdemServicoHistorico osId={ordem.id} />

                            <section className="ordem-detalhes-descricao ordem-parecer-rascunho">
                                <h3>
                                    {podeSalvarParecerTecnico
                                        ? "Parecer técnico"
                                        : statusSelecionado === "concluido"
                                          ? "Parecer técnico obrigatório para conclusão"
                                          : ordem.parecer_tecnico
                                            ? "Texto de parecer para eventual conclusão"
                                            : "Parecer técnico — rascunho temporário"}
                                </h3>

                                <label htmlFor="parecer-tecnico-temporario">
                                    {podeSalvarParecerTecnico
                                        ? "Editar parecer salvo (até 1.000 caracteres)"
                                        : statusSelecionado === "concluido"
                                          ? "Parecer que será registrado"
                                          : ordem.parecer_tecnico
                                            ? "Texto local (não altera o parecer registrado)"
                                            : "Seu rascunho"}
                                </label>

                                <textarea
                                    id="parecer-tecnico-temporario"
                                    className="ordem-parecer-textarea"
                                    rows={6}
                                    value={parecerTemporario}
                                    onChange={(event) =>
                                        setParecerTemporario(
                                            event.target.value,
                                        )
                                    }
                                    placeholder={
                                        podeSalvarParecerTecnico
                                            ? "Registre ou atualize o parecer técnico..."
                                            : statusSelecionado === "concluido"
                                              ? "Informe o parecer técnico para concluir a O.S."
                                              : "Escreva aqui seu rascunho..."
                                    }
                                    maxLength={1000}
                                    aria-required={
                                        statusSelecionado === "concluido"
                                    }
                                    aria-invalid={
                                        statusSelecionado === "concluido" &&
                                        !parecerTemporario.trim()
                                    }
                                    disabled={
                                        alterandoStatusId !== null ||
                                        salvandoParecerTecnicoId !== null
                                    }
                                />

                                {podeSalvarParecerTecnico ? (
                                    <>
                                        <div className="ordem-parecer-acoes">
                                            <span className="ordem-form-note">
                                                Salvar o parecer não altera o
                                                status, prazo, responsável nem
                                                outros campos da O.S.
                                            </span>

                                            <button
                                                type="button"
                                                className="ordens-btn-primary"
                                                onClick={() =>
                                                    onSalvarParecerTecnico(
                                                        parecerTemporario,
                                                    )
                                                }
                                                disabled={
                                                    salvandoParecerTecnicoId !==
                                                        null ||
                                                    alterandoStatusId !== null ||
                                                    parecerTemporario.length >
                                                        1000
                                                }
                                                aria-busy={
                                                    salvandoParecerTecnicoId ===
                                                    ordem.id
                                                }
                                            >
                                                {salvandoParecerTecnicoId ===
                                                ordem.id
                                                    ? "Salvando parecer..."
                                                    : "Salvar parecer técnico"}
                                            </button>
                                        </div>

                                        <p
                                            className="ordem-form-note"
                                            aria-live="polite"
                                        >
                                            {parecerTemporario.length}/1.000
                                            caracteres. Deixar o campo vazio
                                            limpa o parecer salvo.
                                        </p>
                                    </>
                                ) : statusSelecionado === "concluido" ? (
                                    <>
                                        <p
                                            className="ordem-form-note"
                                            role="status"
                                        >
                                            O parecer será enviado à API e
                                            persistido na mesma transação da
                                            conclusão. Se a operação falhar,
                                            ele não será registrado.
                                        </p>

                                        {!parecerTemporario.trim() && (
                                            <p
                                                className="ordens-feedback ordens-feedback--aviso"
                                                role="status"
                                            >
                                                Preencha o parecer técnico para
                                                habilitar a conclusão.
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="ordem-form-note">
                                        Texto digitado aqui permanece local. Ele
                                        só é registrado se você selecionar
                                        Concluído e confirmar a transição; o
                                        parecer registrado acima não muda antes
                                        disso.
                                    </p>
                                )}
                            </section>
                        </>
                    )}
                </div>

                <footer className="ordem-modal-actions">
                    <button
                        type="button"
                        className="ordens-btn-secondary"
                        onClick={onFechar}
                    >
                        Fechar
                    </button>

                    {podeDuplicar && ordem && (
                        <button
                            type="button"
                            className="ordens-btn-secondary"
                            onClick={() => onDuplicar(ordem)}
                        >
                            Duplicar como nova O.S.
                        </button>
                    )}

                    {podeEditarOrdem && ordem && (
                        <button
                            type="button"
                            className="ordens-btn-primary"
                            onClick={() => onEditar(ordem)}
                        >
                            Editar ordem
                        </button>
                    )}
                </footer>
            </section>
        </div>
    );
}

export default OrdemServicoDetalhesModal;