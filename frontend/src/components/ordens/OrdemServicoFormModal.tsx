/**
 * Formulário de cadastro/edição de ordem de serviço.
 * Mantém suporte ao cadastro histórico (AJ-06), duplicação (AJ-15)
 * e configuração de prazo de SLA quando autorizada.
 */
import { useEffect, useState, type FormEvent } from "react";
import type {
    Cliente,
    Departamento,
    NivelCriticidade,
    OrdemServico,
    OrdemServicoInput,
    Projeto,
    StatusOrdemServico,
    TipoOrdemServico,
} from "../../types/api";
import Autocomplete from "../common/Autocomplete";
import type { AutocompleteOption } from "../common/Autocomplete";
import { STATUS_LABELS } from "../../utils/ordemServicoUtils";

interface OrdemServicoFormModalProps {
    aberto: boolean;
    ordem: OrdemServico | null;
    /** Dados permitidos de uma O.S. usada como modelo para uma nova criação. */
    ordemParaDuplicar?: OrdemServico | null;
    clientes: Cliente[];
    departamentos: Departamento[];
    projetos: Projeto[];
    salvando: boolean;
    erro: string | null;
    carregandoOpcoes?: boolean;
    podeCadastrarAntiga?: boolean;
    podeConfigurarPrazoInstalacao?: boolean;
    onClose: () => void;
    onSave: (dados: OrdemServicoInput) => Promise<void>;
    onClearError: () => void;
}

interface FormularioOrdemAntiga {
    ativo: boolean;
    dataAbertura: string;
    status: StatusOrdemServico;
    dataConclusao: string;
    parecerTecnico: string;
    referencia: number;
}

interface FormularioOrdem {
    titulo: string;
    tipo: TipoOrdemServico | null;
    descricao: string;
    clienteId: number | null;
    departamentoId: number | null;
    projetoId: number | null;
    criticidade: NivelCriticidade | null;
    dataAbertura: string;
    dataLimiteSla: string;
}

const FORMULARIO_ANTIGA_INICIAL: FormularioOrdemAntiga = {
    ativo: false,
    referencia: 0,
    dataAbertura: "",
    status: "em_andamento",
    dataConclusao: "",
    parecerTecnico: "",
};

const STATUS_OPCOES: AutocompleteOption[] = (
    Object.keys(STATUS_LABELS) as StatusOrdemServico[]
).map((status) => ({ value: status, label: STATUS_LABELS[status] }));

const TOLERANCIA_DATA_PASSADA_MS = 5 * 60 * 1000;
const DIA_MS = 86_400_000;

function msParaInput(ms: number): string {
    if (!Number.isFinite(ms)) return "";
    const data = new Date(ms);
    return new Date(ms - data.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
}

function inputParaMs(valor: string): number {
    return valor ? new Date(valor).getTime() : Number.NaN;
}

function valorDataParaInput(valor: string | null | undefined): string {
    if (!valor) return "";
    const ms = new Date(valor).getTime();
    return Number.isFinite(ms) ? msParaInput(ms) : "";
}

function inicioDoMinuto(ms: number): number {
    return Math.floor(ms / 60_000) * 60_000;
}

/** Prévia operacional: após 17h, próxima data às 08h. A API continua sendo a fonte final. */
function aberturaOperacionalPreview(referencia: number): number {
    const data = new Date(referencia);
    const segundos =
        data.getHours() * 3600 +
        data.getMinutes() * 60 +
        data.getSeconds() +
        data.getMilliseconds() / 1000;
    if (segundos > 17 * 3600) {
        data.setDate(data.getDate() + 1);
        data.setHours(8, 0, 0, 0);
    }
    return data.getTime();
}

function diferencaDiasCorridosNoFuso(
    inicio: string | null | undefined,
    fim: string | null | undefined,
): number | null {
    if (!inicio || !fim) return null;

    const converterDia = (valor: string): number | null => {
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return null;
        const partes = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).formatToParts(data);
        const parte = (tipo: "year" | "month" | "day") =>
            Number(partes.find((item) => item.type === tipo)?.value ?? 0);
        const ano = parte("year");
        const mes = parte("month");
        const dia = parte("day");
        return Date.UTC(ano, mes - 1, dia);
    };

    const dataInicio = converterDia(inicio);
    const dataFim = converterDia(fim);
    if (dataInicio === null || dataFim === null) return null;
    return Math.round((dataFim - dataInicio) / DIA_MS);
}

function criarFormularioInicial(referencia = inicioDoMinuto(Date.now())): FormularioOrdem {
    const abertura = aberturaOperacionalPreview(referencia);
    return {
        titulo: "",
        tipo: null,
        descricao: "",
        clienteId: null,
        departamentoId: null,
        projetoId: null,
        criticidade: null,
        dataAbertura: msParaInput(abertura),
        dataLimiteSla: msParaInput(abertura + 5 * DIA_MS),
    };
}

const FORMULARIO_INICIAL = criarFormularioInicial();

const TIPOS: AutocompleteOption[] = [
    { value: "instalacao", label: "Instalação" },
    { value: "manutencao", label: "Manutenção" },
];

const CRITICIDADES: AutocompleteOption[] = [
    { value: "baixo", label: "Baixo" },
    { value: "medio", label: "Médio" },
    { value: "alto", label: "Alto" },
    { value: "muito_alto", label: "Muito alto" },
    { value: "urgente", label: "Urgente" },
];

function OrdemServicoFormModal({
    aberto,
    ordem,
    ordemParaDuplicar = null,
    clientes,
    departamentos,
    projetos,
    salvando,
    erro,
    carregandoOpcoes = false,
    podeCadastrarAntiga = false,
    podeConfigurarPrazoInstalacao = false,
    onClose,
    onSave,
    onClearError,
}: OrdemServicoFormModalProps) {
    const [form, setForm] = useState<FormularioOrdem>(FORMULARIO_INICIAL);
    const [referenciaAbertura, setReferenciaAbertura] = useState(() => inicioDoMinuto(Date.now()));
    const [dataAberturaAlterada, setDataAberturaAlterada] = useState(false);
    const [prazoPreset, setPrazoPreset] = useState("5");
    const [erroLocal, setErroLocal] = useState<string | null>(null);
    const [prazoOriginalDescartado, setPrazoOriginalDescartado] = useState(false);
    const [relacoesOriginaisIndisponiveis, setRelacoesOriginaisIndisponiveis] = useState(false);
    const [antiga, setAntiga] = useState<FormularioOrdemAntiga>(FORMULARIO_ANTIGA_INICIAL);

    const exibirCadastroAntiga = podeCadastrarAntiga && ordem === null && !ordemParaDuplicar;
    const cadastroAntigaAtivo = exibirCadastroAntiga && antiga.ativo;
    const aberturaNoPassado =
        cadastroAntigaAtivo && inputParaMs(antiga.dataAbertura) < antiga.referencia;
    const antigaConcluida = cadastroAntigaAtivo && antiga.status === "concluido";

    useEffect(() => {
        if (!aberto) return;

        const referencia = inicioDoMinuto(Date.now());
        const formularioInicial = criarFormularioInicial(referencia);
        setReferenciaAbertura(referencia);
        setDataAberturaAlterada(false);
        setPrazoPreset("5");
        setPrazoOriginalDescartado(false);
        setRelacoesOriginaisIndisponiveis(false);
        setAntiga({ ...FORMULARIO_ANTIGA_INICIAL, referencia: Date.now() });
        setErroLocal(null);

        if (ordem) {
            setForm({
                titulo: ordem.titulo ?? "",
                tipo: ordem.tipo,
                descricao: ordem.descricao ?? "",
                clienteId: ordem.cliente_id,
                departamentoId: ordem.departamento_id,
                projetoId: ordem.projeto_id,
                criticidade: ordem.criticidade,
                dataAbertura: valorDataParaInput(ordem.data_criacao),
                dataLimiteSla: valorDataParaInput(ordem.data_limite_sla),
            });
            setPrazoPreset("personalizado");
            return;
        }

        if (ordemParaDuplicar) {
            const aberturaNova = formularioInicial.dataAbertura;
            const aberturaNovaMs = inputParaMs(aberturaNova);
            const duracaoOriginal = diferencaDiasCorridosNoFuso(
                ordemParaDuplicar.data_criacao,
                ordemParaDuplicar.data_limite_sla,
            );
            const duracaoCompativel =
                duracaoOriginal !== null &&
                duracaoOriginal >= 1 &&
                (ordemParaDuplicar.tipo !== "instalacao" || duracaoOriginal <= 90);
            const prazoOriginal =
                duracaoCompativel && !Number.isNaN(aberturaNovaMs)
                    ? msParaInput(aberturaNovaMs + duracaoOriginal * DIA_MS)
                    : "";
            const clienteDisponivel =
                ordemParaDuplicar.cliente_id !== null &&
                clientes.some((cliente) => cliente.id === ordemParaDuplicar.cliente_id && cliente.ativo);
            const departamentoDisponivel = departamentos.some(
                (departamento) => departamento.id === ordemParaDuplicar.departamento_id,
            );
            const projetoDisponivel =
                ordemParaDuplicar.projeto_id !== null &&
                projetos.some(
                    (projeto) =>
                        projeto.id === ordemParaDuplicar.projeto_id &&
                        projeto.ativo &&
                        projeto.cliente_id === ordemParaDuplicar.cliente_id,
                );
            setPrazoOriginalDescartado(Boolean(ordemParaDuplicar.data_limite_sla) && !prazoOriginal);
            setRelacoesOriginaisIndisponiveis(
                !clienteDisponivel ||
                !departamentoDisponivel ||
                (ordemParaDuplicar.projeto_id !== null && !projetoDisponivel),
            );
            setForm({
                ...formularioInicial,
                titulo: ordemParaDuplicar.titulo ?? "",
                tipo: ordemParaDuplicar.tipo,
                descricao: ordemParaDuplicar.descricao ?? "",
                clienteId: clienteDisponivel ? ordemParaDuplicar.cliente_id : null,
                departamentoId: departamentoDisponivel ? ordemParaDuplicar.departamento_id : null,
                projetoId: clienteDisponivel && projetoDisponivel ? ordemParaDuplicar.projeto_id : null,
                criticidade: ordemParaDuplicar.criticidade,
                dataLimiteSla: prazoOriginal,
            });
            setPrazoPreset("personalizado");
            return;
        }

        setForm(formularioInicial);
    // O formulário é reiniciado ao abrir ou trocar a ordem/modelo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aberto, ordem?.id, ordemParaDuplicar?.id]);

    useEffect(() => {
        if (!aberto) return;
        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape" && !salvando) onClose();
        }
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, [aberto, salvando, onClose]);

    const clienteOptions: AutocompleteOption[] = clientes
        .filter((cliente) => cliente.ativo)
        .map((cliente) => ({
            value: cliente.id,
            label: cliente.nome,
            description: cliente.razao_social,
        }));

    const departamentoOptions: AutocompleteOption[] = departamentos.map((departamento) => ({
        value: departamento.id,
        label: departamento.nome,
    }));

    const projetosAtivosDoCliente = projetos.filter(
        (projeto) => projeto.ativo && form.clienteId !== null && projeto.cliente_id === form.clienteId,
    );
    const projetoAtual = form.projetoId === null
        ? undefined
        : projetos.find((projeto) => projeto.id === form.projetoId);
    const projetoAtualEstaDisponivel = projetosAtivosDoCliente.some(
        (projeto) => projeto.id === form.projetoId,
    );
    const projetoOptions: AutocompleteOption[] = [
        ...projetosAtivosDoCliente.map((projeto) => ({
            value: projeto.id,
            label: projeto.nome,
            description: projeto.cliente?.nome ?? `Cliente #${projeto.cliente_id}`,
        })),
        ...(form.projetoId !== null && !projetoAtualEstaDisponivel
            ? [{
                  value: form.projetoId,
                  label: projetoAtual?.nome ?? `Projeto #${form.projetoId}`,
                  description: projetoAtual
                      ? projetoAtual.ativo
                          ? "Associação atual fora do cliente selecionado; escolha outro projeto para substituí-la"
                          : "Projeto inativo; associação existente preservada até substituição explícita"
                      : "Projeto associado não consta nas opções disponíveis",
                  disabled: true,
              }]
            : []),
    ];

    const aberturaEfetivaParaPrazo = cadastroAntigaAtivo ? antiga.dataAbertura : form.dataAbertura;
    const aberturaEfetivaMs = inputParaMs(aberturaEfetivaParaPrazo);
    const prazoInformadoMs = inputParaMs(form.dataLimiteSla);
    const diasPrazo = diferencaDiasCorridosNoFuso(aberturaEfetivaParaPrazo, form.dataLimiteSla);
    const prazoNaoPosteriorAbertura = Boolean(
        form.dataLimiteSla &&
        !Number.isNaN(aberturaEfetivaMs) &&
        (Number.isNaN(prazoInformadoMs) || diasPrazo === null || diasPrazo < 1),
    );

    function atualizarCampo<K extends keyof FormularioOrdem>(campo: K, valor: FormularioOrdem[K]) {
        setForm((anterior) => ({
            ...anterior,
            [campo]: valor,
            ...(campo === "clienteId" ? { projetoId: null } : {}),
        }));
        setErroLocal(null);
        onClearError();
    }

    function atualizarCampoAntiga<K extends keyof FormularioOrdemAntiga>(
        campo: K,
        valor: FormularioOrdemAntiga[K],
    ) {
        setAntiga((anterior) => ({ ...anterior, [campo]: valor, referencia: Date.now() }));
        setErroLocal(null);
        onClearError();
    }

    function validarCadastroAntiga(): string | null {
        const abertura = inputParaMs(antiga.dataAbertura);
        if (Number.isNaN(abertura)) return "Informe a data de abertura da O.S. antiga.";
        if (abertura >= Date.now() - TOLERANCIA_DATA_PASSADA_MS) {
            return "Para cadastrar uma O.S. antiga, a data de abertura deve ser anterior à data atual.";
        }
        if (antiga.status !== "concluido") return null;
        if (!antiga.parecerTecnico.trim()) {
            return "O parecer técnico é obrigatório para cadastrar uma O.S. concluída.";
        }
        const conclusao = inputParaMs(antiga.dataConclusao);
        if (Number.isNaN(conclusao)) return "Informe a data de conclusão da O.S. concluída.";
        if (conclusao < abertura) return "A data de conclusão não pode ser anterior à data de abertura.";
        if (conclusao > Date.now()) return "A data de conclusão não pode estar no futuro.";
        return null;
    }

    function montarDadosAntiga(): Partial<OrdemServicoInput> {
        if (!cadastroAntigaAtivo) return {};
        return {
            data_criacao: new Date(antiga.dataAbertura).toISOString(),
            status: antiga.status,
            ...(antiga.status === "concluido"
                ? {
                      parecer_tecnico: antiga.parecerTecnico.trim(),
                      data_fim: new Date(antiga.dataConclusao).toISOString(),
                  }
                : {}),
        };
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (
            !form.titulo.trim() ||
            !form.descricao.trim() ||
            !form.tipo ||
            form.clienteId === null ||
            form.departamentoId === null
        ) {
            setErroLocal("Preencha título, descrição, tipo, cliente e departamento.");
            return;
        }

        if (cadastroAntigaAtivo) {
            const erroAntiga = validarCadastroAntiga();
            if (erroAntiga) {
                setErroLocal(erroAntiga);
                return;
            }
        }

        const deveEnviarPrazo = form.tipo !== "instalacao" || podeConfigurarPrazoInstalacao;
        let aberturaParaSalvar: number | null = null;
        let prazoParaSalvar: number | null = null;

        if (!cadastroAntigaAtivo) {
            const aberturaInput = !ordem && !ordemParaDuplicar && !dataAberturaAlterada
                ? msParaInput(aberturaOperacionalPreview(Date.now()))
                : form.dataAbertura;
            const aberturaMs = inputParaMs(aberturaInput);
            if (!aberturaInput || Number.isNaN(aberturaMs)) {
                setErroLocal("Informe uma data de abertura válida.");
                return;
            }
            if (
                !ordem && !ordemParaDuplicar && dataAberturaAlterada &&
                aberturaMs < Date.now() - TOLERANCIA_DATA_PASSADA_MS
            ) {
                setErroLocal("A data informada ficou no passado. Para registrar uma O.S. antiga, use a opção de cadastro histórico.");
                return;
            }
            aberturaParaSalvar = aberturaMs;

            if (deveEnviarPrazo) {
                const prazoInput = !ordem && !ordemParaDuplicar && form.tipo !== "instalacao" && prazoPreset !== "personalizado"
                    ? msParaInput(aberturaMs + Number(prazoPreset) * DIA_MS)
                    : form.dataLimiteSla;
                const prazoMs = inputParaMs(prazoInput);
                if (!prazoInput || Number.isNaN(prazoMs)) {
                    setErroLocal("Informe a data e hora de entrega da O.S.");
                    return;
                }
                const diasEntre = diferencaDiasCorridosNoFuso(aberturaInput, prazoInput);
                if (diasEntre === null || diasEntre < 1) {
                    setErroLocal("A data de entrega deve ser pelo menos um dia corrido posterior à data de abertura operacional.");
                    return;
                }
                if (form.tipo === "instalacao" && podeConfigurarPrazoInstalacao && diasEntre > 90) {
                    setErroLocal("O prazo de instalação não pode exceder 90 dias corridos.");
                    return;
                }
                prazoParaSalvar = prazoMs;
            }
        }

        setErroLocal(null);
        await onSave({
            titulo: form.titulo.trim(),
            tipo: form.tipo,
            descricao: form.descricao.trim(),
            cliente_id: form.clienteId,
            departamento_id: form.departamentoId,
            projeto_id: form.projetoId,
            anterior_id: ordem?.anterior_id ?? null,
            criticidade: form.criticidade,
            ...(!cadastroAntigaAtivo && aberturaParaSalvar !== null
                ? { data_criacao: new Date(aberturaParaSalvar).toISOString() }
                : {}),
            ...(prazoParaSalvar !== null
                ? { data_limite_sla: new Date(prazoParaSalvar).toISOString() }
                : {}),
            ...montarDadosAntiga(),
        });
    }

    if (!aberto) return null;

    return (
        <div
            className="ordem-modal-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !salvando) onClose();
            }}
        >
            <section className="ordem-modal" role="dialog" aria-modal="true" aria-labelledby="ordem-form-titulo">
                <header className="ordem-modal-header">
                    <div>
                        <span className="ordem-card-id">
                            {ordem ? `OS #${ordem.id}` : ordemParaDuplicar ? `Nova O.S. baseada na #${ordemParaDuplicar.id}` : "Nova solicitação"}
                        </span>
                        <h2 id="ordem-form-titulo">
                            {ordem ? "Editar ordem de serviço" : "Cadastrar ordem de serviço"}
                        </h2>
                        {ordemParaDuplicar && (
                            <p className="ordem-form-note">
                                Identificador, responsável, status, conclusão, auditoria e histórico operacional não serão copiados.
                            </p>
                        )}
                    </div>
                    <button type="button" className="ordem-modal-close" onClick={onClose} disabled={salvando} aria-label="Fechar formulário">×</button>
                </header>

                <form onSubmit={handleSubmit} aria-busy={salvando}>
                    <div className="ordem-modal-body ordem-form">
                        {(erroLocal || erro) && (
                            <div className="ordens-feedback ordens-feedback--error" role="alert">
                                {erroLocal || erro}
                            </div>
                        )}
                        {ordemParaDuplicar && prazoOriginalDescartado && (
                            <div className="ordens-feedback ordens-feedback--aviso" role="status">
                                O prazo da O.S. original não pôde ser reaproveitado. Informe um prazo válido.
                            </div>
                        )}
                        {ordemParaDuplicar && relacoesOriginaisIndisponiveis && (
                            <div className="ordens-feedback ordens-feedback--aviso" role="status">
                                Algumas relações da O.S. original não estão disponíveis. Revise cliente, departamento e projeto.
                            </div>
                        )}

                        <div className="ordem-form-grid">
                            <div className="ordem-form-field ordem-form-field--wide">
                                <label htmlFor="os-titulo">Título *</label>
                                <input id="os-titulo" type="text" value={form.titulo} onChange={(event) => atualizarCampo("titulo", event.target.value)} maxLength={60} required />
                            </div>

                            {!cadastroAntigaAtivo && (
                                <div className="ordem-form-field">
                                    <label htmlFor="os-data-abertura">Data de abertura *</label>
                                    <input
                                        id="os-data-abertura"
                                        type="datetime-local"
                                        value={form.dataAbertura}
                                        min={!ordem && !ordemParaDuplicar ? msParaInput(referenciaAbertura) : undefined}
                                        onChange={(event) => {
                                            const novaAbertura = event.target.value;
                                            atualizarCampo("dataAbertura", novaAbertura);
                                            setDataAberturaAlterada(true);
                                            if (!ordem && !ordemParaDuplicar && prazoPreset !== "personalizado" && novaAbertura) {
                                                const aberturaMs = inputParaMs(novaAbertura);
                                                if (!Number.isNaN(aberturaMs)) {
                                                    atualizarCampo("dataLimiteSla", msParaInput(aberturaMs + Number(prazoPreset) * DIA_MS));
                                                }
                                            }
                                        }}
                                        readOnly={Boolean(ordem)}
                                        disabled={salvando}
                                        required
                                    />
                                    <small className="ordem-form-note">
                                        {ordem
                                            ? "Somente leitura: a data original não pode ser alterada."
                                            : "Prévia da abertura operacional. Após 17h, o sistema considera o próximo dia às 08h, conforme as regras do backend."}
                                    </small>
                                </div>
                            )}

                            <div className="ordem-form-field">
                                <label htmlFor="os-tipo">Tipo *</label>
                                <Autocomplete id="os-tipo" options={TIPOS} value={form.tipo} onChange={(valor) => atualizarCampo("tipo", valor as TipoOrdemServico | null)} placeholder="Selecione o tipo" />
                            </div>

                            <div className="ordem-form-field">
                                <label htmlFor="os-criticidade">Criticidade</label>
                                <Autocomplete id="os-criticidade" options={CRITICIDADES} value={form.criticidade} onChange={(valor) => atualizarCampo("criticidade", valor as NivelCriticidade | null)} placeholder="Selecione a criticidade" clearable />
                            </div>

                            {!cadastroAntigaAtivo && form.tipo !== "instalacao" && !ordem && !ordemParaDuplicar && (
                                <div className="ordem-form-field">
                                    <label htmlFor="os-prazo-preset">Prazo predefinido (dias corridos)</label>
                                    <select
                                        id="os-prazo-preset"
                                        value={prazoPreset}
                                        onChange={(event) => {
                                            const valor = event.target.value;
                                            setPrazoPreset(valor);
                                            if (valor !== "personalizado") {
                                                const aberturaMs = inputParaMs(form.dataAbertura);
                                                if (!Number.isNaN(aberturaMs)) atualizarCampo("dataLimiteSla", msParaInput(aberturaMs + Number(valor) * DIA_MS));
                                            }
                                        }}
                                        disabled={salvando}
                                    >
                                        <option value="1">1 dia corrido</option>
                                        <option value="2">2 dias corridos</option>
                                        <option value="3">3 dias corridos</option>
                                        <option value="5">5 dias corridos (padrão)</option>
                                        <option value="7">7 dias corridos</option>
                                        <option value="personalizado">Personalizado</option>
                                    </select>
                                </div>
                            )}

                            {!cadastroAntigaAtivo && (
                                <div className="ordem-form-field">
                                    <label htmlFor="os-data-prazo">Data e hora de entrega {form.tipo === "instalacao" && !podeConfigurarPrazoInstalacao ? "(definida pelo sistema)" : "*"}</label>
                                    <input
                                        id="os-data-prazo"
                                        type="datetime-local"
                                        value={form.dataLimiteSla}
                                        min={form.dataAbertura || undefined}
                                        max={form.tipo === "instalacao" && podeConfigurarPrazoInstalacao && aberturaEfetivaMs > 0 ? msParaInput(aberturaEfetivaMs + 90 * DIA_MS) : undefined}
                                        required={form.tipo !== "instalacao" || podeConfigurarPrazoInstalacao}
                                        onChange={(event) => {
                                            atualizarCampo("dataLimiteSla", event.target.value);
                                            setPrazoPreset("personalizado");
                                            if (event.target.value) setPrazoOriginalDescartado(false);
                                        }}
                                        disabled={salvando || (form.tipo === "instalacao" && !podeConfigurarPrazoInstalacao)}
                                        aria-invalid={prazoNaoPosteriorAbertura}
                                    />
                                    <small className="ordem-form-note">
                                        {form.tipo === "instalacao"
                                            ? "A configuração do prazo de instalação é restrita a usuários autorizados e limitada a 90 dias corridos."
                                            : "A entrega deve ocorrer pelo menos um dia corrido após a abertura. Fins de semana são contados."}
                                    </small>
                                    {prazoNaoPosteriorAbertura && (
                                        <p className="ordens-feedback ordens-feedback--error" role="alert">
                                            A data de entrega deve ser pelo menos um dia corrido posterior à abertura operacional.
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="ordem-form-field">
                                <label htmlFor="os-cliente">Cliente *</label>
                                <Autocomplete id="os-cliente" options={clienteOptions} value={form.clienteId} onChange={(valor) => atualizarCampo("clienteId", valor === null ? null : Number(valor))} placeholder="Buscar cliente..." />
                            </div>

                            <div className="ordem-form-field">
                                <label htmlFor="os-departamento">Departamento *</label>
                                <Autocomplete id="os-departamento" options={departamentoOptions} value={form.departamentoId} onChange={(valor) => atualizarCampo("departamentoId", valor === null ? null : Number(valor))} placeholder="Buscar departamento..." />
                            </div>

                            <div className="ordem-form-field ordem-form-field--wide">
                                <label htmlFor="os-projeto">Projeto</label>
                                <Autocomplete
                                    id="os-projeto"
                                    options={projetoOptions}
                                    value={form.projetoId}
                                    onChange={(valor) => atualizarCampo("projetoId", valor === null ? null : Number(valor))}
                                    placeholder={form.clienteId === null ? "Selecione um cliente primeiro" : "Buscar projeto do cliente..."}
                                    disabled={form.clienteId === null}
                                    loading={carregandoOpcoes}
                                    loadingMessage="Carregando projetos..."
                                    emptyMessage="Nenhum projeto ativo disponível para este cliente."
                                    clearable
                                />
                            </div>

                            <div className="ordem-form-field ordem-form-field--wide">
                                <label htmlFor="os-descricao">Descrição *</label>
                                <textarea id="os-descricao" value={form.descricao} onChange={(event) => atualizarCampo("descricao", event.target.value)} rows={5} maxLength={1000} required />
                            </div>

                            {exibirCadastroAntiga && (
                                <fieldset className="ordem-form-field--wide ordem-form-antiga">
                                    <legend className="ordem-form-antiga-legenda">O.S. antiga / existente</legend>
                                    <label className="ordem-form-check" htmlFor="os-antiga-ativo">
                                        <input id="os-antiga-ativo" type="checkbox" checked={antiga.ativo} onChange={(event) => atualizarCampoAntiga("ativo", event.target.checked)} disabled={salvando} />
                                        Cadastrar uma O.S. que já existia antes do sistema (migração manual)
                                    </label>
                                    {cadastroAntigaAtivo && (
                                        <div className="ordem-form-grid">
                                            <div className="ordem-form-field">
                                                <label htmlFor="os-antiga-abertura">Data de abertura *</label>
                                                <input id="os-antiga-abertura" type="datetime-local" value={antiga.dataAbertura} max={msParaInput(antiga.referencia)} onChange={(event) => atualizarCampoAntiga("dataAbertura", event.target.value)} required />
                                            </div>
                                            <div className="ordem-form-field">
                                                <label htmlFor="os-antiga-status">Status atual *</label>
                                                <Autocomplete id="os-antiga-status" options={STATUS_OPCOES} value={antiga.status} onChange={(valor) => atualizarCampoAntiga("status", (valor ?? "em_andamento") as StatusOrdemServico)} placeholder="Selecione o status" />
                                            </div>
                                            {aberturaNoPassado && (
                                                <div className="ordem-form-field--wide ordens-feedback ordens-feedback--aviso" role="status">
                                                    <strong>Atenção:</strong> a data de abertura informada é anterior à data atual. O SLA será calculado a partir dessa data e a O.S. pode ser cadastrada já vencida.
                                                </div>
                                            )}
                                            {antigaConcluida && (
                                                <>
                                                    <div className="ordem-form-field">
                                                        <label htmlFor="os-antiga-conclusao">Data de conclusão *</label>
                                                        <input id="os-antiga-conclusao" type="datetime-local" value={antiga.dataConclusao} min={antiga.dataAbertura || undefined} max={msParaInput(antiga.referencia)} onChange={(event) => atualizarCampoAntiga("dataConclusao", event.target.value)} required />
                                                    </div>
                                                    <div className="ordem-form-field ordem-form-field--wide">
                                                        <label htmlFor="os-antiga-parecer">Parecer técnico de conclusão *</label>
                                                        <textarea id="os-antiga-parecer" value={antiga.parecerTecnico} onChange={(event) => atualizarCampoAntiga("parecerTecnico", event.target.value)} rows={4} maxLength={1000} required />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </fieldset>
                            )}
                        </div>
                    </div>

                    <footer className="ordem-modal-actions">
                        <button type="button" className="ordens-btn-secondary" onClick={onClose} disabled={salvando}>Cancelar</button>
                        <button type="submit" className="ordens-btn-primary" disabled={salvando}>
                            {salvando ? "Salvando..." : ordem ? "Salvar alterações" : "Cadastrar O.S."}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}

export default OrdemServicoFormModal;