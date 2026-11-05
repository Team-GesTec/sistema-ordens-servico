/**
 * repositories/repositorySla.ts
 *
 * Acesso a dados do SLA (3.1-BE01): ÚNICO lugar que fala com `prisma.sla_config` e `prisma.feriados`.
 * Só leitura: os valores de configuração e os feriados são mantidos direto no banco (ou pelo seed).
 * Sem cache, para que uma alteração na configuração valha imediatamente para novas O.S.
 */

import { prisma } from '../prisma/client';
import type { nivel_criticidade, tipo_ordem_servico } from '../prisma/generated/client';
import type { SlaConfig } from '../models/modelSla';

export class RepositorySla {
    /** Busca a configuração de SLA do tipo + criticidade. Devolve `null` se não existir. */
    async buscarConfig(tipo: tipo_ordem_servico, criticidade: nivel_criticidade): Promise<SlaConfig | null> {
        return prisma.sla_config.findUnique({
            where: { tipo_criticidade: { tipo, criticidade } },
        });
    }

    /**
     * Lista os dias de feriado entre duas datas (inclusive), no formato "AAAA-MM-DD".
     * @param inicio Dia inicial "AAAA-MM-DD".
     * @param fim Dia final "AAAA-MM-DD".
     */
    async listarFeriadosEntre(inicio: string, fim: string): Promise<string[]> {
        const feriados = await prisma.feriados.findMany({
            where: { data: { gte: new Date(`${inicio}T00:00:00.000Z`), lte: new Date(`${fim}T00:00:00.000Z`) } },
            select: { data: true },
        });
        // Colunas DATE chegam como meia-noite UTC: o dia do calendário são os 10 primeiros caracteres
        return feriados.map((feriado) => feriado.data.toISOString().slice(0, 10));
    }
}

/** Instância única usada pelos services. */
export const repositorySla = new RepositorySla();
