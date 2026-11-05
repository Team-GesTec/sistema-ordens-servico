/**
 * Steps BDD do cadastro de O.S. antiga/existente — migração manual (AJ-06).
 * Cobrem: gestor cadastrando com data de abertura passada, parecer obrigatório para concluída,
 * 403 para técnico, registro da origem na auditoria e presença da O.S. migrada na listagem.
 * Os steps de autenticação e de listagem são reaproveitados de atribuicao.steps.ts e crud.steps.ts.
 */
import { When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { prisma } from "../../src/prisma/client";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** Cabeçalho de autorização com o token guardado no login. */
const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

/** Data (ISO) de `dias` atrás. */
function diasAtras(dias: number): string {
    return new Date(Date.now() - dias * UM_DIA_MS).toISOString();
}

/** Envia o cadastro de uma O.S. antiga e guarda a resposta. */
async function cadastrarOSAntiga(world: CustomWorld, corpo: Record<string, unknown>) {
    const departamentoId = world.data.usuarioAutenticado?.funcionario?.departamento_id;
    assert.ok(departamentoId, "Departamento do usuário autenticado não encontrado");

    const payload = {
        tipo: "manutencao",
        departamento_id: departamentoId,
        titulo: "OS antiga de teste (AJ-06)",
        descricao: "OS cadastrada por migração manual para teste",
        ...corpo,
    };

    world.data.payloadMigracao = payload;
    world.response = await api
        .post("/ordens-servico")
        .set("Authorization", token(world))
        .send(payload);

    if (world.response.status === 201) {
        world.data.osId = world.response.body.id;
        world.data.os = world.response.body;
    }
}

// Cadastro
When(
    "o gestor cadastra uma O.S. antiga aberta há {int} dias com status {string}",
    async function (this: CustomWorld, dias: number, status: string) {
        await cadastrarOSAntiga(this, { data_criacao: diasAtras(dias), status });
    }
);

When(
    "o gestor cadastra uma O.S. antiga concluída sem parecer técnico",
    async function (this: CustomWorld) {
        await cadastrarOSAntiga(this, {
            data_criacao: diasAtras(30),
            status: "concluido",
            data_fim: diasAtras(10),
        });
    }
);

When(
    "o gestor cadastra uma O.S. antiga concluída com parecer técnico",
    async function (this: CustomWorld) {
        await cadastrarOSAntiga(this, {
            data_criacao: diasAtras(30),
            status: "concluido",
            data_fim: diasAtras(10),
            parecer_tecnico: "Serviço concluído antes da migração para o SGOS",
        });
    }
);

When(
    "o técnico tenta cadastrar uma O.S. antiga aberta há {int} dias",
    async function (this: CustomWorld, dias: number) {
        await cadastrarOSAntiga(this, { data_criacao: diasAtras(dias) });
    }
);

// Resultado
Then(
    "a API cadastra a O.S. antiga",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 201, JSON.stringify(this.response?.body));
        assert.ok(this.response?.body.id, "A O.S. criada deveria ter id");
    }
);

Then(
    "a API rejeita o cadastro da O.S. antiga",
    function (this: CustomWorld) {
        assert.ok(
            [400, 422].includes(this.response?.status ?? 0),
            `Esperava 400 ou 422, mas recebeu ${this.response?.status}: ${JSON.stringify(this.response?.body)}`
        );
    }
);

Then(
    "a O.S. antiga mantém a data de abertura informada",
    function (this: CustomWorld) {
        const enviada = new Date(this.data.payloadMigracao.data_criacao).getTime();
        const gravada = new Date(this.response?.body.data_criacao).getTime();
        assert.equal(gravada, enviada);
        assert.equal(this.response?.body.status, this.data.payloadMigracao.status);
    }
);

Then(
    "a O.S. antiga fica concluída com o parecer informado",
    function (this: CustomWorld) {
        assert.equal(this.response?.body.status, "concluido");
        assert.equal(this.response?.body.parecer_tecnico, this.data.payloadMigracao.parecer_tecnico);
        assert.equal(
            new Date(this.response?.body.data_fim).getTime(),
            new Date(this.data.payloadMigracao.data_fim).getTime()
        );
    }
);

Then(
    "a auditoria registra a O.S. como migração manual",
    async function (this: CustomWorld) {
        const auditoria = await prisma.auditoria.findFirst({
            where: {
                os_id: this.data.osId,
                acao: "insercao",
                campo_alterado: "origem",
            },
        });

        assert.ok(auditoria, "Registro de auditoria da migração não encontrado");
        assert.equal(auditoria.dado_novo, "migracao_manual");
        assert.equal(auditoria.funcionario_id, this.data.usuarioAutenticado?.funcionario?.id);
    }
);

Then(
    "a O.S. antiga aparece na listagem",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        const encontrada = this.response?.body.some(
            (ordem: { id: number }) => ordem.id === this.data.osId
        );
        assert.ok(encontrada, "A O.S. antiga não apareceu na listagem");
    }
);
