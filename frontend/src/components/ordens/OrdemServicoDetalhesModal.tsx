import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import Autocomplete, { type AutocompleteOption } from "../common/Autocomplete";
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
} from "../../utils/ordemServicoUtils";

type OrdemComSla = OrdemServico & { data_limite_sla?: string | null };

const LIMITE_ARQUIVO_MB = 50;
const LIMITE_ARQUIVO_BYTES = LIMITE_ARQUIVO_MB * 1024 * 1024;

export interface AnexoOrdemPayload {
    arquivos: File[];
    relato: string;
}

// Anexo já registrado, como devolvido pela API.
// TODO: alinhar os campos com o contrato real quando a rota existir.
export interface AnexoOrdem {
    id: number;
    nome: string;
    tamanho_bytes?: number | null;
    data_envio?: string | null;
    url?: string | null;
}

function normalizarExtensao(extensao: string): string {
    return extensao.trim().replace(/^\./, "").toLowerCase();
}

function formatarTamanho(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    podeAlterarStatus: boolean;
    podeAlterarPrazo?: boolean;
    alterandoStatusId: number | null;
    alterandoPrazo?: boolean;
    podeReatribuirResponsavel: boolean;
    onAtribuirResponsavel: (funcionarioId: number) => void;
    onFechar: () => void;
    onEditar: (ordem: OrdemServico) => void;
    onAlterarStatus: (status: StatusOrdemServico) => void;
    // Recebe a data (AAAA-MM-DD) e o motivo da alteração
    onAlterarPrazo?: (dataLimite: string, justificativa: string) => void;
    // Lista de anexos da O.S. vinda da API.
    anexos?: AnexoOrdem[];
    carregandoAnexos?: boolean;
    erroAnexos?: string | null;
    // Extensões aceitas (ex.: ["pdf", "png"]), vindas da configuração/API.
    // Vazio ou ausente: o front não restringe e o backend valida.
    tiposPermitidos?: string[];
    // TODO: integrar com o backend quando a rota de anexos existir.
    // O upload deve chamar onProgresso com o percentual (0 a 100).
    onEnviarAnexo?: (
        dados: AnexoOrdemPayload,
        onProgresso: (percentual: number) => void,
    ) => Promise<void> | void;
}

const STATUS_EDITAVEIS: StatusOrdemServico[] = [
    "em_andamento",
    "aguardando",
    "validacao_testes",
];

function formatarData(data: string | null | undefined): string {
    if (!data) return "Não definida";

    const dataConvertida = new Date(data);

    if (Number.isNaN(dataConvertida.getTime())) {
        return "Não definida";
    }

    return dataConvertida.toLocaleString("pt-BR");
}

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
    funcionarios,
    funcionariosElegiveis,
    atribuindoResponsavel,
    podeReatribuirResponsavel,
    onAtribuirResponsavel,
    onFechar,
    onEditar,
    onAlterarStatus,
    onAlterarPrazo,
    anexos = [],
    carregandoAnexos = false,
    erroAnexos = null,
    tiposPermitidos = [],
    onEnviarAnexo,
}: OrdemServicoDetalhesModalProps) {
    const [parecerTemporario, setParecerTemporario] = useState("");
    const [responsavelNovoId, setResponsavelNovoId] = useState<number | null>(null);
    const [statusSelecionado, setStatusSelecionado] =
        useState<StatusOrdemServico>("em_andamento");
    const [prazoSelecionado, setPrazoSelecionado] = useState("");
    const [justificativaAberta, setJustificativaAberta] = useState(false);
    const [justificativaPrazo, setJustificativaPrazo] = useState("");
    const [anexoAberto, setAnexoAberto] = useState(false);
    const [arquivosAnexo, setArquivosAnexo] = useState<File[]>([]);
    const [progressoAnexo, setProgressoAnexo] = useState(0);
    const [sucessoAnexo, setSucessoAnexo] = useState<string | null>(null);
    // O ref bloqueia cliques duplos antes de o estado re-renderizar.
    const envioEmAndamento = useRef(false);
    const [relatoAnexo, setRelatoAnexo] = useState("");
    const [erroAnexo, setErroAnexo] = useState<string | null>(null);
    const [enviandoAnexo, setEnviandoAnexo] = useState(false);

    const prazoAtual = paraInputData((ordem as OrdemComSla | null)?.data_limite_sla);

    // Descarta o rascunho ao fechar o modal ou trocar de OS.
    useEffect(() => {
        setParecerTemporario("");
        setJustificativaAberta(false);
        setJustificativaPrazo("");
        setAnexoAberto(false);
        setArquivosAnexo([]);
        setRelatoAnexo("");
        setErroAnexo(null);
        setSucessoAnexo(null);
        setProgressoAnexo(0);
        setEnviandoAnexo(false);
        envioEmAndamento.current = false;
    }, [aberto, ordem?.id]);

    // Sincroniza o seletor com o status atual da ordem.
    useEffect(() => {
        setStatusSelecionado(ordem?.status ?? "em_andamento");
    }, [aberto, ordem?.id, ordem?.status]);

    // Sincroniza o seletor de data com o prazo atual da ordem.
    useEffect(() => {
        setPrazoSelecionado(prazoAtual);
    }, [aberto, ordem?.id, ordem?.responsavel_id]);

    // Permite fechar o modal com a tecla Escape.
    useEffect(() => {
        if (!aberto) return;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                // Com o modal de anexo aberto, o Escape fecha só ele.
                if (anexoAberto) {
                    if (!enviandoAnexo) {
                        setAnexoAberto(false);
                        setArquivosAnexo([]);
                        setRelatoAnexo("");
                        setErroAnexo(null);
                        setSucessoAnexo(null);
                    }
                    return;
                }

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
    }, [aberto, onFechar, justificativaAberta, anexoAberto, enviandoAnexo]);

    if (!aberto) return null;

    const extensoesPermitidas = tiposPermitidos
        .map(normalizarExtensao)
        .filter(Boolean);

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

    function cancelarAnexo() {
        setAnexoAberto(false);
        setArquivosAnexo([]);
        setRelatoAnexo("");
        setErroAnexo(null);
        setSucessoAnexo(null);
        setProgressoAnexo(0);
    }

    function selecionarArquivos(event: ChangeEvent<HTMLInputElement>) {
        const selecionados = Array.from(event.target.files ?? []);
        const validos: File[] = [];
        const erros: string[] = [];

        for (const arquivo of selecionados) {
            const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "";

            if (
                extensoesPermitidas.length > 0 &&
                !extensoesPermitidas.includes(extensao)
            ) {
                erros.push(
                    `"${arquivo.name}": tipo não permitido (aceitos: ${extensoesPermitidas.join(", ")}).`,
                );
            } else if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
                erros.push(
                    `"${arquivo.name}" (${formatarTamanho(arquivo.size)}) excede o limite de ${LIMITE_ARQUIVO_MB} MB e não foi adicionado.`,
                );
            } else {
                validos.push(arquivo);
            }
        }

        setArquivosAnexo((atuais) => {
            const chaves = new Set(atuais.map((a) => `${a.name}-${a.size}`));
            return [
                ...atuais,
                ...validos.filter((a) => !chaves.has(`${a.name}-${a.size}`)),
            ];
        });
        setErroAnexo(erros.length ? erros.join(" ") : null);
        setSucessoAnexo(null);

        // Permite selecionar o mesmo arquivo novamente após removê-lo.
        event.target.value = "";
    }

    function removerArquivo(indice: number) {
        setArquivosAnexo((atuais) => atuais.filter((_, i) => i !== indice));
        setErroAnexo(null);
    }

    async function enviarAnexo() {
        // Bloqueia envio duplicado enquanto o upload estiver em andamento.
        if (envioEmAndamento.current) return;

        const relato = relatoAnexo.trim();

        if (arquivosAnexo.length === 0 && !relato) return;

        if (!onEnviarAnexo) {
            setErroAnexo("O envio de anexos ainda não está disponível.");
            return;
        }

        envioEmAndamento.current = true;
        setEnviandoAnexo(true);
        setErroAnexo(null);
        setSucessoAnexo(null);
        setProgressoAnexo(0);

        try {
            // TODO: integrar com o backend (upload multipart + relato) assim
            // que a rota de anexos da O.S. estiver disponível.
            await onEnviarAnexo(
                { arquivos: arquivosAnexo, relato },
                (percentual) =>
                    setProgressoAnexo(
                        Math.min(100, Math.max(0, Math.round(percentual))),
                    ),
            );
            setArquivosAnexo([]);
            setRelatoAnexo("");
            setSucessoAnexo("Anexo enviado com sucesso.");
        } catch (err) {
            setErroAnexo(
                err instanceof Error && err.message
                    ? err.message
                    : "Não foi possível enviar o anexo. Tente novamente.",
            );
        } finally {
            envioEmAndamento.current = false;
            setEnviandoAnexo(false);
            setProgressoAnexo(0);
        }
    }

    const podeEditarOrdem =
        podeEditar &&
        ordem !== null &&
        ordem.status !== "bloqueado" &&
        ordem.status !== "concluido";

    const cliente = ordem
        ? clientes.find((item) => item.id === ordem.cliente_id)
        : undefined;

    const departamento = ordem
        ? departamentos.find((item) => item.id === ordem.departamento_id)
        : undefined;
    const responsavelAtual = ordem?.responsavel_id
        ? funcionarios.find((item) => item.id === ordem.responsavel_id)
        : undefined;
    const responsavelOptions: AutocompleteOption[] = funcionariosElegiveis.map((funcionario) => ({
        value: funcionario.id,
        label: funcionario.nome || `Funcionário #${funcionario.id}`,
        description: `${funcionario.usuario} · ${funcionario.ativo ? "Ativo" : "Inativo"}`,
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
                            {ordem?.titulo ?? "Detalhes da ordem de serviço"}
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
                                            ? CRITICIDADE_LABELS[ordem.criticidade]
                                            : "Não definida"}
                                    </strong>
                                </div>

                                <div className="ordem-detalhe">
                                    <span>Data de criação</span>
                                    <strong>
                                        {formatarData(ordem.data_criacao)}
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

                                <div className="ordem-detalhe">
                                    <span>Prazo do SLA</span>
                                    <strong>
                                        {"data_limite_sla" in ordem
                                            ? formatarData(
                                                  (ordem as OrdemComSla)
                                                      .data_limite_sla,
                                              )
                                            : "Não informado"}
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
                                    {responsavelAtual && !responsavelAtual.ativo && <span className="ordem-responsavel-inativo"> · Inativo — vínculo histórico preservado</span>}
                                </p>
                                {podeReatribuirResponsavel && ordem.ativo && ordem.status !== "concluido" && (
                                    <div className="ordem-reatribuicao-controles">
                                        <div className="ordem-reatribuicao-campo">
                                            <label htmlFor="ordem-responsavel-novo">Atribuir ou reatribuir para funcionário ativo</label>
                                            <Autocomplete
                                                id="ordem-responsavel-novo"
                                                options={responsavelOptions}
                                                value={responsavelNovoId}
                                                onChange={(value) => setResponsavelNovoId(value === null ? null : Number(value))}
                                                placeholder="Pesquisar funcionário ativo"
                                                clearable
                                                disabled={atribuindoResponsavel}
                                                emptyMessage="Nenhum funcionário ativo encontrado."
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            className="ordens-btn-primary ordem-responsavel-atualizar"
                                            onClick={() => { if (responsavelNovoId !== null) onAtribuirResponsavel(responsavelNovoId); }}
                                            disabled={atribuindoResponsavel || responsavelNovoId === null || responsavelNovoId === ordem.responsavel_id}
                                            aria-busy={atribuindoResponsavel}
                                        >
                                            {atribuindoResponsavel ? "Salvando..." : ordem.responsavel_id === null ? "Atribuir responsável" : "Reatribuir responsável"}
                                        </button>
                                    </div>
                                )}
                            </section>

                            {podeAlterarStatus && (
                                <section className="ordem-detalhes-descricao ordem-status-edicao">
                                    <h3>Alterar status</h3>

                                    <div className="ordem-status-controls">
                                        <div className="ordem-status-field">
                                            <label htmlFor="ordem-status-select">Novo status</label>
                                            <select
                                                id="ordem-status-select"
                                                className="ordem-status-select"
                                                value={statusSelecionado}
                                                onChange={(event) =>
                                                    setStatusSelecionado(
                                                        event.target.value as StatusOrdemServico,
                                                    )
                                                }
                                                disabled={alterandoStatusId !== null}
                                            >
                                                {STATUS_EDITAVEIS.map((status) => (
                                                    <option key={status} value={status}>
                                                        {STATUS_LABELS[status]}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <button
                                            type="button"
                                            className="ordens-btn-primary ordem-status-atualizar"
                                            onClick={() => onAlterarStatus(statusSelecionado)}
                                            disabled={
                                                alterandoStatusId !== null ||
                                                statusSelecionado === ordem.status
                                            }
                                            aria-busy={alterandoStatusId === ordem.id}
                                        >
                                            {alterandoStatusId === ordem.id
                                                ? "Atualizando..."
                                                : "Atualizar status"}
                                        </button>
                                    </div>
                                </section>
                            )}

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

                            <section className="ordem-detalhes-descricao">
                                <h3>Parecer técnico registrado</h3>
                                <p>
                                    {ordem.parecer_tecnico ||
                                        "Nenhum parecer registrado."}
                                </p>
                            </section>

                            <section className="ordem-detalhes-descricao ordem-parecer-rascunho">
                                <h3>Parecer técnico — rascunho temporário</h3>

                                <label htmlFor="parecer-tecnico-temporario">
                                    Seu rascunho
                                </label>

                                <textarea
                                    id="parecer-tecnico-temporario"
                                    className="ordem-parecer-textarea"
                                    rows={6}
                                    value={parecerTemporario}
                                    onChange={(event) =>
                                        setParecerTemporario(event.target.value)
                                    }
                                    placeholder="Escreva aqui seu rascunho..."
                                />
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

                    {ordem && (
                        <button
                            type="button"
                            className="ordens-btn-secondary"
                            onClick={() => setAnexoAberto(true)}
                        >
                            Anexar arquivos
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

            {anexoAberto && (
                <div
                    className="ordem-modal-overlay ordem-modal-overlay--sobreposto"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !enviandoAnexo) {
                            cancelarAnexo();
                        }
                    }}
                >
                    <section
                        className="ordem-modal ordem-modal--anexo"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ordem-anexo-titulo"
                    >
                        <header className="ordem-modal-header">
                            <div>
                                <span className="ordem-card-id">ANEXOS E RELATO</span>
                                <h2 id="ordem-anexo-titulo">
                                    Anexar à OS #{ordem?.id}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="ordem-modal-close"
                                onClick={cancelarAnexo}
                                disabled={enviandoAnexo}
                                aria-label="Fechar anexos"
                            >
                                ×
                            </button>
                        </header>

                        <div className="ordem-modal-body ordem-parecer-rascunho">
                            <label htmlFor="ordem-anexo-relato">Relato</label>
                            <textarea
                                id="ordem-anexo-relato"
                                className="ordem-parecer-textarea"
                                rows={5}
                                maxLength={2000}
                                value={relatoAnexo}
                                onChange={(event) => setRelatoAnexo(event.target.value)}
                                placeholder="Descreva a implementação realizada ou o impedimento encontrado..."
                                disabled={enviandoAnexo}
                            />

                            <label htmlFor="ordem-anexo-arquivos">
                                Arquivos (máx. {LIMITE_ARQUIVO_MB} MB cada
                                {extensoesPermitidas.length > 0
                                    ? `; aceitos: ${extensoesPermitidas.join(", ")}`
                                    : ""}
                                )
                            </label>
                            <input
                                id="ordem-anexo-arquivos"
                                type="file"
                                multiple
                                accept={
                                    extensoesPermitidas.length > 0
                                        ? extensoesPermitidas.map((e) => `.${e}`).join(",")
                                        : undefined
                                }
                                onChange={selecionarArquivos}
                                disabled={enviandoAnexo}
                            />

                            {arquivosAnexo.length > 0 && (
                                <ul className="ordem-anexo-lista">
                                    {arquivosAnexo.map((arquivo, indice) => (
                                        <li key={`${arquivo.name}-${arquivo.size}`}>
                                            <span>
                                                {arquivo.name} · {formatarTamanho(arquivo.size)}
                                            </span>
                                            <button
                                                type="button"
                                                className="ordens-btn-secondary"
                                                onClick={() => removerArquivo(indice)}
                                                disabled={enviandoAnexo}
                                                aria-label={`Remover ${arquivo.name}`}
                                            >
                                                Remover
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {erroAnexo && (
                                <p className="ordens-feedback ordens-feedback--error" role="alert">
                                    {erroAnexo}
                                </p>
                            )}

                            {enviandoAnexo && (
                                <div className="ordem-anexo-progresso" role="status">
                                    <progress
                                        value={progressoAnexo}
                                        max={100}
                                        aria-label="Progresso do envio"
                                    />
                                    <span>Enviando... {progressoAnexo}%</span>
                                </div>
                            )}

                            {sucessoAnexo && (
                                <p className="ordens-feedback" role="status">
                                    {sucessoAnexo}
                                </p>
                            )}

                            <h3>Anexos desta OS</h3>

                            {carregandoAnexos ? (
                                <p className="ordens-feedback" role="status">
                                    Carregando anexos...
                                </p>
                            ) : erroAnexos ? (
                                <p className="ordens-feedback ordens-feedback--error" role="alert">
                                    {erroAnexos}
                                </p>
                            ) : anexos.length === 0 ? (
                                <p>Nenhum anexo enviado para esta O.S.</p>
                            ) : (
                                <ul className="ordem-anexo-lista">
                                    {anexos.map((anexo) => (
                                        <li key={anexo.id}>
                                            <span>
                                                {anexo.url ? (
                                                    <a
                                                        href={anexo.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {anexo.nome}
                                                    </a>
                                                ) : (
                                                    anexo.nome
                                                )}
                                                {anexo.tamanho_bytes
                                                    ? ` · ${formatarTamanho(anexo.tamanho_bytes)}`
                                                    : ""}
                                                {anexo.data_envio
                                                    ? ` · ${formatarData(anexo.data_envio)}`
                                                    : ""}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <footer className="ordem-modal-actions">
                            <button
                                type="button"
                                className="ordens-btn-secondary"
                                onClick={cancelarAnexo}
                                disabled={enviandoAnexo}
                            >
                                Fechar
                            </button>

                            <button
                                type="button"
                                className="ordens-btn-primary"
                                onClick={enviarAnexo}
                                disabled={
                                    enviandoAnexo ||
                                    (arquivosAnexo.length === 0 && !relatoAnexo.trim())
                                }
                                aria-busy={enviandoAnexo}
                            >
                                {enviandoAnexo ? "Enviando..." : "Enviar"}
                            </button>
                        </footer>
                    </section>
                </div>
            )}

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