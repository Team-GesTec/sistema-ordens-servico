/**
 * services/serviceSla.ts
 *
 * Regras do cálculo automático do SLA na abertura da O.S. (US#3.1 — 3.1-BE01).
 *
 * Manutenção/Suporte:
 *  - Data Limite = Abertura + Dias Úteis Base (tabela `sla_config`) + Tolerância;
 *  - Tolerância: aberta às 16:00 ou depois (horário de Brasília) soma +1 dia útil;
 *  - dias úteis pulam sábados, domingos e os dias da tabela `feriados` (PE-09);
 *  - o prazo termina às 23:59:59.999 do último dia útil, no horário de Brasília (provisório até PE-06);
 *  - gestores podem definir um prazo personalizado por dias úteis ou por data;
 *  - sem prazo personalizado, a data limite é calculada pela configuração;
 *  - sem configuração para a criticidade → 422.
 *
 * Instalação:
 *  - não há cálculo automático nem tolerância das 16:00;
 *  - a data limite é a informada pelo Gestor (Técnico que informa → 403);
 *  - a data limite deve ser posterior à abertura e no máximo 3 meses depois dela (PE-07) → 422.
 *
 * A base é sempre a data de abertura gravada na O.S. — inclusive a data passada de uma O.S. antiga
 * (AJ-06 / PE-08) — e nunca a data/hora atual do servidor. O resultado é sempre `sla_manual = false`.
 */

import { AppError } from '../errors/AppError';
import { repositorySla, type RepositorySla } from '../repositories/repositorySla';
import type { nivel_criticidade, tipo_ordem_servico } from '../prisma/generated/client';
import type { PerfilFuncionario } from '../models/modelFuncionario';
import {
    type DefinicaoSla,
    FUSO_SLA,
    HORA_CORTE_TOLERANCIA,
    MESES_MAXIMOS_INSTALACAO,
    NIVEL_CRITICIDADE,
} from '../models/modelSla';
import { diaNoFuso, fimDoDiaNoFuso, partesNoFuso, somarDiasCorridos, somarDiasUteis } from '../utils/diasUteis';

/** Dados necessários para definir o SLA de uma O.S. que está sendo aberta. */
export interface EntradaDefinicaoSla {
    tipo: tipo_ordem_servico;
    criticidade: nivel_criticidade;
    /** Data de abertura (data_criacao) da O.S. */
    abertura: Date;
    /** Data limite enviada no corpo da requisição (só aceita para Instalação, pelo Gestor). */
    dataLimiteInformada: Date | null;
    /** Quantidade personalizada de dias úteis, aceita somente para gestores em manutenção. */
    prazoDiasUteisPersonalizado?: number | null;
    /** Perfil do usuário logado (vem do token). */
    perfil: PerfilFuncionario;
}

/** Resultado do cálculo de uma O.S. de Manutenção/Suporte. */
export interface CalculoManutencao {
    dataLimite: Date;
    /** Dia "AAAA-MM-DD" (horário de Brasília) em que o prazo termina. */
    diaLimite: string;
    /** Total de dias úteis somados (base + tolerância). */
    diasUteis: number;
    tolerancia: boolean;
}

/** Leitura usada pelo service: permite trocar o repositório nos testes. */
export type FonteSla = Pick<RepositorySla, 'buscarConfig' | 'listarFeriadosEntre'>;

export class ServiceSla {
    private readonly repositorio: FonteSla;

    constructor(repositorio: FonteSla = repositorySla) {
        this.repositorio = repositorio;
    }

    /**
     * Define o SLA de uma O.S. no momento da abertura.
     * @throws AppError 400 se os dois formatos de prazo personalizado forem enviados juntos.
     * @throws AppError 403 se um não gestor informar um prazo personalizado.
     * @throws AppError 422 se faltar configuração de SLA ou a data de Instalação passar de 3 meses.
     */
    async definirNaCriacao(entrada: EntradaDefinicaoSla): Promise<DefinicaoSla> {
        if (entrada.tipo === 'instalacao') {
            if (entrada.prazoDiasUteisPersonalizado != null) {
                throw AppError.requisicaoInvalida(
                    'prazo_dias_uteis_custom só pode ser informado para O.S. de manutenção',
                );
            }
            return this.definirInstalacao(entrada);
        }
        return this.definirManutencao(entrada);
    }

    /**
     * Calcula a data limite de uma O.S. de Manutenção/Suporte.
     * @param abertura Data de abertura da O.S.
     * @param diasBase Dias úteis base da configuração.
     */
    async calcularManutencao(
        abertura: Date,
        diasBase: number,
        aplicarTolerancia = true,
    ): Promise<CalculoManutencao> {
        const tolerancia =
            aplicarTolerancia && partesNoFuso(abertura, FUSO_SLA).hora >= HORA_CORTE_TOLERANCIA;
        const diasUteis = diasBase + (tolerancia ? 1 : 0);
        const diaAbertura = diaNoFuso(abertura, FUSO_SLA);

        // Janela folgada de feriados: cada dia útil cabe em até 7 dias corridos, mais uma margem
        const fimDaJanela = somarDiasCorridos(diaAbertura, diasUteis * 7 + 60);
        const feriados = new Set(await this.repositorio.listarFeriadosEntre(diaAbertura, fimDaJanela));

        const diaLimite = somarDiasUteis(diaAbertura, diasUteis, feriados);
        return {
            dataLimite: fimDoDiaNoFuso(diaLimite, FUSO_SLA),
            diaLimite,
            diasUteis,
            tolerancia,
        };
    }

    private async definirManutencao(entrada: EntradaDefinicaoSla): Promise<DefinicaoSla> {
        const prazoPersonalizado = entrada.prazoDiasUteisPersonalizado ?? null;
        const dataLimitePersonalizada = entrada.dataLimiteInformada;

        if (prazoPersonalizado !== null && dataLimitePersonalizada !== null) {
            throw AppError.requisicaoInvalida(
                'Informe o prazo personalizado em dias úteis ou uma data limite, não ambos',
            );
        }

        if (prazoPersonalizado !== null || dataLimitePersonalizada !== null) {
            if (entrada.perfil !== 'gestor') {
                throw AppError.acessoNegado('Apenas o gestor pode definir um prazo personalizado para O.S. de manutenção');
            }

            if (prazoPersonalizado !== null) {
                if (!Number.isSafeInteger(prazoPersonalizado) || prazoPersonalizado <= 0) {
                    throw AppError.requisicaoInvalida('prazo_dias_uteis_custom deve ser um número inteiro positivo');
                }

                const calculo = await this.calcularManutencao(entrada.abertura, prazoPersonalizado, false);
                return {
                    data_limite_sla: calculo.dataLimite,
                    sla_manual: true,
                    sla_config_id: null,
                    prazo_dias_uteis: prazoPersonalizado,
                    descricao: `Prazo personalizado de ${prazoPersonalizado} dia(s) útil(eis) a partir da abertura em ${entrada.abertura.toISOString()}`,
                };
            }

            if (dataLimitePersonalizada === null) {
                throw AppError.requisicaoInvalida('Informe um prazo personalizado válido');
            }

            if (dataLimitePersonalizada.getTime() <= entrada.abertura.getTime()) {
                throw AppError.requisicaoInvalida('data_limite_sla deve ser posterior à data de abertura da O.S.');
            }

            return {
                data_limite_sla: dataLimitePersonalizada,
                sla_manual: true,
                sla_config_id: null,
                prazo_dias_uteis: null,
                descricao: `Data limite personalizada informada pelo gestor a partir da abertura em ${entrada.abertura.toISOString()}`,
            };
        }

        const nivel = NIVEL_CRITICIDADE[entrada.criticidade];
        const config = await this.repositorio.buscarConfig(entrada.tipo, entrada.criticidade);
        if (!config || config.prazo_dias_uteis === null) {
            throw new AppError(
                `Não há configuração de SLA para O.S. de manutenção com criticidade ${entrada.criticidade} (nível ${nivel}). ` +
                    'Cadastre o prazo na configuração de SLA antes de abrir a O.S.',
                422,
            );
        }

        const calculo = await this.calcularManutencao(entrada.abertura, config.prazo_dias_uteis);

        return {
            data_limite_sla: calculo.dataLimite,
            sla_manual: false,
            sla_config_id: config.id,
            prazo_dias_uteis: config.prazo_dias_uteis,
            descricao:
                `SLA calculado automaticamente: ${config.prazo_dias_uteis} dia(s) útil(eis) da criticidade ` +
                `${entrada.criticidade} (nível ${nivel})` +
                (calculo.tolerancia ? ' + 1 dia útil de tolerância (aberta às 16:00 ou depois)' : '') +
                ` a partir da abertura em ${entrada.abertura.toISOString()}`,
        };
    }

    private definirInstalacao(entrada: EntradaDefinicaoSla): DefinicaoSla {
        const dataLimite = entrada.dataLimiteInformada;

        if (dataLimite === null) {
            return { data_limite_sla: null, sla_manual: false, sla_config_id: null, prazo_dias_uteis: null, descricao: null };
        }

        if (entrada.perfil !== 'gestor') {
            throw AppError.acessoNegado('Apenas o gestor pode informar a data limite de uma O.S. de instalação');
        }

        if (dataLimite.getTime() <= entrada.abertura.getTime()) {
            throw AppError.requisicaoInvalida('data_limite_sla deve ser posterior à data de abertura da O.S.');
        }

        const limiteMaximo = new Date(entrada.abertura.getTime());
        limiteMaximo.setUTCMonth(limiteMaximo.getUTCMonth() + MESES_MAXIMOS_INSTALACAO);
        if (dataLimite.getTime() > limiteMaximo.getTime()) {
            throw new AppError(
                `data_limite_sla de O.S. de instalação não pode passar de ${MESES_MAXIMOS_INSTALACAO} meses após a abertura`,
                422,
            );
        }

        return {
            data_limite_sla: dataLimite,
            sla_manual: false,
            sla_config_id: null,
            prazo_dias_uteis: null,
            descricao: 'Data limite de O.S. de instalação informada pelo gestor (sem cálculo automático nem tolerância)',
        };
    }
}

/** Instância única usada pelo service de O.S. */
export const serviceSla = new ServiceSla();
