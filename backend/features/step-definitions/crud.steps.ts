import { When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { prisma } from "../../src/prisma/client";

/** Id que nenhuma O.S. de teste vai ter (maior inteiro aceito pela coluna). */
const ID_INEXISTENTE = 2147483647;

/** Cabeçalho de autorização com o token guardado no login. */
const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

/** Envia um PATCH de edição para a O.S. do cenário e guarda a resposta. */
async function editarOS(world: CustomWorld, corpo: Record<string, unknown>) {
    world.response = await api
        .patch(`/ordens-servico/${world.data.osId}`)
        .set("Authorization", token(world))
        .send(corpo);
}

/** Um valor de exemplo para cada campo que a edição não pode alterar. */
const VALORES_PROIBIDOS: Record<string, (world: CustomWorld) => unknown> = {
    status: () => "aguardando",
    responsavel_id: (world) => world.data.usuarioAutenticado?.funcionario?.id,
    data_limite_sla: () => "2026-12-31T18:00:00.000Z",
};

// Lista e detalhe
When(
    "o gestor lista as O.S.",
    async function (this: CustomWorld) {
        this.response = await api
            .get("/ordens-servico")
            .set("Authorization", token(this));
    }
);

When(
    "consulta uma O.S. inexistente",
    async function (this: CustomWorld) {
        this.response = await api
            .get(`/ordens-servico/${ID_INEXISTENTE}`)
            .set("Authorization", token(this));
    }
);

Then(
    "a API retorna a lista com a O.S. criada",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        assert.ok(Array.isArray(this.response?.body), "A resposta deveria ser uma lista");

        const encontrada = this.response?.body.some(
            (ordem: { id: number }) => ordem.id === this.data.osId
        );
        assert.ok(encontrada, "A O.S. criada não apareceu na lista");
    }
);

Then(
    "a API retorna a O.S. consultada",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        assert.equal(this.response?.body.id, this.data.osId);
    }
);

// Edição
When(
    "o gestor edita o título da O.S. para {string}",
    async function (this: CustomWorld, titulo: string) {
        this.data.tituloAntigo = this.data.os?.titulo;
        this.data.tituloNovo = titulo;
        await editarOS(this, { titulo });
    }
);

When(
    "o gestor tenta editar o campo {string} da O.S.",
    async function (this: CustomWorld, campo: string) {
        const gerarValor = VALORES_PROIBIDOS[campo];
        assert.ok(gerarValor, `Não há valor de exemplo para o campo ${campo}`);
        await editarOS(this, { [campo]: gerarValor(this) });
    }
);

When(
    "o técnico tenta editar o título da O.S.",
    async function (this: CustomWorld) {
        await editarOS(this, { titulo: "Tentativa do técnico" });
    }
);

Then(
    "o título da O.S. é {string}",
    function (this: CustomWorld, tituloEsperado: string) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        assert.equal(this.response?.body.titulo, tituloEsperado);
    }
);

Then(
    "a API rejeita a edição",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 400, JSON.stringify(this.response?.body));
    }
);

// Auditoria
Then(
    "a auditoria registra o título antigo e o novo",
    async function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));

        const auditoria = await prisma.auditoria.findFirst({
            where: {
                os_id: this.data.osId,
                campo_alterado: "titulo",
            },
            orderBy: { data_modificacao: "desc" },
        });

        assert.ok(auditoria, "Registro de auditoria não encontrado");
        assert.equal(auditoria.dado_antigo, this.data.tituloAntigo);
        assert.equal(auditoria.dado_novo, this.data.tituloNovo);

        // O step "a auditoria identifica quem realizou a alteração e quando" lê daqui
        this.data.auditoria = auditoria;
    }
);