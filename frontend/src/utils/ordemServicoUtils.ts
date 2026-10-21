import type {
    NivelCriticidade,
    OrdemServico,
    StatusOrdemServico,
    TipoOrdemServico,
} from "../types/api";

export type FiltroStatusOrdem = StatusOrdemServico | "todos";

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
    ];

    return campos.some((campo) =>
        normalizarTexto(campo).includes(termo),
    );
}