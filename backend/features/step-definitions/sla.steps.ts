/**
 * Steps BDD do cálculo automático do SLA (3.1-BE01).
 * Os cenários de cálculo instanciam o ServiceSla com uma fonte de dados de teste (configuração e
 * feriados em memória), sem banco. Os cenários de API usam o endpoint real de abertura de O.S.
 * Os steps de autenticação e de 403 são reaproveitados de atribuicao.steps.ts.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { prisma } from "../../src/prisma/client";
import { ServiceSla, type FonteSla } from "../../src/services/serviceSla";
import { AppError } from "../../src/errors/AppError";
import type { nivel_criticidade } from "../../src/prisma/generated/client";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Valores iniciais do Documento Mestre (dias úteis por criticidade). */
const VALORES_INICIAIS: Record<string, number> = {
    baixo: 7,
    medio: 5,
    alto: 3,
    muito_alto: 2,
    urgente: 1,
};

/** Cabeçalho de autorização com o token guardado no login. */
const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

/** Fonte de dados de teste: configuração e feriados guardados no World do cenário. */
function criarFonteDeTeste(world: CustomWorld): FonteSla {
    return {
        async buscarConfig(tipo, criticidade) {
            const prazo = world.data.configSla?.[criticidade];
            if (tipo !== "manutencao" || prazo === undefined) {
                return null;
            }
            return { id: 1, tipo, criticidade, prazo_dias_uteis: prazo };
        },
        async listarFeriadosEntre(inicio, fim) {
            const feriados: string[] = world.data.feriados ?? [];
            return feriados.filter((dia) => dia >= inicio && dia <= fim);
        },
    };
}

/** Fim do dia (23:59:59.999) no horário de Brasília, em milissegundos. */
const fimDoDia = (dia: string) => new Date(`${dia}T23:59:59.999-03:00`).getTime();

/** Abre uma O.S. de instalação com a data limite informada e guarda a resposta. */
async function abrirInstalacao(world: CustomWorld, dataLimite: string) {
    world.data.dataLimiteEnviada = dataLimite;
    world.response = await api
        .post("/ordens-servico")
        .set("Authorization", token(world))
        .send({
            tipo: "instalacao",
            departamento_id: world.data.usuarioAutenticado?.funcionario?.departamento_id,
            titulo: "OS de instalação (3.1-BE01)",
            descricao: "OS criada para teste de SLA de instalação",
            data_limite_sla: dataLimite,
        });
}

// Configuração de teste
Given(
    "a configuração de SLA de teste com os valores iniciais",
    function (this: CustomWorld) {
        this.data.configSla = { ...VALORES_INICIAIS };
        this.data.feriados = [];
    }
);

Given(
    "a configuração de SLA de teste sem a criticidade {string}",
    function (this: CustomWorld, criticidade: string) {
        const config = { ...VALORES_INICIAIS };
        delete config[criticidade];
        this.data.configSla = config;
        this.data.feriados = [];
    }
);

Given(
    "que o dia {string} está cadastrado como feriado",
    function (this: CustomWorld, dia: string) {
        this.data.feriados.push(dia);
    }
);

Given(
    "que a configuração da criticidade {string} passa a ser {int} dias úteis",
    function (this: CustomWorld, criticidade: string, dias: number) {
        this.data.configSla[criticidade] = dias;
    }
);

// Cálculo
When(
    "o SLA de manutenção é calculado para a criticidade {string} com abertura em {string}",
    async function (this: CustomWorld, criticidade: string, abertura: string) {
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
    }
);

When(
    "o gestor define o SLA de instalação aberta em {string} com data limite {string}",
    async function (this: CustomWorld, abertura: string, dataLimite: string) {
        const service = new ServiceSla(criarFonteDeTeste(this));
        this.data.sla = await service.definirNaCriacao({
            tipo: "instalacao",
            criticidade: "medio",
            abertura: new Date(abertura),
            dataLimiteInformada: new Date(dataLimite),
            perfil: "gestor",
        });
    }
);

When(
    "o gestor define um prazo personalizado de {int} dias úteis com abertura em {string}",
    async function (this: CustomWorld, dias: number, abertura: string) {
        const service = new ServiceSla(criarFonteDeTeste(this));
        this.data.sla = await service.definirNaCriacao({
            tipo: "manutencao",
            criticidade: "medio",
            abertura: new Date(abertura),
            dataLimiteInformada: null,
            prazoDiasUteisPersonalizado: dias,
            perfil: "gestor",
        });
    }
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
    }
);

When(
    "o gestor define uma data limite personalizada {string} com abertura em {string}",
    async function (this: CustomWorld, dataLimite: string, abertura: string) {
        const service = new ServiceSla(criarFonteDeTeste(this));
        this.data.sla = await service.definirNaCriacao({
            tipo: "manutencao",
            criticidade: "medio",
            abertura: new Date(abertura),
            dataLimiteInformada: new Date(dataLimite),
            perfil: "gestor",
        });
    }
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
                dataLimiteInformada: new Date("2026-10-20T10:00:00-03:00"),
                prazoDiasUteisPersonalizado: 5,
                perfil: "gestor",
            });
            this.data.erroSla = undefined;
        } catch (erro) {
            this.data.erroSla = erro;
        }
    }
);

Then(
    "a data limite do SLA é o fim do dia {string}",
    function (this: CustomWorld, dia: string) {
        assert.equal(this.data.erroSla, undefined, `O cálculo falhou: ${this.data.erroSla}`);
        assert.equal(this.data.sla.data_limite_sla.getTime(), fimDoDia(dia));
        assert.equal(this.data.sla.sla_manual, false);
    }
);

Then(
    "a data limite do SLA personalizado é o fim do dia {string}",
    function (this: CustomWorld, dia: string) {
        assert.equal(this.data.sla.data_limite_sla.getTime(), fimDoDia(dia));
    }
);

Then(
    "a data limite do SLA é exatamente {string}",
    function (this: CustomWorld, dataLimite: string) {
        assert.equal(this.data.sla.data_limite_sla.getTime(), new Date(dataLimite).getTime());
    }
);

Then(
    "o SLA não é manual",
    function (this: CustomWorld) {
        assert.equal(this.data.sla.sla_manual, false);
    }
);

Then(
    "o SLA é manual",
    function (this: CustomWorld) {
        assert.equal(this.data.sla.sla_manual, true);
    }
);

Then(
    "o cálculo do SLA é rejeitado com status {int}",
    function (this: CustomWorld, status: number) {
        assert.ok(this.data.erroSla instanceof AppError, "Esperava um AppError");
        assert.equal(this.data.erroSla.statusCode, status);
    }
);

Then(
    "o cálculo do SLA é negado com status {int}",
    function (this: CustomWorld, status: number) {
        assert.ok(this.data.erroSla instanceof AppError, "Esperava um AppError");
        assert.equal(this.data.erroSla.statusCode, status);
    }
);

// API
When(
    "o gestor abre uma O.S. de manutenção com criticidade {string}",
    async function (this: CustomWorld, criticidade: string) {
        this.response = await api
            .post("/ordens-servico")
            .set("Authorization", token(this))
            .send({
                tipo: "manutencao",
                criticidade,
                departamento_id: this.data.usuarioAutenticado?.funcionario?.departamento_id,
                titulo: "OS de manutenção (3.1-BE01)",
                descricao: "OS criada para teste do cálculo de SLA",
            });

        if (this.response.status === 201) {
            this.data.osId = this.response.body.id;
        }
    }
);

When(
    "abre uma O.S. de instalação com data limite daqui a {int} dias",
    async function (this: CustomWorld, dias: number) {
        await abrirInstalacao(this, new Date(Date.now() + dias * UM_DIA_MS).toISOString());
    }
);

When(
    "abre uma O.S. de instalação com data limite {string}",
    async function (this: CustomWorld, dataLimite: string) {
        await abrirInstalacao(this, dataLimite);
    }
);

Then(
    "a API devolve a O.S. com o SLA calculado e sla_manual falso",
    function (this: CustomWorld) {
        assert.equal(
            this.response?.status,
            201,
            `${JSON.stringify(this.response?.body)} — se a mensagem falar de configuração de SLA, rode "npm run db:seed"`
        );
        const ordem = this.response?.body;
        assert.ok(ordem.data_limite_sla, "data_limite_sla deveria vir preenchida");
        assert.equal(ordem.sla_manual, false);
        assert.ok(ordem.sla_config_id, "sla_config_id deveria vir preenchido");
        assert.ok(
            new Date(ordem.data_limite_sla).getTime() > new Date(ordem.data_criacao).getTime(),
            "A data limite deveria ser posterior à abertura"
        );
    }
);

Then(
    "a auditoria registra a definição inicial do SLA",
    async function (this: CustomWorld) {
        const auditoria = await prisma.auditoria.findFirst({
            where: { os_id: this.data.osId, acao: "insercao", campo_alterado: "data_limite_sla" },
        });

        assert.ok(auditoria, "Registro de auditoria do SLA não encontrado");
        assert.equal(
            new Date(auditoria.dado_novo ?? "").getTime(),
            new Date(this.response?.body.data_limite_sla).getTime()
        );
        assert.equal(auditoria.funcionario_id, this.data.usuarioAutenticado?.funcionario?.id);
    }
);

Then(
    "a API rejeita a O.S. com status {int}",
    function (this: CustomWorld, status: number) {
        assert.equal(this.response?.status, status, JSON.stringify(this.response?.body));
    }
);

Then(
    "a API devolve a O.S. com a data limite informada e sla_manual falso",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 201, JSON.stringify(this.response?.body));
        assert.equal(
            new Date(this.response?.body.data_limite_sla).getTime(),
            new Date(this.data.dataLimiteEnviada).getTime()
        );
        assert.equal(this.response?.body.sla_manual, false);
    }
);
