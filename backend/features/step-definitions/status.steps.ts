import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { env } from "process";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { prisma } from "../../src/prisma/client";

/** Cabeçalho de autorização com o token guardado no login. */
const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

/** Faz login e devolve o corpo da resposta (token e dados do funcionário). */
async function login(usuario: string | undefined, senha: string | undefined) {
    assert.ok(usuario && senha, "Usuário ou senha de teste não configurados no .env");

    const response = await api.post("/auth/login").send({ usuario, senha });
    assert.equal(response.status, 200, `Falha no login: ${JSON.stringify(response.body)}`);
    return response.body;
}

/** Envia o PATCH de status para a O.S. do cenário e guarda a resposta. */
async function alterarStatus(world: CustomWorld, corpo: Record<string, unknown>, comToken = true) {
    let requisicao = api.patch(`/ordens-servico/${world.data.osId}/status`);
    if (comToken) {
        requisicao = requisicao.set("Authorization", token(world));
    }
    world.response = await requisicao.send(corpo);
}

// Preparação
Given(
    "que existe uma O.S. bloqueada atribuída ao técnico autenticado",
    async function (this: CustomWorld) {
        const tecnico = await login(env.SEED_TECNICO_USUARIO, env.SEED_TECNICO_SENHA);
        const gestor = await login(env.SEED_GESTOR_USUARIO, env.SEED_GESTOR_SENHA);

        const criacao = await api
            .post("/ordens-servico")
            .set("Authorization", `Bearer ${gestor.token}`)
            .send({
                tipo: "instalacao",
                titulo: "OS bloqueada para teste",
                descricao: "OS criada já bloqueada para o teste de desbloqueio",
                departamento_id: tecnico.funcionario.departamento_id,
                status: "bloqueado",
                responsavel_id: tecnico.funcionario.id,
            });
        assert.equal(criacao.status, 201, `Falha ao criar OS: ${JSON.stringify(criacao.body)}`);

        this.data.osId = criacao.body.id;
        this.data.os = criacao.body;

        // A partir daqui, quem age é o técnico
        this.data.token = tecnico.token;
        this.data.usuarioAutenticado = tecnico;
    }
);

// Ações
When(
    "altera o status da O.S. para {string}",
    async function (this: CustomWorld, status: string) {
        await alterarStatus(this, { status });
    }
);

When(
    "conclui a O.S. com o parecer {string}",
    async function (this: CustomWorld, parecer: string) {
        this.data.statusAntigo = this.data.os?.status;
        this.data.parecer = parecer;
        await alterarStatus(this, { status: "concluido", parecer_tecnico: parecer });
    }
);

When(
    "altera o status da O.S. para {string} sem estar autenticado",
    async function (this: CustomWorld, status: string) {
        await alterarStatus(this, { status }, false);
    }
);

// Conferências
Then(
    "a API aceita a alteração de status",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
    }
);

Then(
    "a API rejeita a alteração de status",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 400, JSON.stringify(this.response?.body));
    }
);

Then(
    "a API exige autenticação",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 401, JSON.stringify(this.response?.body));
    }
);

Then(
    "o status da O.S. é {string}",
    function (this: CustomWorld, statusEsperado: string) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        assert.equal(this.response?.body.status, statusEsperado);
    }
);

Then(
    "a O.S. foi criada com o status {string}",
    function (this: CustomWorld, statusEsperado: string) {
        assert.equal(this.data.os?.status, statusEsperado);
    }
);

Then(
    "a auditoria registra o status antigo, o novo e o parecer",
    async function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));

        const auditoria = await prisma.auditoria.findFirst({
            where: {
                os_id: this.data.osId,
                campo_alterado: "status",
            },
            orderBy: { data_modificacao: "desc" },
        });

        assert.ok(auditoria, "Registro de auditoria não encontrado");
        assert.equal(auditoria.dado_antigo, this.data.statusAntigo);
        assert.equal(auditoria.dado_novo, "concluido");
        assert.equal(auditoria.justificativa, this.data.parecer);

        // O step "a auditoria identifica quem realizou a alteração e quando" lê daqui
        this.data.auditoria = auditoria;
    }
);