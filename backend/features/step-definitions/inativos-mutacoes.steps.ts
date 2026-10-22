import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { prisma } from "../../src/prisma/client";
import { gerarHashSenha } from "../../src/utils/senha";

const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

async function criarCliente(world: CustomWorld): Promise<number> {
    const marcador = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nome = `Cliente inativo teste ${marcador}`;
    const criacao = await api.post("/cliente").set("Authorization", token(world)).send({
        nome,
        razao_social: `Razão social ${marcador}`,
        ramo_atuacao: "Teste de regressão",
        locais_operacionais: [],
    });
    assert.equal(criacao.status, 201, `Falha ao criar cliente de fixture: ${JSON.stringify(criacao.body)}`);
    world.data.clienteFixtureId = criacao.body.id;
    world.data.clienteFixtureNome = criacao.body.nome;
    return criacao.body.id as number;
}

When("o gestor cria e inativa um cliente de teste", async function (this: CustomWorld) {
    const id = await criarCliente(this);
    const resposta = await api.delete(`/cliente/${id}`).set("Authorization", token(this));
    assert.equal(resposta.status, 200, `Falha ao inativar cliente de fixture: ${JSON.stringify(resposta.body)}`);
});

When("o gestor cria e inativa um funcionário de teste sem O.S. atribuída", async function (this: CustomWorld) {
    const departamentoId = this.data.usuarioAutenticado?.funcionario?.departamento_id;
    assert.ok(departamentoId, "O Gestor autenticado não tem departamento para criar a fixture de teste");
    const marcador = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const funcionario = await prisma.funcionarios.create({
        data: {
            departamento_id: departamentoId,
            usuario: `fixture.inativo.${marcador}`,
            senha_hash: await gerarHashSenha(`fixture-only-${marcador}`),
            nome: `Funcionário inativo teste ${marcador}`,
            tipo: "tecnico",
            ativo: true,
        },
        omit: { senha_hash: true },
    });
    this.data.funcionarioFixtureId = funcionario.id;
    this.data.funcionarioFixtureNome = funcionario.nome;
    const resposta = await api.delete(`/funcionario/${funcionario.id}`).set("Authorization", token(this));
    assert.equal(resposta.status, 200, `Falha ao inativar funcionário de fixture: ${JSON.stringify(resposta.body)}`);
});

When("o gestor cria e inativa um projeto de teste", async function (this: CustomWorld) {
    const clienteId = await criarCliente(this);
    const departamentoId = this.data.usuarioAutenticado?.funcionario?.departamento_id;
    assert.ok(departamentoId, "O Gestor autenticado não tem departamento para criar o Projeto de fixture");
    const marcador = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const criacao = await api.post("/projeto").set("Authorization", token(this)).send({
        nome: `Projeto inativo teste ${marcador}`,
        cliente_id: clienteId,
        departamentos: [departamentoId],
        status: "em_planejamento",
    });
    assert.equal(criacao.status, 201, `Falha ao criar projeto de fixture: ${JSON.stringify(criacao.body)}`);
    this.data.projetoFixtureId = criacao.body.id;
    this.data.projetoFixtureNome = criacao.body.nome;
    const inativacao = await api.patch(`/projeto/${criacao.body.id}/inativar`).set("Authorization", token(this));
    assert.equal(inativacao.status, 200, `Falha ao inativar projeto de fixture: ${JSON.stringify(inativacao.body)}`);
});

When("tenta alterar o cliente inativo pela API", async function (this: CustomWorld) {
    this.response = await api.patch(`/cliente/${this.data.clienteFixtureId}`)
        .set("Authorization", token(this)).send({ nome: "Cliente não deve ser alterado" });
});

When("tenta alterar o funcionário inativo pela API", async function (this: CustomWorld) {
    this.response = await api.patch(`/funcionario/${this.data.funcionarioFixtureId}`)
        .set("Authorization", token(this)).send({ nome: "Funcionário não deve ser alterado" });
});

When("tenta alterar o projeto inativo pela API", async function (this: CustomWorld) {
    this.response = await api.patch(`/projeto/${this.data.projetoFixtureId}`)
        .set("Authorization", token(this)).send({ nome: "Projeto não deve ser alterado" });
});

Then("a API recusa a edição e preserva o histórico do cliente", async function (this: CustomWorld) {
    assert.equal(this.response?.status, 409, `Esperava conflito para cliente inativo, recebeu ${this.response?.status}: ${JSON.stringify(this.response?.body)}`);
    const atual = await prisma.clientes.findUnique({ where: { id: this.data.clienteFixtureId } });
    assert.ok(atual);
    assert.equal(atual.ativo, false);
    assert.equal(atual.nome, this.data.clienteFixtureNome);
});

Then("a API recusa a edição e preserva o histórico do funcionário", async function (this: CustomWorld) {
    assert.equal(this.response?.status, 409, `Esperava conflito para funcionário inativo, recebeu ${this.response?.status}: ${JSON.stringify(this.response?.body)}`);
    const atual = await prisma.funcionarios.findUnique({ where: { id: this.data.funcionarioFixtureId }, omit: { senha_hash: true } });
    assert.ok(atual);
    assert.equal(atual.ativo, false);
    assert.equal(atual.nome, this.data.funcionarioFixtureNome);
});

Then("a API recusa a edição e preserva o histórico do projeto", async function (this: CustomWorld) {
    assert.equal(this.response?.status, 409, `Esperava conflito para projeto inativo, recebeu ${this.response?.status}: ${JSON.stringify(this.response?.body)}`);
    const atual = await prisma.projetos.findUnique({ where: { id: this.data.projetoFixtureId } });
    assert.ok(atual);
    assert.equal(atual.ativo, false);
    assert.equal(atual.nome, this.data.projetoFixtureNome);
});
