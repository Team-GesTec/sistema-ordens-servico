import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import Autocomplete, { type AutocompleteOption } from "../common/Autocomplete";
import OrdemServicoHistorico from "./OrdemServicoHistorico";
import type {
    Cliente,
    Departamento,
    OrdemServico,
    Funcionario,
    StatusOrdemServico,
    OrdemServicoInput,
    Projeto,
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

// Anexo já registrado (US#2.6), montado a partir da resposta da API em useAnexosOrdem.
export interface AnexoOrdem {
    id: number;
    nome: string;
    tamanho_bytes?: number | null;
    data_envio?: string | null;
    url?: string | null;
    // Nome de quem enviou o anexo.
    autor?: string | null;
    // Relato enviado junto com o arquivo.
    relato?: string | null;
}

// Erro de envio em que parte dos arquivos já foi gravada (ver useAnexosOrdem).
function arquivosJaEnviados(erro: unknown): File[] {
    if (typeof erro === "object" && erro !== null && "enviados" in erro && Array.isArray(erro.enviados)) {
        return erro.enviados as File[];
    }
    return [];
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
    /** Renderiza os mesmos controles em uma página dedicada, em vez de uma janela modal. */
    modoPagina?: boolean;
    ordem: OrdemServico | null;
    projetos?: Projeto[];
    clientes: Cliente[];
    departamentos: Departamento[];
    funcionarios: Funcionario[];
    funcionariosElegiveis: Funcionario[];
    atribuindoResponsavel: boolean;
    carregando: boolean;
    erro: string | null;
    podeEditar: boolean;
    podeAlterarStatus: boolean;
    podeConcluir: boolean;
    podeAlterarPrazo?: boolean;
    alterandoStatusId: number | null;
    alterandoPrazo?: boolean;
    podeReatribuirResponsavel: boolean;
    onAtribuirResponsavel: (funcionarioId: number) => void;
    onFechar: () => void;
    onEditar: (ordem: OrdemServico) => void;
    onAlterarStatus: (status: StatusOrdemServico, parecerTecnico?: string) => void;
    // Recebe a data (AAAA-MM-DD) e o motivo da alteração
    onAlterarPrazo?: (dataLimite: string, justificativa: string) => void;
    statusSugerido?: StatusOrdemServico | null;
    // Lista de anexos da O.S. vinda da API.
    anexos?: AnexoOrdem[];
    carregandoAnexos?: boolean;
    erroAnexos?: string | null;
    // Extensões aceitas (ex.: ["pdf", "png"]), vindas de GET /anexos/configuracao.
    // Vazio ou ausente: o front não restringe e o backend valida.
    tiposPermitidos?: string[];
    // Upload multipart (POST /ordens-servico/:id/anexos); chama onProgresso com o percentual (0 a 100).
    onEnviarAnexo?: (
        dados: AnexoOrdemPayload,
        onProgresso: (percentual: number) => void,
    ) => Promise<void> | void;
    // Download pela API com o token (o bucket de anexos é privado).
    onBaixarAnexo?: (anexo: AnexoOrdem) => Promise<void> | void;
    salvandoEdicaoDireta?: boolean;
    onSalvarEdicaoDireta?: (
        id: number,
        dados: Partial<OrdemServicoInput> & { justificativa: string },
    ) => Promise<boolean>;
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
    modoPagina = false,
    ordem,
    projetos = [],
    carregando,
    erro,
    podeEditar,
    podeAlterarStatus,
    salvandoEdicaoDireta = false,
    onSalvarEdicaoDireta,
    podeConcluir,
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
    statusSugerido = null,
    anexos = [],
    carregandoAnexos = false,
    erroAnexos = null,
    tiposPermitidos = [],
    onEnviarAnexo,
    onBaixarAnexo,
}: OrdemServicoDetalhesModalProps) {
    const [parecerTemporario, setParecerTemporario] = useState("");
    const [edicaoDiretaAberta, setEdicaoDiretaAberta] = useState(false);
    const [justificativaEdicao, setJustificativaEdicao] = useState("");
    const [dadosEdicao, setDadosEdicao] = useState<Partial<OrdemServicoInput>>({});
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
    const [abaAcompanhamento, setAbaAcompanhamento] = useState<"historico" | "horas" | "anexos">("historico");
    const [acoesMenuAberto, setAcoesMenuAberto] = useState(false);
    const [statusPainelAberto, setStatusPainelAberto] = useState(false);
    const [prazoPainelAberto, setPrazoPainelAberto] = useState(false);
    const [responsavelPainelAberto, setResponsavelPainelAberto] = useState(false);
    const [comentarioNovo, setComentarioNovo] = useState("");
    const comentarioRef = useRef<HTMLTextAreaElement | null>(null);
    const [comentariosDemo, setComentariosDemo] = useState([
        { id: 1, iniciais: "MC", autor: "Mariana Costa", quando: "Hoje, 08:52", texto: "O cliente confirmou a janela para execução entre 9h e 16h. Avisem por aqui quando o teste de conectividade começar.", tom: "azul" },
        { id: 2, iniciais: "AL", autor: "André Lima", quando: "Hoje, 09:04", texto: "Instalação física iniciada. Todos os equipamentos foram conferidos, sem divergências no recebimento.", tom: "verde" },
    ]);
    const [horasDemo, setHorasDemo] = useState([
        { id: 1, horas: 3.5, descricao: "Diagnóstico e instalação em campo", quando: "Hoje, 09:42", autor: "André Lima" },
        { id: 2, horas: 1, descricao: "Preparação do local e equipamentos", quando: "Hoje, 10:15", autor: "André Lima" },
        { id: 3, horas: 1, descricao: "Testes de conectividade", quando: "Hoje, 11:15", autor: "André Lima" },
    ]);
    const [lancarHorasAberto, setLancarHorasAberto] = useState(false);
    const [horasDigitadas, setHorasDigitadas] = useState("1");
    const [descricaoHoras, setDescricaoHoras] = useState("");

    const prazoAtual = paraInputData((ordem as OrdemComSla | null)?.data_limite_sla);
    const statusEditaveis = useMemo<StatusOrdemServico[]>(
        () => podeConcluir ? [...STATUS_EDITAVEIS, "concluido"] : STATUS_EDITAVEIS,
        [podeConcluir],
    );

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
        setAbaAcompanhamento("historico");
        setAcoesMenuAberto(false);
        setStatusPainelAberto(false);
        setPrazoPainelAberto(false);
        setResponsavelPainelAberto(false);
        setComentarioNovo("");
        setLancarHorasAberto(false);
        envioEmAndamento.current = false;
    }, [aberto, ordem?.id]);

    // Inicializa o editor com os dados atuais da ordem.
    useEffect(() => {
        setEdicaoDiretaAberta(false);
        setJustificativaEdicao("");

        if (!ordem) {
            setDadosEdicao({});
            return;
        }

        setDadosEdicao({
            titulo: ordem.titulo,
            tipo: ordem.tipo,
            descricao: ordem.descricao,
            cliente_id: ordem.cliente_id ?? undefined,
            departamento_id: ordem.departamento_id,
            projeto_id: ordem.projeto_id,
            criticidade: ordem.criticidade,
        });
    }, [aberto, ordem?.id]);

    // Sincroniza o seletor com o status atual da ordem.
    useEffect(() => {
        const statusInicial =
            statusSugerido &&
                (STATUS_EDITAVEIS.includes(statusSugerido) ||
                    (statusSugerido === "concluido" && podeConcluir))
                ? statusSugerido
                : ordem?.status ?? "em_andamento";
        setStatusSelecionado(statusInicial);
    }, [aberto, ordem?.id, ordem?.status, statusSugerido, podeConcluir]);

    // Sincroniza o seletor de data com o prazo atual da ordem.
    useEffect(() => {
        setPrazoSelecionado(prazoAtual);
    }, [prazoAtual]);

    useEffect(() => {
        // Trocar a OS exige uma nova selecao explicita para evitar reenvio acidental.
        setResponsavelNovoId(null);
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

    async function baixarAnexo(anexo: AnexoOrdem) {
        if (!onBaixarAnexo) return;

        setErroAnexo(null);
        try {
            await onBaixarAnexo(anexo);
        } catch (err) {
            setErroAnexo(
                err instanceof Error && err.message
                    ? err.message
                    : "Não foi possível baixar o anexo. Tente novamente.",
            );
        }
    }

    function removerArquivo(indice: number) {
        setArquivosAnexo((atuais) => atuais.filter((_, i) => i !== indice));
        setErroAnexo(null);
    }

    async function enviarAnexo() {
        // Bloqueia envio duplicado enquanto o upload estiver em andamento.
        if (envioEmAndamento.current) return;

        const relato = relatoAnexo.trim();

        // O relato é gravado junto com os arquivos: é preciso ao menos um arquivo.
        if (arquivosAnexo.length === 0) {
            setErroAnexo("Selecione ao menos um arquivo. O relato é enviado junto com os anexos.");
            return;
        }

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
            // Tira da seleção os arquivos que já foram gravados, para não duplicar no próximo envio.
            const enviados = arquivosJaEnviados(err);
            if (enviados.length > 0) {
                setArquivosAnexo((atuais) => atuais.filter((arquivo) => !enviados.includes(arquivo)));
            }
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
    const solicitanteAtual = ordem
        ? funcionarios.find((item) => item.id === ordem.solicitante_id)
        : undefined;
    const projetoAtual = ordem?.projeto_id
        ? projetos.find((item) => item.id === ordem.projeto_id)
        : undefined;
    const horasRegistradasDemo = horasDemo.reduce((soma, item) => soma + item.horas, 0);
    const horasEstimadas = Math.max(1, ordem?.prazo_horas || 12);
    const progressoHorasDemo = Math.min(100, (horasRegistradasDemo / horasEstimadas) * 100);
    const responsavelOptions: AutocompleteOption[] = funcionariosElegiveis.map((funcionario) => ({
        value: funcionario.id,
        label: funcionario.nome || `Funcionário #${funcionario.id}`,
        description: `${funcionario.usuario} · ${funcionario.ativo ? "Ativo" : "Inativo"}`,
    }));

    // NOVA FUNÇÃO: salvar os campos editados diretamente na página.
    async function salvarEdicaoDireta() {
        if (!ordem || !onSalvarEdicaoDireta) return;

        if (!dadosEdicao.titulo?.trim()) {
            alert("Informe o título da ordem de serviço.");
            return;
        }

        if (!dadosEdicao.descricao?.trim()) {
            alert("Informe a descrição da ordem de serviço.");
            return;
        }

        if (!dadosEdicao.departamento_id) {
            alert("Selecione um departamento.");
            return;
        }

        if (!justificativaEdicao.trim()) {
            alert("Descreva o motivo da atualização.");
            return;
        }

        const sucesso = await onSalvarEdicaoDireta(ordem.id, {
            ...dadosEdicao,
            justificativa: justificativaEdicao.trim(),
        });

        if (sucesso) {
            setEdicaoDiretaAberta(false);
            setJustificativaEdicao("");
        }
    }

    return (
        <div
            className={`ordem-modal-overlay${modoPagina ? " ordem-modal-overlay--pagina" : ""}`}
            onMouseDown={(event) => {
                if (!modoPagina && event.target === event.currentTarget) {
                    onFechar();
                }
            }}
        >
            {modoPagina ? (
                <section className="os-detail-page" aria-label="Detalhes da ordem de serviço">
                    {carregando && !ordem && <p className="os-detail-feedback" role="status">Carregando os detalhes da ordem…</p>}
                    {erro && <p className="os-detail-feedback os-detail-feedback--error" role="alert">{erro}</p>}
                    {ordem && (
                        <>
                            <header className="os-detail-topbar">
                                <div className="os-detail-heading">
                                    <p className="os-detail-eyebrow">ORDENS DE SERVIÇO</p>
                                    <h1>{`OS-${Number.isNaN(new Date(ordem.data_criacao).getTime()) ? new Date().getFullYear() : new Date(ordem.data_criacao).getFullYear()}-${String(ordem.id).padStart(4, "0")}`}</h1>
                                    <p>{`${ordem.titulo} · ${cliente?.nome || `Cliente #${ordem.cliente_id ?? "—"}`}`}</p>
                                </div>
                                <div className="os-detail-top-actions">
                                    <button type="button" className="os-detail-btn os-detail-btn--secondary" onClick={onFechar}><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Voltar às ordens</button>
                                    <button type="button" className="os-detail-btn os-detail-btn--secondary" onClick={() => { setAbaAcompanhamento("anexos"); setAnexoAberto(true); }}><i className="fa-solid fa-paperclip" aria-hidden="true" /> Anexar arquivo</button>
                                    <button type="button" className="os-detail-btn os-detail-btn--primary" onClick={() => setStatusPainelAberto((aberto) => !aberto)} disabled={!podeAlterarStatus}><i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Alterar status</button>
                                </div>
                            </header>

                            <section className="os-detail-summary-card">
                                <div className="os-detail-summary-actions">
                                    <div className="os-detail-badges">
                                        <span className={`os-detail-badge os-detail-badge--status os-detail-badge--${ordem.status}`}><span aria-hidden="true">●</span> {STATUS_LABELS[ordem.status]}</span>
                                        <span className={`os-detail-badge os-detail-badge--priority os-detail-badge--${ordem.criticidade || "indefinida"}`}><span aria-hidden="true">●</span> {ordem.criticidade ? CRITICIDADE_LABELS[ordem.criticidade] : "Prioridade não definida"}</span>
                                        <span className="os-detail-badge os-detail-badge--sla" title={!ordem.data_limite_sla ? "Prazo de SLA demonstrativo: campo não disponível na API desta ordem." : undefined}>{ordem.data_limite_sla ? (new Date(ordem.data_limite_sla).getTime() < Date.now() ? `SLA vencido · ${formatarData(ordem.data_limite_sla).split(",")[0]}` : `SLA vence ${formatarData(ordem.data_limite_sla)}`) : "SLA vence hoje, 16:00"}</span>
                                    </div>
                                    <div className="os-detail-summary-tools">
                                        <div className="os-detail-actions-menu-wrap">
                                            <button type="button" className="os-detail-btn os-detail-btn--secondary" aria-expanded={acoesMenuAberto} onClick={() => setAcoesMenuAberto((aberto) => !aberto)}><i className="fa-solid fa-ellipsis" aria-hidden="true" /> Mais ações</button>
                                            {acoesMenuAberto && <div className="os-detail-actions-menu" role="menu">
                                                <button
                                                    type="button"
                                                    role="menuitem"
                                                    disabled={!podeEditarOrdem}
                                                    onClick={() => {
                                                        setAcoesMenuAberto(false);
                                                        onEditar(ordem);
                                                    }}
                                                >
                                                    <i className="fa-solid fa-pen" aria-hidden="true" /> Editar ordem
                                                </button>

                                                {modoPagina && (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        disabled={!podeEditarOrdem}
                                                        onClick={() => {
                                                            setAcoesMenuAberto(false);
                                                            setEdicaoDiretaAberta(true);
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-pen-to-square" aria-hidden="true" /> Editar diretamente
                                                    </button>
                                                )}
                                                {podeReatribuirResponsavel && <button type="button" role="menuitem" onClick={() => { setResponsavelPainelAberto((aberto) => !aberto); setAcoesMenuAberto(false); }}><i className="fa-solid fa-user-gear" aria-hidden="true" /> Alterar responsável</button>}
                                                {podeAlterarPrazo && <button type="button" role="menuitem" onClick={() => { setPrazoPainelAberto((aberto) => !aberto); setAcoesMenuAberto(false); }}><i className="fa-regular fa-calendar" aria-hidden="true" /> Alterar prazo</button>}
                                                <button type="button" role="menuitem" onClick={() => { setAbaAcompanhamento("anexos"); setAcoesMenuAberto(false); }}><i className="fa-solid fa-paperclip" aria-hidden="true" /> Consultar anexos</button>
                                            </div>}
                                        </div>
                                        <button type="button" className="os-detail-btn os-detail-btn--primary" onClick={() => setLancarHorasAberto(true)}><i className="fa-solid fa-plus" aria-hidden="true" /> Lançar horas</button>
                                    </div>
                                </div>
                                <h2>{ordem.titulo}</h2>
                                <p className="os-detail-summary-description">{ordem.descricao || "Sem descrição cadastrada."}</p>
                                <div className="os-detail-summary-meta">
                                    <span><i className="fa-solid fa-hashtag" aria-hidden="true" /> OS-{Number.isNaN(new Date(ordem.data_criacao).getTime()) ? new Date().getFullYear() : new Date(ordem.data_criacao).getFullYear()}-{String(ordem.id).padStart(4, "0")}</span>
                                    <span><i className="fa-regular fa-calendar" aria-hidden="true" /> Criada em {formatarData(ordem.data_criacao)}</span>
                                    <span><i className="fa-solid fa-user" aria-hidden="true" /> Aberta por {solicitanteAtual?.nome || "Mariana Costa"}</span>
                                </div>
                            </section>

                            {edicaoDiretaAberta && (
                                <section className="os-detail-inline-panel">
                                    <div>
                                        <h2>Editar ordem de serviço</h2>
                                        <p>
                                            Altere os dados da ordem. A justificativa será registrada no histórico.
                                        </p>
                                    </div>

                                    <label className="os-detail-field">
                                        <span>Título</span>
                                        <input
                                            type="text"
                                            value={dadosEdicao.titulo ?? ""}
                                            onChange={(event) =>
                                                setDadosEdicao((atual) => ({
                                                    ...atual,
                                                    titulo: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <label className="os-detail-field">
                                        <span>Tipo</span>
                                        <select
                                            value={dadosEdicao.tipo ?? ""}
                                            onChange={(event) =>
                                                setDadosEdicao((atual) => ({
                                                    ...atual,
                                                    tipo: event.target.value as OrdemServicoInput["tipo"],
                                                }))
                                            }
                                        >
                                            <option value="instalacao">Instalação</option>
                                            <option value="manutencao">Manutenção</option>
                                        </select>
                                    </label>

                                    <label className="os-detail-field os-detail-field--wide">
                                        <span>Descrição</span>
                                        <textarea
                                            rows={4}
                                            value={dadosEdicao.descricao ?? ""}
                                            onChange={(event) =>
                                                setDadosEdicao((atual) => ({
                                                    ...atual,
                                                    descricao: event.target.value,
                                                }))
                                            }
                                        />
                                    </label>

                                    <label className="os-detail-field">
                                        <span>Cliente</span>
                                        <select
                                            value={dadosEdicao.cliente_id ?? ""}
                                            onChange={(event) =>
                                                setDadosEdicao((atual) => ({
                                                    ...atual,
                                                    cliente_id: event.target.value
                                                        ? Number(event.target.value)
                                                        : undefined,
                                                    projeto_id: null,
                                                }))
                                            }
                                        >
                                            <option value="">Selecione um cliente</option>
                                            {clientes.map((clienteItem) => (
                                                <option key={clienteItem.id} value={clienteItem.id}>
                                                    {clienteItem.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="os-detail-field">
                                        <span>Departamento</span>
                                        <select
                                            value={dadosEdicao.departamento_id ?? ""}
                                            onChange={(event) =>
                                                setDadosEdicao((atual) => ({
                                                    ...atual,
                                                    departamento_id: Number(event.target.value),
                                                }))
                                            }
                                        >
                                            <option value="">Selecione um departamento</option>
                                            {departamentos.map((departamentoItem) => (
                                                <option
                                                    key={departamentoItem.id}
                                                    value={departamentoItem.id}
                                                >
                                                    {departamentoItem.nome}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="os-detail-field">
                                        <span>Projeto</span>
                                        <select
                                            value={dadosEdicao.projeto_id ?? ""}
                                            onChange={(event) =>
                                                setDadosEdicao((atual) => ({
                                                    ...atual,
                                                    projeto_id: event.target.value
                                                        ? Number(event.target.value)
                                                        : null,
                                                }))
                                            }
                                        >
                                            <option value="">Nenhum projeto</option>
                                            {projetos
                                                .filter((projeto) =>
                                                    !dadosEdicao.cliente_id ||
                                                    projeto.cliente_id === dadosEdicao.cliente_id
                                                )
                                                .map((projeto) => (
                                                    <option key={projeto.id} value={projeto.id}>
                                                        {projeto.nome}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>

                                    <label className="os-detail-field">
                                        <span>Criticidade</span>
                                        <select
                                            value={dadosEdicao.criticidade ?? ""}
                                            onChange={(event) =>
                                                setDadosEdicao((atual) => ({
                                                    ...atual,
                                                    criticidade: event.target.value || null,
                                                }))
                                            }
                                        >
                                            <option value="">Não definida</option>
                                            {Object.entries(CRITICIDADE_LABELS).map(
                                                ([valor, rotulo]) => (
                                                    <option key={valor} value={valor}>
                                                        {rotulo}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>

                                    <label className="os-detail-field os-detail-field--wide">
                                        <span>Motivo da atualização (obrigatório)</span>
                                        <textarea
                                            rows={3}
                                            value={justificativaEdicao}
                                            onChange={(event) =>
                                                setJustificativaEdicao(event.target.value)
                                            }
                                            placeholder="Descreva o que foi alterado e o motivo."
                                        />
                                    </label>

                                    <div className="os-detail-inline-actions">
                                        <button
                                            type="button"
                                            className="os-detail-btn os-detail-btn--secondary"
                                            onClick={() => {
                                                setEdicaoDiretaAberta(false);
                                                setJustificativaEdicao("");
                                            }}
                                            disabled={salvandoEdicaoDireta}
                                        >
                                            Cancelar
                                        </button>

                                        <button
                                            type="button"
                                            className="os-detail-btn os-detail-btn--primary"
                                            onClick={salvarEdicaoDireta}
                                            disabled={
                                                salvandoEdicaoDireta ||
                                                !justificativaEdicao.trim()
                                            }
                                        >
                                            {salvandoEdicaoDireta
                                                ? "Salvando..."
                                                : "Salvar alterações"}
                                        </button>
                                    </div>
                                </section>
                            )}

                            {statusPainelAberto && <section className="os-detail-inline-panel">
                                <div><h2>Alterar status</h2><p>A atualização será enviada à API do SGOS.</p></div>
                                <label className="os-detail-field"><span>Novo status</span><select value={statusSelecionado} onChange={(event) => setStatusSelecionado(event.target.value as StatusOrdemServico)} disabled={!podeAlterarStatus || alterandoStatusId !== null}>{statusEditaveis.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></label>
                                {statusSelecionado === "concluido" && <label className="os-detail-field os-detail-field--wide"><span>Parecer técnico obrigatório</span><textarea rows={3} value={parecerTemporario} onChange={(event) => setParecerTemporario(event.target.value)} placeholder="Descreva o trabalho realizado e os testes concluídos…" /></label>}
                                <div className="os-detail-inline-actions"><button type="button" className="os-detail-btn os-detail-btn--secondary" onClick={() => setStatusPainelAberto(false)}>Cancelar</button><button type="button" className="os-detail-btn os-detail-btn--primary" onClick={() => { onAlterarStatus(statusSelecionado, statusSelecionado === "concluido" ? parecerTemporario : undefined); setStatusPainelAberto(false); }} disabled={!podeAlterarStatus || alterandoStatusId !== null || statusSelecionado === ordem.status || (statusSelecionado === "concluido" && !parecerTemporario.trim())}>{alterandoStatusId === ordem.id ? "Atualizando…" : "Salvar status"}</button></div>
                            </section>}

                            {prazoPainelAberto && <section className="os-detail-inline-panel">
                                <div><h2>Alterar prazo</h2><p>O motivo será solicitado antes de enviar a alteração.</p></div>
                                <label className="os-detail-field"><span>Novo prazo final</span><input type="date" value={prazoSelecionado} onChange={(event) => setPrazoSelecionado(event.target.value)} disabled={alterandoPrazo} /></label>
                                <div className="os-detail-inline-actions"><button type="button" className="os-detail-btn os-detail-btn--secondary" onClick={() => setPrazoPainelAberto(false)}>Cancelar</button><button type="button" className="os-detail-btn os-detail-btn--primary" onClick={() => { setPrazoPainelAberto(false); setJustificativaAberta(true); }} disabled={!podeAlterarPrazo || alterandoPrazo || !prazoSelecionado || prazoSelecionado === prazoAtual}>Continuar</button></div>
                            </section>}

                            {responsavelPainelAberto && <section className="os-detail-inline-panel">
                                <div><h2>Alterar responsável</h2><p>Somente funcionários elegíveis são listados.</p></div>
                                <label className="os-detail-field os-detail-field--wide"><span>Responsável técnico</span><Autocomplete id="ordem-responsavel-novo" options={responsavelOptions} value={responsavelNovoId} onChange={(value) => setResponsavelNovoId(value === null ? null : Number(value))} placeholder="Pesquisar funcionário ativo" clearable disabled={atribuindoResponsavel} emptyMessage="Nenhum funcionário ativo encontrado." /></label>
                                <div className="os-detail-inline-actions"><button type="button" className="os-detail-btn os-detail-btn--secondary" onClick={() => setResponsavelPainelAberto(false)}>Cancelar</button><button type="button" className="os-detail-btn os-detail-btn--primary" onClick={() => { if (responsavelNovoId !== null) onAtribuirResponsavel(responsavelNovoId); setResponsavelPainelAberto(false); }} disabled={atribuindoResponsavel || responsavelNovoId === null || responsavelNovoId === ordem.responsavel_id}>{atribuindoResponsavel ? "Salvando…" : "Salvar responsável"}</button></div>
                            </section>}

                            <section className="os-detail-facts" aria-label="Resumo da ordem">
                                <article><span>Cliente</span><strong>{cliente?.nome || (ordem.cliente_id ? `Cliente #${ordem.cliente_id}` : "Não associado")}</strong><small>{cliente?.razao_social || "contato@altave.com.br"}</small></article>
                                <article><span>Responsável técnico</span><strong>{responsavelAtual?.nome || (ordem.responsavel_id ? `Funcionário #${ordem.responsavel_id}` : "André Lima")}</strong><small>{responsavelAtual ? `${responsavelAtual.tipo === "tecnico" ? "Operações" : responsavelAtual.tipo} · ${responsavelAtual.ativo ? "Ativo" : "Inativo"}` : "Operações · Técnico sênior (demo)"}</small></article>
                                <article><span>Projeto</span><strong>{projetoAtual?.nome || (ordem.projeto_id ? `Projeto #${ordem.projeto_id}` : "Infraestrutura de rede")}</strong><small>{ordem.projeto_id ? `PRJ-${String(ordem.projeto_id).padStart(4, "0")}-008` : "Informação de demonstração"}</small></article>
                                <article className="os-detail-time-fact"><span>Tempo registrado</span><strong>{Math.floor(horasRegistradasDemo)}h {Math.round((horasRegistradasDemo % 1) * 60)}min <small>/ {horasEstimadas}h estimadas</small></strong><div className="os-detail-progress"><span style={{ width: `${progressoHorasDemo}%` }} /></div></article>
                            </section>

                            {lancarHorasAberto && <div className="os-detail-demo-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLancarHorasAberto(false); }}><section className="os-detail-demo-dialog" role="dialog" aria-modal="true" aria-labelledby="os-detail-hours-title"><header><div><span className="os-detail-eyebrow">REGISTRO DE EXEMPLO</span><h2 id="os-detail-hours-title">Lançar horas</h2></div><button type="button" aria-label="Fechar" onClick={() => setLancarHorasAberto(false)}>×</button></header><p>O backend do SGOS não possui lançamento de horas. Este registro é demonstrativo e ficará somente nesta tela.</p><label className="os-detail-field"><span>Horas trabalhadas</span><input type="number" min="0.25" max="24" step="0.25" value={horasDigitadas} onChange={(event) => setHorasDigitadas(event.target.value)} /></label><label className="os-detail-field"><span>Descrição</span><textarea rows={3} value={descricaoHoras} onChange={(event) => setDescricaoHoras(event.target.value)} placeholder="O que foi realizado?" /></label><footer><button type="button" className="os-detail-btn os-detail-btn--secondary" onClick={() => setLancarHorasAberto(false)}>Cancelar</button><button type="button" className="os-detail-btn os-detail-btn--primary" onClick={() => { const quantidade = Number(horasDigitadas); if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 24) return; setHorasDemo((atuais) => [...atuais, { id: Date.now(), horas: quantidade, descricao: descricaoHoras.trim() || "Atividade registrada (demo)", quando: "Agora", autor: "Você" }]); setAbaAcompanhamento("horas"); setLancarHorasAberto(false); setDescricaoHoras(""); }} disabled={!Number.isFinite(Number(horasDigitadas)) || Number(horasDigitadas) <= 0 || Number(horasDigitadas) > 24}>Registrar (local)</button></footer></section></div>}

                            <div className="os-detail-content-grid">
                                <div className="os-detail-primary-column">
                                    <section className="os-detail-card os-detail-activity-card">
                                        <header className="os-detail-card-heading"><div><h2>Acompanhamento da ordem</h2><p>Histórico de atividades e atualizações</p></div><button type="button" className="os-detail-btn os-detail-btn--secondary" onClick={() => { comentarioRef.current?.focus(); document.querySelector(".os-detail-comments-card")?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }}><i className="fa-solid fa-plus" aria-hidden="true" /> Adicionar atualização</button></header>
                                        <div className="os-detail-tabs" role="tablist" aria-label="Atividades da ordem">
                                            <button type="button" role="tab" aria-selected={abaAcompanhamento === "historico"} className={abaAcompanhamento === "historico" ? "ativo" : ""} onClick={() => setAbaAcompanhamento("historico")}>Histórico <span>API</span></button>
                                            <button type="button" role="tab" aria-selected={abaAcompanhamento === "horas"} className={abaAcompanhamento === "horas" ? "ativo" : ""} onClick={() => setAbaAcompanhamento("horas")}>Horas registradas <span>{horasDemo.length}</span></button>
                                            <button type="button" role="tab" aria-selected={abaAcompanhamento === "anexos"} className={abaAcompanhamento === "anexos" ? "ativo" : ""} onClick={() => setAbaAcompanhamento("anexos")}>Anexos <span>{anexos.length}</span></button>
                                        </div>
                                        {abaAcompanhamento === "historico" && <div className="os-detail-history-content"><OrdemServicoHistorico osId={ordem.id} usarFallbackDemonstrativo /></div>}
                                        {abaAcompanhamento === "horas" && <div className="os-detail-timeline-list">{horasDemo.slice().reverse().map((item) => <article key={item.id} className="os-detail-timeline-item"><span className="os-detail-timeline-icon os-detail-timeline-icon--violet"><i className="fa-regular fa-clock" aria-hidden="true" /></span><div><strong>{item.horas.toLocaleString("pt-BR")}h · {item.descricao}</strong><p>Registro demonstrativo local · {item.quando} · {item.autor}</p></div></article>)}<p className="os-detail-demo-note">Horas de demonstração; ainda não são persistidas no SGOS.</p></div>}
                                        {abaAcompanhamento === "anexos" && <div className="os-detail-attachments-content">{carregandoAnexos ? <p role="status">Carregando anexos…</p> : erroAnexos ? <p role="alert">{erroAnexos}</p> : anexos.length === 0 ? <div className="os-detail-empty"><i className="fa-regular fa-file-lines" aria-hidden="true" /><strong>Nenhum anexo registrado</strong><span>Adicione arquivos para consultar nesta seção.</span></div> : <ul>{anexos.map((anexo) => <li key={anexo.id}><i className="fa-regular fa-file-lines" aria-hidden="true" /><span><strong>{anexo.nome}</strong><small>{anexo.autor || "Usuário"}{anexo.data_envio ? ` · ${formatarData(anexo.data_envio)}` : ""}</small></span><button type="button" className="os-detail-btn os-detail-btn--secondary" onClick={() => void baixarAnexo(anexo)}>Baixar</button></li>)}</ul>}<button type="button" className="os-detail-btn os-detail-btn--primary" onClick={() => setAnexoAberto(true)}><i className="fa-solid fa-paperclip" aria-hidden="true" /> Anexar arquivo</button></div>}
                                    </section>

                                    <section className="os-detail-card os-detail-technical-opinion-card">
                                        <header className="os-detail-card-heading">
                                            <div><h2>Parecer técnico</h2><p>Registro técnico da execução e conclusão da ordem</p></div>
                                            <span className={`os-detail-count ${ordem.parecer_tecnico?.trim() ? "os-detail-count--success" : ""}`}>{ordem.parecer_tecnico?.trim() ? "Registrado" : "Pendente"}</span>
                                        </header>
                                        {ordem.parecer_tecnico?.trim() ? (
                                            <div className="os-detail-opinion-content">
                                                <span className="os-detail-opinion-icon"><i className="fa-solid fa-file-circle-check" aria-hidden="true" /></span>
                                                <div><strong>Parecer registrado no SGOS</strong><p>{ordem.parecer_tecnico}</p></div>
                                            </div>
                                        ) : (
                                            <div className="os-detail-opinion-empty">
                                                <span className="os-detail-opinion-icon"><i className="fa-regular fa-file-lines" aria-hidden="true" /></span>
                                                <div><strong>Nenhum parecer técnico registrado</strong><p>O parecer será salvo no SGOS quando a ordem for concluída.</p></div>
                                            </div>
                                        )}
                                        {!ordem.parecer_tecnico?.trim() && podeConcluir && ordem.status !== "concluido" && (
                                            <div className="os-detail-opinion-editor">
                                                <label className="os-detail-field" htmlFor="os-detail-opinion-draft"><span>Preparar parecer técnico</span>
                                                    <textarea id="os-detail-opinion-draft" rows={4} value={parecerTemporario} onChange={(event) => setParecerTemporario(event.target.value)} placeholder="Descreva o trabalho realizado, os testes executados e o resultado…" />
                                                </label>
                                                <button type="button" className="os-detail-btn os-detail-btn--primary" disabled={!parecerTemporario.trim() || alterandoStatusId !== null} onClick={() => { setStatusSelecionado("concluido"); setStatusPainelAberto(true); document.querySelector(".gestec-os-detail-main")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><i className="fa-solid fa-clipboard-check" aria-hidden="true" /> Revisar conclusão e salvar</button>
                                                <small className="os-detail-demo-note">O parecer só será persistido após confirmar a conclusão na etapa seguinte.</small>
                                            </div>
                                        )}
                                    </section>
                                </div>

                                <aside className="os-detail-aside-column">
                                    <section className="os-detail-card os-detail-comments-card">
                                        <header className="os-detail-card-heading"><div><h2>Comentários</h2><p>Troca de informações da equipe</p></div><span className="os-detail-count">{comentariosDemo.length} comentários</span></header>
                                        <div className="os-detail-comments-list">{comentariosDemo.map((comentario) => <article key={comentario.id} className="os-detail-comment"><span className={`os-detail-avatar os-detail-avatar--${comentario.tom}`}>{comentario.iniciais}</span><div className="os-detail-comment-body"><div className="os-detail-comment-meta"><strong>{comentario.autor}</strong><time>{comentario.quando}</time></div><p>{comentario.texto}</p></div></article>)}</div>
                                        <form className="os-detail-comment-form" onSubmit={(event) => { event.preventDefault(); const texto = comentarioNovo.trim(); if (!texto) return; const userText = "Você"; setComentariosDemo((atuais) => [...atuais, { id: Date.now(), iniciais: "VC", autor: userText, quando: "Agora", texto, tom: "azul" }]); setComentarioNovo(""); }}>
                                            <textarea ref={comentarioRef} rows={2} value={comentarioNovo} onChange={(event) => setComentarioNovo(event.target.value)} placeholder="Escreva uma atualização para a equipe…" aria-label="Escrever comentário demonstrativo" />
                                            <button type="submit" className="os-detail-btn os-detail-btn--primary" disabled={!comentarioNovo.trim()}><i className="fa-solid fa-check" aria-hidden="true" /> Enviar atualização</button>
                                        </form>
                                        <small className="os-detail-demo-note">Comentários demonstrativos: não são enviados nem salvos no backend.</small>
                                    </section>

                                    <section className="os-detail-card os-detail-people-card"><header className="os-detail-card-heading"><div><h2>Pessoas envolvidas</h2></div><button type="button" aria-label="Alterar pessoa responsável" onClick={() => setResponsavelPainelAberto((aberto) => !aberto)} disabled={!podeReatribuirResponsavel}><i className="fa-solid fa-plus" aria-hidden="true" /></button></header><div className="os-detail-people-list">
                                        <article><span className="os-detail-avatar os-detail-avatar--blue">{(responsavelAtual?.nome || "André Lima").split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}</span><div><strong>{responsavelAtual?.nome || "André Lima"}</strong><small>Responsável técnico{!responsavelAtual ? " · demonstração" : ""}</small></div><i className={`os-detail-presence${responsavelAtual?.ativo === false ? " inativo" : ""}`} aria-label={responsavelAtual?.ativo === false ? "Inativo" : "Ativo"} /></article>
                                        <article><span className="os-detail-avatar os-detail-avatar--violet">JF</span><div><strong>Juliana Ferreira</strong><small>Apoio técnico · demonstração</small></div><i className="os-detail-presence" aria-label="Ativo (demonstração)" /></article>
                                        <article><span className="os-detail-avatar os-detail-avatar--blue">MC</span><div><strong>Mariana Costa</strong><small>Gestora da ordem · demonstração</small></div><i className="os-detail-presence inativo" aria-label="Disponibilidade não informada" /></article>
                                    </div></section>
                                </aside>
                            </div>
                        </>
                    )}
                    {!ordem && !carregando && !erro && <div className="os-detail-empty"><strong>Ordem não encontrada</strong><span>Volte à lista e selecione uma ordem válida.</span><button type="button" className="os-detail-btn os-detail-btn--primary" onClick={onFechar}>Voltar às ordens</button></div>}
                </section>
            ) : (
                <section
                    className={`ordem-modal ordem-modal--detalhes${modoPagina ? " ordem-modal--pagina" : ""}`}
                    role={modoPagina ? "region" : "dialog"}
                    aria-modal={modoPagina ? undefined : true}
                    aria-label={modoPagina ? "Detalhes da ordem de serviço" : undefined}
                    aria-labelledby={modoPagina ? undefined : "ordem-detalhes-titulo"}
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
                                                    {statusEditaveis.map((status) => (
                                                        <option key={status} value={status}>
                                                            {STATUS_LABELS[status]}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                className="ordens-btn-primary ordem-status-atualizar"
                                                onClick={() => onAlterarStatus(
                                                    statusSelecionado,
                                                    statusSelecionado === "concluido" ? parecerTemporario : undefined,
                                                )}
                                                disabled={
                                                    alterandoStatusId !== null ||
                                                    statusSelecionado === ordem.status
                                                }
                                                aria-busy={alterandoStatusId === ordem.id}
                                            >
                                                {alterandoStatusId === ordem.id
                                                    ? "Atualizando..."
                                                    : statusSelecionado === "concluido"
                                                        ? "Concluir O.S."
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

                                <OrdemServicoHistorico osId={ordem.id} />

                                <section className="ordem-detalhes-descricao ordem-parecer-rascunho">
                                    <h3>
                                        {podeConcluir
                                            ? "Parecer técnico"
                                            : "Parecer técnico — rascunho temporário"}
                                    </h3>

                                    {podeConcluir && (
                                        <p>O parecer será registrado ao concluir a O.S. e é obrigatório para essa ação.</p>
                                    )}

                                    <label htmlFor="parecer-tecnico-temporario">
                                        {podeConcluir ? "Parecer técnico" : "Seu rascunho"}
                                    </label>

                                    <textarea
                                        id="parecer-tecnico-temporario"
                                        className="ordem-parecer-textarea"
                                        rows={6}
                                        value={parecerTemporario}
                                        onChange={(event) =>
                                            setParecerTemporario(event.target.value)
                                        }
                                        placeholder={podeConcluir
                                            ? "Descreva o trabalho realizado e o resultado dos testes..."
                                            : "Escreva aqui seu rascunho..."}
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
            )}


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
                                                        onClick={(event) => {
                                                            // O download exige o token: baixa pela API em vez de abrir o link.
                                                            if (onBaixarAnexo) {
                                                                event.preventDefault();
                                                                void baixarAnexo(anexo);
                                                            }
                                                        }}
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
                                                {anexo.autor ? ` · ${anexo.autor}` : ""}
                                                {anexo.relato ? ` — ${anexo.relato}` : ""}
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
                                disabled={enviandoAnexo || arquivosAnexo.length === 0}
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