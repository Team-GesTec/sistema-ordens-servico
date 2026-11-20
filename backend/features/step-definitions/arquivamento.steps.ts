/**
 * Steps do arquivamento automático de O.S. (US#2.11).
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import express from "express";
import request from "supertest";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { serviceOrdemServico } from "../../src/services/serviceOrdemServico";
import routerOrdemServico from "../../src/routes/routeOrdemServico";
import { tratarErros } from "../../src/middlewares/errorMiddleware";
import type { Funcionario } from "../../src/models/modelFuncionario";

const UM_DIA_MS = 24 * 60 * 60 * 1000;

const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

const diasAtras = (dias: number) => new Date(Date.now() - dias * UM_DIA_MS).toISOString();

async function cadastrar(world: CustomWorld, corpo: Record<string, unknown>) {
    const departamentoId = world.data.usuarioAutenticado?.funcionario?.departamento_id;
    assert.ok(departamentoId, "Departamento do usuário autenticado não encontrado");

    const resposta = await api
        .post("/ordens-servico")
        .set("Authorization", token(world))
        .send({
            tipo: "manutencao",
            departamento_id: departamentoId,
            titulo: "OS de teste (US#2.11 arquivamento)",
            descricao: "O.S. criada pelos testes de arquivamento automático",
            data_criacao: diasAtras(30),
            ...corpo,
        });
    assert.equal(resposta.status, 201, `Falha ao cadastrar O.S.: ${JSON.stringify(resposta.body)}`);
    world.data.osId = resposta.body.id;
}

async function buscarOS(world: CustomWorld) {
    const resposta = await api.get(`/ordens-servico/${world.data.osId}`).set("Authorization", token(world));
    assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
    return resposta.body;
}

async function idsListados(world: CustomWorld, consulta = ""): Promise<number[]> {
    const resposta = await api.get(`/ordens-servico${consulta}`).set("Authorization", token(world));
    assert.equal(resposta.status, 200, JSON.stringify(resposta.body));
    return (resposta.body as Array<{ id: number }>).map((ordem) => ordem.id);
}

// Preparação
Given("existe uma O.S. concluída há {int} dias", async function (this: CustomWorld, dias: number) {
    await cadastrar(this, {
        status: "concluido",
        data_fim: diasAtras(dias),
        parecer_tecnico: "Serviço concluído (teste de arquivamento)",
    });
});

Given("existe uma O.S. em andamento aberta há {int} dias", async function (this: CustomWorld, dias: number) {
    await cadastrar(this, { status: "em_andamento", data_criacao: diasAtras(dias) });
});

Given("os dados complementares da O.S. são guardados", async function (this: CustomWorld) {
    const ordem = await buscarOS(this);
    const horas = await api.get(`/ordens-servico/${this.data.osId}/horas`).set("Authorization", token(this));
    assert.equal(horas.status, 200, JSON.stringify(horas.body));
    this.data.antes = { parecer: ordem.parecer_tecnico, dataFim: ordem.data_fim, horas: horas.body };
});

// Rotina
When("a rotina de arquivamento é executada", async function (this: CustomWorld) {
    await serviceOrdemServico.arquivarConcluidas({ somenteIds: [this.data.osId] });
    this.data.arquivadaEm = (await buscarOS(this)).arquivada_em;
});

When("a rotina de arquivamento é executada novamente", async function (this: CustomWorld) {
    const arquivadas = await serviceOrdemServico.arquivarConcluidas({ somenteIds: [this.data.osId] });
    assert.equal(arquivadas, 0, "A segunda rodada não deveria arquivar nada");
});

// Consultas
When("o usuário consulta o histórico de O.S. arquivadas", async function (this: CustomWorld) {
    this.response = await api.get("/ordens-servico/arquivadas").set("Authorization", token(this));
});

When("um analista consulta o histórico de O.S. arquivadas", async function (this: CustomWorld) {
    // O seed não tem analista, então o teste simula um.
    const analista = { id: 0, tipo: "analista", ativo: true } as unknown as Funcionario;
    const app = express();
    app.use((req, _res, next) => {
        req.usuario = analista;
        next();
    });
    app.use("/ordens-servico", routerOrdemServico);
    app.use(tratarErros);
    this.response = await request(app).get("/ordens-servico/arquivadas");
});

// Verificações
Then("a O.S. fica arquivada", function (this: CustomWorld) {
    assert.ok(this.data.arquivadaEm, "Esperava arquivada_em preenchido");
});

Then("a O.S. não fica arquivada", function (this: CustomWorld) {
    assert.equal(this.data.arquivadaEm ?? null, null, "Esperava arquivada_em nulo");
});

Then("a data de arquivamento não muda", async function (this: CustomWorld) {
    assert.ok(this.data.arquivadaEm, "A primeira rodada deveria ter arquivado a O.S.");
    assert.equal((await buscarOS(this)).arquivada_em, this.data.arquivadaEm);
});

Then("a O.S. não aparece em GET \\/ordens-servico", async function (this: CustomWorld) {
    assert.ok(!(await idsListados(this)).includes(this.data.osId), "A O.S. arquivada não deveria ser listada");
});

Then(
    "a O.S. aparece em GET \\/ordens-servico com incluir_arquivadas=true",
    async function (this: CustomWorld) {
        const ids = await idsListados(this, "?incluir_arquivadas=true");
        assert.ok(ids.includes(this.data.osId), "A O.S. arquivada deveria ser listada com incluir_arquivadas=true");
    },
);

Then("o histórico responde com status {int}", function (this: CustomWorld, status: number) {
    assert.equal(this.response?.status, status, JSON.stringify(this.response?.body));
});

Then("a O.S. aparece no histórico de arquivadas", function (this: CustomWorld) {
    const ids = (this.response?.body as Array<{ id: number }>).map((ordem) => ordem.id);
    assert.ok(ids.includes(this.data.osId), "A O.S. arquivada deveria estar no histórico");
});

Then("todas as O.S. do histórico estão arquivadas", function (this: CustomWorld) {
    const ordens = this.response?.body as Array<{ id: number; ativo: boolean; arquivada_em: string | null; estado_sla?: unknown }>;
    for (const ordem of ordens) {
        assert.ok(ordem.arquivada_em, `A O.S. ${ordem.id} do histórico não está arquivada`);
        assert.equal(ordem.ativo, true, `A O.S. ${ordem.id} do histórico está inativa`);
        assert.ok("estado_sla" in ordem, `A O.S. ${ordem.id} do histórico veio sem estado_sla`);
    }
});

Then("parecer, data de conclusão e horas continuam iguais", async function (this: CustomWorld) {
    const ordem = await buscarOS(this);
    const horas = await api.get(`/ordens-servico/${this.data.osId}/horas`).set("Authorization", token(this));
    assert.equal(ordem.parecer_tecnico, this.data.antes.parecer);
    assert.equal(ordem.data_fim, this.data.antes.dataFim);
    assert.deepEqual(horas.body, this.data.antes.horas);
});
