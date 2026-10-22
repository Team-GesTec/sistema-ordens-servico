import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { prisma } from "../../src/prisma/client";

const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

async function criarOSDoTecnico(world: CustomWorld, atribuirAoTecnico: boolean) {
    const funcionario = world.data.usuarioAutenticado?.funcionario;
    assert.ok(funcionario?.id && funcionario.departamento_id, "Funcionário autenticado não tem departamento disponível");
    world.data.tecnicoId = funcionario.id;
    const criada = await api.post("/ordens-servico").set("Authorization", token(world)).send({
        tipo: "instalacao",
        departamento_id: funcionario.departamento_id,
        titulo: "Teste de parecer independente",
        descricao: "O.S. criada para validar o contrato de parecer técnico.",
        data_limite_sla: (() => { const entrega = new Date(); entrega.setUTCDate(entrega.getUTCDate() + 10); return entrega.toISOString().slice(0, 10); })(),
    });
    assert.equal(criada.status, 201, `Falha ao criar O.S. de teste: ${JSON.stringify(criada.body)}`);
    world.data.osId = criada.body.id;

    if (atribuirAoTecnico) {
        const atribuida = await api.patch(`/ordens-servico/atribuir/${criada.body.id}`)
            .set("Authorization", token(world))
            .send({ funcionario_id: funcionario.id });
        assert.equal(atribuida.status, 200, `Falha ao atribuir O.S. ao Técnico de teste: ${JSON.stringify(atribuida.body)}`);
    }

    const detalhe = await api.get(`/ordens-servico/${criada.body.id}`).set("Authorization", token(world));
    assert.equal(detalhe.status, 200, `Falha ao consultar O.S. de teste: ${JSON.stringify(detalhe.body)}`);
    world.data.osAntesParecer = detalhe.body;
    world.data.auditoriasParecerAntes = await prisma.auditoria.count({
        where: { os_id: criada.body.id, campo_alterado: "parecer_tecnico" },
    });
}

Given("que existe uma O.S. ativa atribuída ao técnico atual", async function (this: CustomWorld) {
    await criarOSDoTecnico(this, true);
});

Given("que existe uma O.S. ativa ainda sem responsável do técnico atual", async function (this: CustomWorld) {
    await criarOSDoTecnico(this, false);
});

When("o técnico salva o parecer independente {string}", async function (this: CustomWorld, parecer: string) {
    this.response = await api.patch(`/ordens-servico/${this.data.osId}/parecer-tecnico`)
        .set("Authorization", token(this))
        .send({ parecer_tecnico: parecer });
});

When("o técnico tenta salvar um parecer independente {string}", async function (this: CustomWorld, parecer: string) {
    this.response = await api.patch(`/ordens-servico/${this.data.osId}/parecer-tecnico`)
        .set("Authorization", token(this))
        .send({ parecer_tecnico: parecer });
});

When("o técnico tenta salvar o parecer junto com uma alteração de status", async function (this: CustomWorld) {
    this.response = await api.patch(`/ordens-servico/${this.data.osId}/parecer-tecnico`)
        .set("Authorization", token(this))
        .send({ parecer_tecnico: "Parecer não deve provocar transição", status: "aguardando" });
});

When("o técnico tenta salvar um parecer com 1001 caracteres", async function (this: CustomWorld) {
    this.response = await api.patch(`/ordens-servico/${this.data.osId}/parecer-tecnico`)
        .set("Authorization", token(this))
        .send({ parecer_tecnico: "x".repeat(1001) });
});

Then("o parecer fica persistido e o status e os campos operacionais permanecem iguais", async function (this: CustomWorld) {
    assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
    const antes = this.data.osAntesParecer;
    const depois = await api.get(`/ordens-servico/${this.data.osId}`).set("Authorization", token(this));
    assert.equal(depois.status, 200, JSON.stringify(depois.body));
    assert.equal(depois.body.parecer_tecnico, "Análise técnica registrada para homologação");
    for (const campo of ["status", "ativo", "data_fim", "responsavel_id", "projeto_id", "departamento_id", "cliente_id", "titulo", "descricao", "data_criacao", "data_limite_sla"]) {
        assert.deepEqual(depois.body[campo], antes[campo], `O campo ${campo} não deveria ter mudado ao salvar parecer`);
    }
});

Then("uma única auditoria de parecer registra o valor anterior e o novo", async function (this: CustomWorld) {
    const registros = await prisma.auditoria.findMany({
        where: { os_id: this.data.osId, campo_alterado: "parecer_tecnico" },
        orderBy: [{ data_modificacao: "desc" }, { id: "desc" }],
    });
    assert.equal(registros.length, this.data.auditoriasParecerAntes + 1, "A operação deve produzir exatamente um evento de auditoria adicional");
    assert.equal(registros[0]?.dado_antigo, this.data.osAntesParecer.parecer_tecnico);
    assert.equal(registros[0]?.dado_novo, "Análise técnica registrada para homologação");
    assert.equal(registros[0]?.funcionario_id, this.data.usuarioAutenticado.funcionario.id);
});

Then("a API recusa a alteração de parecer", function (this: CustomWorld) {
    assert.ok([400, 403, 409].includes(this.response?.status ?? 0), `Esperava recusa, recebeu ${this.response?.status}: ${JSON.stringify(this.response?.body)}`);
});

Given("que existe uma O.S. atribuída ao técnico atual mas inativa", async function (this: CustomWorld) {
    await criarOSDoTecnico(this, true);
    await prisma.ordens_servico.update({ where: { id: this.data.osId }, data: { ativo: false } });
});

Given("que existe uma O.S. atribuída ao técnico atual mas bloqueada", async function (this: CustomWorld) {
    await criarOSDoTecnico(this, true);
    await prisma.ordens_servico.update({ where: { id: this.data.osId }, data: { status: "bloqueado" } });
});

Given("que existe uma O.S. concluída atribuída ao técnico atual", async function (this: CustomWorld) {
    await criarOSDoTecnico(this, true);
    const conclusao = await api.patch(`/ordens-servico/${this.data.osId}/status`)
        .set("Authorization", token(this))
        .send({ status: "concluido", parecer_tecnico: "Conclusão de teste para bloquear edição posterior." });
    assert.equal(conclusao.status, 200, `Falha ao preparar O.S. concluída: ${JSON.stringify(conclusao.body)}`);
});

When("o técnico salva um parecer independente vazio", async function (this: CustomWorld) {
    this.response = await api.patch(`/ordens-servico/${this.data.osId}/parecer-tecnico`)
        .set("Authorization", token(this))
        .send({ parecer_tecnico: "" });
});

When("o técnico tenta salvar parecer em uma O.S. bloqueada", async function (this: CustomWorld) {
    this.response = await api.patch(`/ordens-servico/${this.data.osId}/parecer-tecnico`)
        .set("Authorization", token(this))
        .send({ parecer_tecnico: "Não deve salvar" });
});

When("o técnico tenta salvar parecer em uma O.S. concluída", async function (this: CustomWorld) {
    this.response = await api.patch(`/ordens-servico/${this.data.osId}/parecer-tecnico`)
        .set("Authorization", token(this))
        .send({ parecer_tecnico: "Não deve salvar" });
});

When("o técnico tenta salvar parecer em uma O.S. inativa", async function (this: CustomWorld) {
    this.response = await api.patch(`/ordens-servico/${this.data.osId}/parecer-tecnico`)
        .set("Authorization", token(this))
        .send({ parecer_tecnico: "Não deve salvar" });
});

When("um gestor tenta usar o endpoint de parecer exclusivo do técnico", async function (this: CustomWorld) {
    // O Contexto autentica um Técnico; o Dado específico do cenário troca explicitamente
    // a identidade para Gestor antes desta chamada, que deve ser recusada pelo middleware.
    this.response = await api.patch("/ordens-servico/1/parecer-tecnico")
        .set("Authorization", token(this))
        .send({ parecer_tecnico: "Perfil não autorizado" });
});

Then("o parecer vazio fica persistido como nulo sem alterar o status", async function (this: CustomWorld) {
    assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
    const detalhe = await api.get(`/ordens-servico/${this.data.osId}`).set("Authorization", token(this));
    assert.equal(detalhe.status, 200, JSON.stringify(detalhe.body));
    assert.equal(detalhe.body.parecer_tecnico, null);
    assert.equal(detalhe.body.status, this.data.osAntesParecer.status);
});


Given("que a O.S. criada foi inativada para verificar bloqueios de mutação", async function (this: CustomWorld) {
    await prisma.ordens_servico.update({ where: { id: this.data.osId }, data: { ativo: false } });
});

When("um gestor tenta editar, atribuir, bloquear e mudar o status da O.S. inativa", async function (this: CustomWorld) {
    const cabecalho = { Authorization: token(this) };
    const id = this.data.osId;
    this.data.resultadosMutacaoOSInativa = [];
    this.data.resultadosMutacaoOSInativa.push(await api.patch(`/ordens-servico/${id}`).set(cabecalho).send({ titulo: "Título não deve ser alterado" }));
    this.data.resultadosMutacaoOSInativa.push(await api.patch(`/ordens-servico/atribuir/${id}`).set(cabecalho).send({ funcionario_id: this.data.tecnicoId }));
    this.data.resultadosMutacaoOSInativa.push(await api.patch(`/ordens-servico/bloquear/${id}`).set(cabecalho).send({}));
    this.data.resultadosMutacaoOSInativa.push(await api.patch(`/ordens-servico/${id}/status`).set(cabecalho).send({ status: "aguardando" }));
});

Then("todas as mutações da O.S. inativa são recusadas e a origem permanece inalterada", async function (this: CustomWorld) {
    const respostas = this.data.resultadosMutacaoOSInativa as Array<{ status: number; body: unknown }>;
    assert.equal(respostas.length, 4);
    for (const resposta of respostas) {
        assert.equal(resposta.status, 409, `Esperava conflito para O.S. inativa, recebeu ${resposta.status}: ${JSON.stringify(resposta.body)}`);
    }
    const atual = await prisma.ordens_servico.findUnique({ where: { id: this.data.osId } });
    assert.ok(atual);
    assert.equal(atual.ativo, false);
    assert.equal(atual.titulo, this.data.osAntesParecer.titulo);
    assert.equal(atual.status, this.data.osAntesParecer.status);
    assert.equal(atual.responsavel_id, this.data.osAntesParecer.responsavel_id);
});
