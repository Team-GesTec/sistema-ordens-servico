import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Autocomplete, { type AutocompleteOption } from "../common/Autocomplete";
import OrdemServicoHistorico from "./OrdemServicoHistorico";
import type {
    Cliente,
    Departamento,
    OrdemServico,
    Funcionario,
    Projeto,
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
    projetos?: Projeto[];
    funcionarios: Funcionario[];
    funcionariosElegiveis: Funcionario[];
    atribuindoResponsavel: boolean;
    carregando: boolean;
    erro: string | null;
    podeEditar: boolean;
    podeAlterarStatus: boolean;
    podeAlterarPrazo?: boolean;
    alterandoStatusId: number | null;
    alterandoPrazo?: boolean;
    podeReatribuirResponsavel: boolean;
    onAtribuirResponsavel: (funcionarioId: number) => void;
    onFechar: () => void;
    onEditar: (ordem: OrdemServico) => void;
    podeDuplicar?: boolean;
    onDuplicar?: (ordem: OrdemServico) => void;
    podeSalvarParecerTecnico?: boolean;
    salvandoParecerTecnicoId?: number | null;
    onSalvarParecerTecnico?: (parecerTecnico: string) => void;
    onBaixarPDF?: (ordemId: number) => void;
    baixandoRelatorioId?: number | null;
    onAlterarStatus: (
        status: StatusOrdemServico,
        parecerTecnico?: string,
    ) => void;
    // Recebe a data (AAAA-MM-DD) e o motivo da alteração
    onAlterarPrazo?: (dataLimite: string, justificativa: string) => void;
    statusSugerido?: StatusOrdemServico | null;
}

const STATUS_EDITAVEIS: StatusOrdemServico[] = [
    "em_andamento",
    "aguardando",
    "validacao_testes",
    "concluido",
];

// Converte o valor do backend para o formato aceito pelo <input type="date">.
function paraInputData(data: string | null | undefined): string {
    if (!data) return "";

    return data.slice(0, 10);
}

function OrdemServicoDetalhesModal({
    aberto,
    ordem,
    carregando,
    erro,
    podeEditar,
    podeAlterarStatus,
    podeAlterarPrazo = false,
    alterandoStatusId,
    alterandoPrazo = false,
    clientes,
    departamentos,
    projetos = [],
    funcionarios,
    funcionariosElegiveis,
    atribuindoResponsavel,
    podeReatribuirResponsavel,
    onAtribuirResponsavel,
    onFechar,
    onEditar,
    podeDuplicar = false,
    onDuplicar,
    podeSalvarParecerTecnico = false,
    salvandoParecerTecnicoId = null,
    onSalvarParecerTecnico,
    onBaixarPDF,
    baixandoRelatorioId = null,
    onAlterarStatus,
    onAlterarPrazo,
    statusSugerido = null,
}: OrdemServicoDetalhesModalProps) {
    const [parecerTemporario, setParecerTemporario] = useState("");
    const [responsavelNovoId, setResponsavelNovoId] = useState<number | null>(
        null,
    );
    const [statusSelecionado, setStatusSelecionado] =
        useState<StatusOrdemServico>("em_andamento");
    const [prazoSelecionado, setPrazoSelecionado] = useState("");
    const [justificativaAberta, setJustificativaAberta] = useState(false);
    const [justificativaPrazo, setJustificativaPrazo] = useState("");

    const prazoAtual = paraInputData(ordem?.data_limite_sla);

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

    // Descarta o rascunho do motivo ao fechar o modal ou trocar de OS.
    useEffect(() => {
        setJustificativaAberta(false);
        setJustificativaPrazo("");
    }, [aberto, ordem?.id]);

    // Sincroniza o seletor de data com o prazo atual da ordem.
    useEffect(() => {
        setPrazoSelecionado(prazoAtual);
    }, [aberto, ordem?.id, prazoAtual]);

    // Permite fechar o modal com a tecla Escape.
    useEffect(() => {
        if (!aberto) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                // Com o modal de motivo aberto, o Escape fecha só ele.
                if (justificativaAberta) {
                    setJustificativaAberta(false);
                    setJustificativaPrazo("");
                    return;
                }

                onFechar();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [aberto, onFechar, justificativaAberta]);

    if (!aberto) return null;

    function cancelarJustificativa() {
        setJustificativaAberta(false);
        setJustificativaPrazo("");
    }

    function confirmarJustificativa() {
        const motivo = justificativaPrazo.trim();

        if (!motivo) return;

        onAlterarPrazo?.(prazoSelecionado, motivo);
        cancelarJustificativa();
    }

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
    const projeto = ordem?.projeto_id
        ? projetos.find((item) => item.id === ordem.projeto_id)
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
                                        {projeto
                                            ? projeto.nome
                                            : ordem.projeto_id
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

                            {podeAlterarPrazo && (
                                <section className="ordem-detalhes-descricao ordem-status-edicao">
                                    <h3>Alterar prazo final</h3>

                                    <input
                                        id="ordem-prazo-input"
                                        type="date"
                                        className="ordem-status-select"
                                        aria-label="Selecionar novo prazo final"
                                        value={prazoSelecionado}
                                        onChange={(event) =>
                                            setPrazoSelecionado(event.target.value)
                                        }
                                        disabled={alterandoPrazo}
                                    />

                                    <button
                                        type="button"
                                        className="ordens-btn-primary ordem-status-atualizar"
                                        onClick={() => setJustificativaAberta(true)}
                                        disabled={
                                            alterandoPrazo ||
                                            !prazoSelecionado ||
                                            prazoSelecionado === prazoAtual
                                        }
                                    >
                                        {alterandoPrazo
                                            ? "Atualizando..."
                                            : "Confirmar alteração"}
                                    </button>
                                </section>
                            )}

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
                                    {statusSelecionado === "concluido"
                                        ? "Parecer técnico obrigatório para conclusão"
                                          : ordem.parecer_tecnico
                                            ? "Texto de parecer para eventual conclusão"
                                            : "Parecer técnico — rascunho temporário"}
                                </h3>

                                <label htmlFor="parecer-tecnico-temporario">
                                    {statusSelecionado === "concluido"
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
                                        statusSelecionado === "concluido"
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
                                    disabled={alterandoStatusId !== null}
                                />

                                {podeSalvarParecerTecnico && onSalvarParecerTecnico && (
                                    <div className="ordem-parecer-acoes">
                                        <span className="ordem-form-note">
                                            Salvar o parecer não altera o status, prazo nem responsável da O.S.
                                        </span>
                                        <button
                                            type="button"
                                            className="ordens-btn-primary"
                                            onClick={() => onSalvarParecerTecnico(parecerTemporario)}
                                            disabled={
                                                salvandoParecerTecnicoId !== null ||
                                                alterandoStatusId !== null ||
                                                parecerTemporario.length > 1000
                                            }
                                            aria-busy={salvandoParecerTecnicoId === ordem.id}
                                        >
                                            {salvandoParecerTecnicoId === ordem.id
                                                ? "Salvando parecer..."
                                                : "Salvar parecer técnico"}
                                        </button>
                                    </div>
                                )}
                                <p className="ordem-form-note" aria-live="polite">
                                    {parecerTemporario.length}/1.000 caracteres.
                                </p>

                                {statusSelecionado === "concluido" ? (
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

                    {ordem && podeDuplicar && onDuplicar && (
                        <button
                            type="button"
                            className="ordens-btn-secondary"
                            onClick={() => onDuplicar(ordem)}
                        >
                            Duplicar como nova O.S.
                        </button>
                    )}

                    {ordem && onBaixarPDF && (
                        <button
                            type="button"
                            className="ordens-btn-secondary"
                            onClick={() => onBaixarPDF(ordem.id)}
                            disabled={baixandoRelatorioId !== null}
                            aria-busy={baixandoRelatorioId === ordem.id}
                        >
                            {baixandoRelatorioId === ordem.id
                                ? "Gerando PDF..."
                                : "Baixar PDF"}
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

            {justificativaAberta && (
                <div
                    className="ordem-modal-overlay ordem-modal-overlay--sobreposto"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            cancelarJustificativa();
                        }
                    }}
                >
                    <section
                        className="ordem-modal ordem-modal--justificativa"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ordem-justificativa-titulo"
                    >
                        <header className="ordem-modal-header">
                            <div>
                                <span className="ordem-card-id">
                                    MOTIVO DA ALTERAÇÃO
                                </span>

                                <h2 id="ordem-justificativa-titulo">
                                    Alterar prazo da OS #{ordem?.id}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="ordem-modal-close"
                                onClick={cancelarJustificativa}
                                aria-label="Fechar motivo da alteração"
                            >
                                ×
                            </button>
                        </header>

                        <div className="ordem-modal-body ordem-parecer-rascunho">
                            <label htmlFor="ordem-justificativa-prazo">
                                Explique o motivo da alteração
                            </label>

                            <textarea
                                id="ordem-justificativa-prazo"
                                className="ordem-parecer-textarea"
                                rows={5}
                                maxLength={1000}
                                autoFocus
                                value={justificativaPrazo}
                                onChange={(event) =>
                                    setJustificativaPrazo(event.target.value)
                                }
                                placeholder="Descreva o motivo da alteração do prazo..."
                            />
                        </div>

                        <footer className="ordem-modal-actions">
                            <button
                                type="button"
                                className="ordens-btn-secondary"
                                onClick={cancelarJustificativa}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="ordens-btn-primary"
                                disabled={!justificativaPrazo.trim()}
                                onClick={confirmarJustificativa}
                            >
                                Confirmar alteração
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
}

export default OrdemServicoDetalhesModal;