/**
 * Steps BDD para cálculo e acompanhamento do SLA.
 *
 * US#3.2-BE01: cálculo do estado do SLA.
 * 3.1-BE01: cálculo automático e personalizado do prazo do SLA.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { CustomWorld } from "../support/world";
import { calcularEstadoSla, type DadosSla } from "../../src/utils/estadoSla";

import { CustomWorld } from "../support/world";
import { api } from "../support/api";
import { prisma } from "../../src/prisma/client";

import {
    calcularEstadoSla,
    type DadosSla,
} from "../../src/utils/estadoSla";

import {
    ServiceSla,
    type FonteSla,
} from "../../src/services/serviceSla";

import { AppError } from "../../src/errors/AppError";
import type { nivel_criticidade } from "../../src/prisma/generated/client";

/** Estados que a API pode devolver no campo estado_sla. */
const ESTADOS_VALIDOS = [
    "sem_sla",
    "normal",
    "em_risco",
    "vencido",
    "encerrada",
];

/** Um dia em milissegundos. */
const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Valores iniciais do Documento Mestre: dias úteis por criticidade. */
const VALORES_INICIAIS: Record<string, number> = {
    baixo: 7,
    medio: 5,
    alto: 3,
    muito_alto: 2,
    urgente: 1,
};

/** Cabeçalho de autorização com o token guardado no login. */
const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

/**
 * Fonte de dados de teste: configuração e feriados armazenados
 * no World do cenário, sem depender do banco.
 */
function criarFonteDeTeste(world: CustomWorld): FonteSla {
    return {
        async buscarConfig(tipo, criticidade) {
            const prazo = world.data.configSla?.[criticidade];

            if (tipo !== "manutencao" || prazo === undefined) {
                return null;
            }

            return {
                id: 1,
                tipo,
                criticidade,
                prazo_dias_uteis: prazo,
            };
        },

        async listarFeriadosEntre(inicio, fim) {
            const feriados: string[] = world.data.feriados ?? [];

            return feriados.filter(
                (dia) => dia >= inicio && dia <= fim,
            );
        },
    };
}

/** Fim do dia no horário de Brasília, em milissegundos. */
const fimDoDia = (dia: string) =>
    new Date(`${dia}T23:59:59.999-03:00`).getTime();

/** Abre uma O.S. de instalação com a data limite informada. */
async function abrirInstalacao(
    world: CustomWorld,
    dataLimite: string,
) {
    world.data.dataLimiteEnviada = dataLimite;

    world.response = await api
        .post("/ordens-servico")
        .set("Authorization", token(world))
        .send({
            tipo: "instalacao",
            departamento_id:
                world.data.usuarioAutenticado?.funcionario?.departamento_id,
            titulo: "OS de instalação (3.1-BE01)",
            descricao: "OS criada para teste de SLA de instalação",
            data_limite_sla: dataLimite,
        });
}

/* ============================================================
 * US#3.2-BE01 — Estado do SLA
 * ============================================================ */

/** Prepara uma O.S. para testar o cálculo isolado do estado do SLA. */
Given(
    "uma O.S. do tipo {string} com status {string}, criada em {string} e com limite em {string}",
    function (
        this: CustomWorld,
        tipo: string,
        status: string,
        criacao: string,
        limite: string,
    ) {
        const ordem: DadosSla = {
            tipo,
            status,
            data_criacao: new Date(criacao),
            data_limite_sla:
                limite === "sem limite" ? null : new Date(limite),
        };

        this.data.ordemSla = ordem;
    },
);

When(
    "o estado do SLA é calculado em {string}",
    function (this: CustomWorld, agora: string) {
        this.data.estadoSla = calcularEstadoSla(
            this.data.ordemSla,
            new Date(agora),
        );
    },
);

Then(
    "o estado do SLA é {string}",
    function (this: CustomWorld, esperado: string) {
        assert.equal(this.data.estadoSla, esperado);
    },
);

/** Verifica o estado do SLA devolvido pela API. */
Then(
    "a resposta traz um estado de SLA válido",
    function (this: CustomWorld) {
        assert.equal(
            this.response?.status,
            200,
            JSON.stringify(this.response?.body),
        );

        assert.ok(
            ESTADOS_VALIDOS.includes(this.response?.body.estado_sla),
            `estado_sla inválido: ${this.response?.body.estado_sla}`,
        );
    },
);

/* ============================================================
 * 3.1-BE01 — Configuração do SLA para testes
 * ============================================================ */

Given(
    "a configuração de SLA de teste com os valores iniciais",
    function (this: CustomWorld) {
        this.data.configSla = { ...VALORES_INICIAIS };
        this.data.feriados = [];
    },
);

Given(
    "a configuração de SLA de teste sem a criticidade {string}",
    function (this: CustomWorld, criticidade: string) {
        const config = { ...VALORES_INICIAIS };

        delete config[criticidade];

        this.data.configSla = config;
        this.data.feriados = [];
    },
);

Given(
    "que o dia {string} está cadastrado como feriado",
    function (this: CustomWorld, dia: string) {
        this.data.feriados.push(dia);
    },
);

Given(
    "que a configuração da criticidade {string} passa a ser {int} dias úteis",
    function (
        this: CustomWorld,
        criticidade: string,
        dias: number,
    ) {
        this.data.configSla[criticidade] = dias;
    },
);

/* ============================================================
 * 3.1-BE01 — Cálculo automático e SLA personalizado
 * ============================================================ */

When(
    "o SLA de manutenção é calculado para a criticidade {string} com abertura em {string}",
    async function (
        this: CustomWorld,
        criticidade: string,
        abertura: string,
    ) {
        const service = new ServiceSla(criarFonteDeTeste(this));

        try {
            this.data.sla = await service.definirNaCriacao({
                tipo: "manutencao",
                criticidade: criticidade as nivel_criticidade,
                abertura: new Date(abertura),
                dataLimiteInformada: null,
                perfil: "gestor",
            });

            this.data.erroSla = undefined;
        } catch (erro) {
            this.data.erroSla = erro;
        }
    },
);

When(
    "o gestor define o SLA de instalação aberta em {string} com data limite {string}",
    async function (
        this: CustomWorld,
        abertura: string,
        dataLimite: string,
    ) {
        const service = new ServiceSla(criarFonteDeTeste(this));

        this.data.sla = await service.definirNaCriacao({
            tipo: "instalacao",
            criticidade: "medio",
            abertura: new Date(abertura),
            dataLimiteInformada: new Date(dataLimite),
            perfil: "gestor",
        });
    },
);

When(
    "o gestor define um prazo personalizado de {int} dias úteis com abertura em {string}",
    async function (
        this: CustomWorld,
        dias: number,
        abertura: string,
    ) {
        const service = new ServiceSla(criarFonteDeTeste(this));

        this.data.sla = await service.definirNaCriacao({
            tipo: "manutencao",
            criticidade: "medio",
            abertura: new Date(abertura),
            dataLimiteInformada: null,
            prazoDiasUteisPersonalizado: dias,
            perfil: "gestor",
        });
    },
);

When(
    "um técnico tenta definir um prazo personalizado de {int} dias úteis",
    async function (this: CustomWorld, dias: number) {
        const service = new ServiceSla(criarFonteDeTeste(this));

        try {
            this.data.sla = await service.definirNaCriacao({
                tipo: "manutencao",
                criticidade: "medio",
                abertura: new Date("2026-10-05T10:00:00-03:00"),
                dataLimiteInformada: null,
                prazoDiasUteisPersonalizado: dias,
                perfil: "tecnico",
            });

            this.data.erroSla = undefined;
        } catch (erro) {
            this.data.erroSla = erro;
        }
    },
);

When(
    "o gestor define uma data limite personalizada {string} com abertura em {string}",
    async function (
        this: CustomWorld,
        dataLimite: string,
        abertura: string,
    ) {
        const service = new ServiceSla(criarFonteDeTeste(this));

        this.data.sla = await service.definirNaCriacao({
            tipo: "manutencao",
            criticidade: "medio",
            abertura: new Date(abertura),
            dataLimiteInformada: new Date(dataLimite),
            perfil: "gestor",
        });
    },
);

When(
    "o gestor define dias úteis e data limite personalizada ao mesmo tempo",
    async function (this: CustomWorld) {
        const service = new ServiceSla(criarFonteDeTeste(this));

        try {
            this.data.sla = await service.definirNaCriacao({
                tipo: "manutencao",
                criticidade: "medio",
                abertura: new Date("2026-10-05T10:00:00-03:00"),
                dataLimiteInformada: new Date(
                    "2026-10-20T10:00:00-03:00",
                ),
                prazoDiasUteisPersonalizado: 5,
                perfil: "gestor",
            });

            this.data.erroSla = undefined;
        } catch (erro) {
            this.data.erroSla = erro;
        }
    },
);

/* ============================================================
 * 3.1-BE01 — Asserções de cálculo do SLA
 * ============================================================ */

Then(
    "a data limite do SLA é o fim do dia {string}",
    function (this: CustomWorld, dia: string) {
        assert.equal(
            this.data.erroSla,
            undefined,
            `O cálculo falhou: ${this.data.erroSla}`,
        );

        assert.equal(
            this.data.sla.data_limite_sla.getTime(),
            fimDoDia(dia),
        );

        assert.equal(this.data.sla.sla_manual, false);
    },
);

Then(
    "a data limite do SLA personalizado é o fim do dia {string}",
    function (this: CustomWorld, dia: string) {
        assert.equal(
            this.data.sla.data_limite_sla.getTime(),
            fimDoDia(dia),
        );
    },
);

Then(
    "a data limite do SLA é exatamente {string}",
    function (this: CustomWorld, dataLimite: string) {
        assert.equal(
            this.data.sla.data_limite_sla.getTime(),
            new Date(dataLimite).getTime(),
        );
    },
);

Then(
    "o SLA não é manual",
    function (this: CustomWorld) {
        assert.equal(this.data.sla.sla_manual, false);
    },
);

Then(
    "o SLA é manual",
    function (this: CustomWorld) {
        assert.equal(this.data.sla.sla_manual, true);
    },
);

Then(
    "o cálculo do SLA é rejeitado com status {int}",
    function (this: CustomWorld, status: number) {
        assert.ok(
            this.data.erroSla instanceof AppError,
            "Esperava um AppError",
        );

        assert.equal(this.data.erroSla.statusCode, status);
    },
);

Then(
    "o cálculo do SLA é negado com status {int}",
    function (this: CustomWorld, status: number) {
        assert.ok(
            this.data.erroSla instanceof AppError,
            "Esperava um AppError",
        );

        assert.equal(this.data.erroSla.statusCode, status);
    },
);

/* ============================================================
 * 3.1-BE01 — Cenários de API
 * ============================================================ */

When(
    "o gestor abre uma O.S. de manutenção com criticidade {string}",
    async function (this: CustomWorld, criticidade: string) {
        this.response = await api
            .post("/ordens-servico")
            .set("Authorization", token(this))
            .send({
                tipo: "manutencao",
                criticidade,
                departamento_id:
                    this.data.usuarioAutenticado?.funcionario
                        ?.departamento_id,
                titulo: "OS de manutenção (3.1-BE01)",
                descricao: "OS criada para teste do cálculo de SLA",
            });

        if (this.response.status === 201) {
            this.data.osId = this.response.body.id;
        }
    },
);

When(
    "abre uma O.S. de instalação com data limite daqui a {int} dias",
    async function (this: CustomWorld, dias: number) {
        await abrirInstalacao(
            this,
            new Date(Date.now() + dias * UM_DIA_MS).toISOString(),
        );
    },
);

When(
    "abre uma O.S. de instalação com data limite {string}",
    async function (this: CustomWorld, dataLimite: string) {
        await abrirInstalacao(this, dataLimite);
    },
);

Then(
    "a API devolve a O.S. com o SLA calculado e sla_manual falso",
    function (this: CustomWorld) {
        assert.equal(
            this.response?.status,
            201,
            `${JSON.stringify(this.response?.body)} — se a mensagem falar de configuração de SLA, rode "npm run db:seed"`,
        );

        const ordem = this.response?.body;

        assert.ok(
            ordem.data_limite_sla,
            "data_limite_sla deveria vir preenchida",
        );

        assert.equal(ordem.sla_manual, false);

        assert.ok(
            ordem.sla_config_id,
            "sla_config_id deveria vir preenchido",
        );

        assert.ok(
            new Date(ordem.data_limite_sla).getTime() >
                new Date(ordem.data_criacao).getTime(),
            "A data limite deveria ser posterior à abertura",
        );
    },
);

Then(
    "a auditoria registra a definição inicial do SLA",
    async function (this: CustomWorld) {
        const auditoria = await prisma.auditoria.findFirst({
            where: {
                os_id: this.data.osId,
                acao: "insercao",
                campo_alterado: "data_limite_sla",
            },
        });

        assert.ok(
            auditoria,
            "Registro de auditoria do SLA não encontrado",
        );

        assert.equal(
            new Date(auditoria.dado_novo ?? "").getTime(),
            new Date(
                this.response?.body.data_limite_sla,
            ).getTime(),
        );

        assert.equal(
            auditoria.funcionario_id,
            this.data.usuarioAutenticado?.funcionario?.id,
        );
    },
);

Then(
    "a API rejeita a O.S. com status {int}",
    function (this: CustomWorld, status: number) {
        assert.equal(
            this.response?.status,
            status,
            JSON.stringify(this.response?.body),
        );
    },
);

Then(
    "a API devolve a O.S. com a data limite informada e sla_manual falso",
    function (this: CustomWorld) {
        assert.equal(
            this.response?.status,
            201,
            JSON.stringify(this.response?.body),
        );

        assert.equal(
            new Date(
                this.response?.body.data_limite_sla,
            ).getTime(),
            new Date(
                this.data.dataLimiteEnviada,
            ).getTime(),
        );

        assert.equal(
            this.response?.body.sla_manual,
            false,
        );
    },
);