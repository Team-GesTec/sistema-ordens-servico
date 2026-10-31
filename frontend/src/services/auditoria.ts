import { apiRequest, ApiError } from "./api";
import { ordemServicoService } from "./ordemServico";
import type { OrdemServico, PerfilFuncionario } from "../types/api";

/** Forma efetivamente devolvida pelo GET /ordens-servico/:id/historico. */
export interface RegistroAuditoria {
    id: number;
    os_id: number;
    funcionario_id: number;
    data_modificacao: string;
    acao: "insercao" | "atualizacao" | "exclusao";
    campo_alterado: string | null;
    dado_antigo: string | null;
    dado_novo: string | null;
    justificativa: string | null;
    funcionarios: { nome: string };
}

export interface RegistroAuditoriaComOrdem extends RegistroAuditoria {
    ordem: Pick<OrdemServico, "id" | "titulo">;
}

export interface ResultadoAuditoria {
    registros: RegistroAuditoriaComOrdem[];
    ordensConsultadas: number;
    ordensComFalha: number[];
    falhaConsultaInativas: boolean;
}

export interface EscopoAuditoria {
    tipo: PerfilFuncionario | undefined;
    departamentoId: number | undefined;
}

/**
 * Agrega os históricos reais usando exclusivamente a rota já existente por O.S.
 * Como o backend não expõe um endpoint global de auditoria, as consultas são feitas
 * em lotes pequenos para limitar a concorrência e não sobrecarregar a API.
 */
export const auditoriaService = {
    async listarTodas(escopo: EscopoAuditoria): Promise<ResultadoAuditoria> {
        const ativas = await ordemServicoService.listar();
        let ordens = [...ativas];
        let falhaConsultaInativas = false;

        if (escopo.tipo === "gestor") {
            try {
                const inativas = await ordemServicoService.listarInativas();
                ordens = [...ordens, ...inativas];
            } catch (error) {
                if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
                // A lista de OS ativas continua útil; a página sinaliza a consulta parcial.
                falhaConsultaInativas = true;
            }
        }

        // Reproduz o escopo de visualização já usado no dashboard: gestor vê tudo;
        // demais perfis veem somente as ordens do próprio departamento.
        if (escopo.tipo !== "gestor") {
            ordens = ordens.filter((ordem) => ordem.departamento_id === escopo.departamentoId);
        }

        const unicas = Array.from(new Map(ordens.map((ordem) => [ordem.id, ordem])).values());
        const registros: RegistroAuditoriaComOrdem[] = [];
        const ordensComFalha: number[] = [];
        const tamanhoLote = 5;

        for (let inicio = 0; inicio < unicas.length; inicio += tamanhoLote) {
            const lote = unicas.slice(inicio, inicio + tamanhoLote);
            const resultados = await Promise.all(
                lote.map(async (ordem) => {
                    try {
                        const historico = await apiRequest<RegistroAuditoria[]>(
                            `/ordens-servico/${ordem.id}/historico`,
                        );
                        return { ordem, historico, falhou: false };
                    } catch (error) {
                        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) throw error;
                        return { ordem, historico: [] as RegistroAuditoria[], falhou: true };
                    }
                }),
            );

            resultados.forEach(({ ordem, historico, falhou }) => {
                if (falhou) {
                    ordensComFalha.push(ordem.id);
                    return;
                }
                historico.forEach((registro) => {
                    registros.push({
                        ...registro,
                        ordem: { id: ordem.id, titulo: ordem.titulo },
                    });
                });
            });
        }

        registros.sort(
            (a, b) => new Date(b.data_modificacao).getTime() - new Date(a.data_modificacao).getTime(),
        );

        return {
            registros,
            ordensConsultadas: unicas.length,
            ordensComFalha,
            falhaConsultaInativas,
        };
    },
};
