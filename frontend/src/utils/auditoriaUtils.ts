import type { HistoricoOrdemServico } from "../types/api";

const ROTULOS_CAMPO: Record<string, string> = {
    tipo: "Tipo",
    status: "Status",
    criticidade: "Criticidade",
    responsavel_id: "Responsável",
    solicitante_id: "Solicitante",
    departamento_id: "Departamento",
    cliente_id: "Cliente",
    projeto_id: "Projeto",
    ativo_id: "Local operacional",
    anterior_id: "O.S. anterior",
    data_criacao: "Data de abertura",
    data_inicio: "Data de início",
    data_fim: "Data de conclusão",
    data_limite_sla: "Prazo / SLA",
    sla_manual: "SLA manual",
    justificativa_sla_manual: "Justificativa do SLA",
    parecer_tecnico: "Parecer técnico",
    titulo: "Título",
    descricao: "Descrição",
    ativo: "Situação",
    anexo: "Anexo",
    origem: "Origem",
    apontamento_horas: "Horas",
};

const ROTULOS_VALOR: Record<string, string> = {
    em_andamento: "Em andamento",
    aguardando: "Aguardando",
    validacao_testes: "Validação de testes",
    bloqueado: "Bloqueado",
    concluido: "Concluído",
    baixo: "Baixa",
    medio: "Média",
    alto: "Alta",
    muito_alto: "Muito alta",
    urgente: "Urgente",
    instalacao: "Instalação",
    manutencao: "Manutenção",
    migracao_manual: "Migração manual",
    true: "Sim",
    false: "Não",
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}T/;

/** Formata um instante ISO como "dd/mm/aaaa hh:mm" (Brasília). */
export function formatarDataHoraAuditoria(valor: string): string {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "Data indisponível";
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(data).replace(",", "");
}

export function campoLegivel(campo: string | null): string {
    if (!campo) return "Registro";
    return ROTULOS_CAMPO[campo] ?? campo.replace(/_/g, " ").replace(/^./, (letra) => letra.toUpperCase());
}

export function valorLegivel(registro: Pick<HistoricoOrdemServico, "campo_alterado" | "tipo_evento">, valor: string | null): string {
    if (valor === null || valor === "") return "—";
    if (ROTULOS_VALOR[valor]) return ROTULOS_VALOR[valor];
    if (DATA_ISO.test(valor)) return formatarDataHoraAuditoria(valor);
    if (registro.tipo_evento === "anexo") {
        try {
            const anexo: unknown = JSON.parse(valor);
            if (anexo && typeof anexo === "object" && "nome" in anexo && typeof anexo.nome === "string") return anexo.nome;
        } catch {
            // valor não é JSON: exibe como veio
        }
    }
    if (registro.tipo_evento === "registro_horas" && /^\d+$/.test(valor)) {
        const minutos = Number(valor);
        return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
    }
    if (registro.campo_alterado?.endsWith("_id") && /^\d+$/.test(valor)) return `#${valor}`;
    return valor;
}

/** Indica se o registro mostra o par "anterior → novo" (alterações de campo). */
export function mostraValores(registro: HistoricoOrdemServico): boolean {
    return registro.tipo_evento !== "criacao" && registro.tipo_evento !== "anexo"
        && (registro.dado_antigo !== null || registro.dado_novo !== null);
}
