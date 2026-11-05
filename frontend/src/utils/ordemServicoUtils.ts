import type {
    NivelCriticidade,
    OrdemServico,
    StatusOrdemServico,
    TipoOrdemServico,
} from "../types/api";

export type FiltroStatusOrdem = StatusOrdemServico | "todos";
export type FiltroResponsavelOrdem = number | "todos" | "sem_responsavel";

export const STATUS_LABELS: Record<StatusOrdemServico, string> = {
    em_andamento: "Em andamento",
    aguardando: "Aguardando",
    validacao_testes: "Validação de testes",
    bloqueado: "Bloqueado",
    concluido: "Concluído",
};

export const TIPO_LABELS: Record<TipoOrdemServico, string> = {
    instalacao: "Instalação",
    manutencao: "Manutenção",
};

export const CRITICIDADE_LABELS: Record<NivelCriticidade, string> = {
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    muito_alto: "Muito alto",
    urgente: "Urgente",
};

export function normalizarTexto(valor: string): string {
    return valor
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export function correspondeBuscaOrdem(
    ordem: OrdemServico,
    busca: string,
    textoResponsavel = "",
): boolean {
    const termo = normalizarTexto(busca);

    if (!termo) {
        return true;
    }
    const idSelecionado = termo.match(/^#(\d+)$/);

    if (idSelecionado) {
        return ordem.id === Number(idSelecionado[1]);
    }

    const campos = [
        String(ordem.id),
        ordem.titulo,
        ordem.descricao,
        TIPO_LABELS[ordem.tipo],
        STATUS_LABELS[ordem.status],
        String(ordem.cliente_id ?? ""),
        String(ordem.departamento_id),
        String(ordem.projeto_id ?? ""),
        String(ordem.responsavel_id ?? ""),
        ordem.criticidade
            ? CRITICIDADE_LABELS[ordem.criticidade]
            : "",
        textoResponsavel,
    ];

    return campos.some((campo) =>
        normalizarTexto(campo).includes(termo),
    );
}

/** Parse API dates safely. Date-only values are interpreted as local calendar dates. */
export function parseDataOrdem(valor: string | null | undefined): Date | null {
    if (!valor || typeof valor !== "string") return null;

    const somenteData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    if (somenteData) {
        const ano = Number(somenteData[1]);
        const mes = Number(somenteData[2]);
        const dia = Number(somenteData[3]);
        const data = new Date(ano, mes - 1, dia);
        if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
        return data;
    }

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
}

/** Returns a neutral label for missing/invalid dates and uses the browser's local timezone. */
export function formatarDataOrdem(
    valor: string | null | undefined,
    incluirHora = false,
): string {
    const data = parseDataOrdem(valor);
    if (!data) return "Não informado";

    return incluirHora
        ? data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
        : data.toLocaleDateString("pt-BR");
}

/** A deadline is overdue only while no completion is recorded and the deadline has passed. */
export function ordemEstaAtrasada(
    ordem: Pick<OrdemServico, "status" | "data_fim" | "data_limite_sla">,
    agora = Date.now(),
): boolean {
    if (ordem.status === "concluido" || ordem.data_fim) return false;
    const prazo = parseDataOrdem(ordem.data_limite_sla);
    return prazo !== null && prazo.getTime() < agora;
}