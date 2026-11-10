/**
 * Steps do registro de horas gastas na O.S. (US#2.7).
 * Cobre a rota própria de registro e a obrigatoriedade de horas na troca de status pelo técnico.
 */
import { When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { prisma } from "../../src/prisma/client";

const DATA_PASSADA = "2026-11-01";
const OS_INEXISTENTE = 2147483647;

async function registrar(world: CustomWorld, osId: number, corpo: object) {
    world.response = await api
        .post(`/ordens-servico/${osId}/horas`)
        .set("Authorization", `Bearer ${world.data.token}`)
        .send(corpo);
}

async function mudarStatus(world: CustomWorld, corpo: object) {
    world.response = await api
        .patch(`/ordens-servico/${world.data.osId}/status`)
        .set("Authorization", `Bearer ${world.data.token}`)
        .send(corpo);
}

When("registra a duração {string} na data {string}", async function (this: CustomWorld, duracao: string, data: string) {
    await registrar(this, this.data.osId, { duracao, data_trabalho: data });
});

When("registra horas em uma O.S. inexistente", async function (this: CustomWorld) {
    await registrar(this, OS_INEXISTENTE, { duracao: "1h", data_trabalho: DATA_PASSADA });
});

When("registra horas sem estar autenticado", async function (this: CustomWorld) {
    this.response = await api.post("/ordens-servico/1/horas").send({ duracao: "1h", data_trabalho: DATA_PASSADA });
});

When("muda o status para {string} sem informar horas", async function (this: CustomWorld, status: string) {
    await mudarStatus(this, { status });
});

When("muda o status para {string} informando {string}", async function (this: CustomWorld, status: string, duracao: string) {
    await mudarStatus(this, { status, duracao, data_trabalho: DATA_PASSADA });
});

Then("o registro de horas responde {int}", function (this: CustomWorld, esperado: number) {
    assert.equal(this.response?.status, esperado, JSON.stringify(this.response?.body));
});

Then(
    "existe lançamento de {int} minutos com status {string} e auditoria",
    async function (this: CustomWorld, minutos: number, status: string) {
        const lancamento = await prisma.lancamentos_horas.findFirst({
            where: { os_id: this.data.osId },
            orderBy: { id: "desc" },
        });
        assert.ok(lancamento, "Lançamento não encontrado");
        assert.equal(lancamento.minutos, minutos);
        assert.equal(lancamento.status_os, status);

        const auditoria = await prisma.auditoria.findFirst({
            where: { os_id: this.data.osId, campo_alterado: "horas" },
        });
        assert.ok(auditoria, "Auditoria do lançamento não encontrada");
        assert.equal(auditoria.dado_novo, String(minutos));
    },
);
