/**
 * Steps da US#2.10 — consultar atividades realizadas nas O.S. e logs de auditoria.
 *
 * Cada cenário usa um marcador único no título das O.S. criadas, para que a busca dos logs
 * globais encontre só os registros do próprio cenário (o banco de testes é compartilhado).
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { env } from "process";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { autorizacao, criarOrdemDeTeste, entrar, entrarGestorETecnico, type Sessao } from "../support/sessao";
import { prisma } from "../../src/prisma/client";
import { serviceAuditoria } from "../../src/services/serviceAuditoria";
import { FUSO_EXIBICAO } from "../../src/utils/dataHora";
import { diaNoFuso } from "../../src/utils/diasUteis";

/** Atividade como a API devolve (datas chegam como texto). */
interface AtividadeResposta {
    id: number;
    os_id: number;
    data_modificacao: string;
    data_hora: string;
    tipo_evento: string;
    descricao: string;
    campo_alterado: string | null;
    dado_antigo: string | null;
    dado_novo: string | null;
    parecer: string | null;
    funcionarios: { id: number; nome: string };
    ordem_servico: { id: number; titulo: string };
}

const gestor = (world: CustomWorld): Sessao => world.data.gestor;
const atividades = (world: CustomWorld): AtividadeResposta[] => world.response?.body.dados ?? [];

/** Marcador curto e único (o título da O.S. tem no máximo 60 caracteres). */
const novoMarcador = () => `AUD${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Envia um PATCH de status com o token do gestor. */
async function alterarStatus(world: CustomWorld, osId: number, corpo: Record<string, unknown>) {
    const resposta = await api
        .patch(`/ordens-servico/${osId}/status`)
        .set("Authorization", autorizacao(gestor(world)))
        .send(corpo);
    assert.equal(resposta.status, 200, `Falha ao alterar status: ${JSON.stringify(resposta.body)}`);
}

/** Troca a gravação da auditoria por uma falha enquanto `acao` roda, e restaura em seguida. */
async function comFalhaNaAuditoria(acao: () => Promise<void>) {
    const original = serviceAuditoria.registrar;
    serviceAuditoria.registrar = async () => {
        throw new Error("Falha simulada na gravação da auditoria");
    };
    try {
        await acao();
    } finally {
        serviceAuditoria.registrar = original;
    }
}

// Preparação
Given("que o gestor está autenticado para consultar a auditoria", async function (this: CustomWorld) {
    this.data.gestor = await entrar(env.SEED_GESTOR_USUARIO, env.SEED_GESTOR_SENHA);
    this.data.marcador = novoMarcador();
});

Given("que o gestor tem duas O.S. com atividades registradas", async function (this: CustomWorld) {
    const { gestor: sessaoGestor, tecnico } = await entrarGestorETecnico();
    this.data.gestor = sessaoGestor;
    this.data.tecnico = tecnico;
    this.data.marcador = novoMarcador();

    const departamentoId = sessaoGestor.funcionario.departamento_id;
    const primeira = await criarOrdemDeTeste(sessaoGestor, { departamentoId, titulo: `Auditoria ${this.data.marcador} A` });
    const segunda = await criarOrdemDeTeste(sessaoGestor, { departamentoId, titulo: `Auditoria ${this.data.marcador} B` });
    this.data.primeiraId = primeira.id;
    this.data.segundaId = segunda.id;

    // Primeira O.S.: criação → edição do título → mudança de status
    this.data.tituloEditado = `Auditoria ${this.data.marcador} A editada`;
    const edicao = await api
        .patch(`/ordens-servico/${primeira.id}`)
        .set("Authorization", autorizacao(sessaoGestor))
        .send({ titulo: this.data.tituloEditado });
    assert.equal(edicao.status, 200, `Falha ao editar O.S.: ${JSON.stringify(edicao.body)}`);
    await alterarStatus(this, primeira.id, { status: "aguardando" });

    // Segunda O.S.: criação → mudança de status
    await alterarStatus(this, segunda.id, { status: "aguardando" });
});

Given(
    "o gestor conclui a primeira O.S. com o parecer {string}",
    async function (this: CustomWorld, parecer: string) {
        await alterarStatus(this, this.data.primeiraId, { status: "concluido", parecer_tecnico: parecer });
    },
);

Given("que existe uma O.S. sem nenhuma atividade registrada", async function (this: CustomWorld) {
    this.data.gestor = await entrar(env.SEED_GESTOR_USUARIO, env.SEED_GESTOR_SENHA);
    // Gravada direto no banco, como uma O.S. anterior à auditoria de criação
    const ordem = await prisma.ordens_servico.create({
        data: {
            departamento_id: gestor(this).funcionario.departamento_id,
            solicitante_id: gestor(this).funcionario.id,
            titulo: `Auditoria ${novoMarcador()} sem atividades`,
            descricao: "O.S. criada pelos testes sem registros de auditoria",
        },
    });
    this.data.osSemAtividadesId = ordem.id;
});

// Ações
When("o gestor consulta as atividades da primeira O.S.", async function (this: CustomWorld) {
    this.response = await api
        .get(`/ordens-servico/${this.data.primeiraId}/historico?limite=100`)
        .set("Authorization", autorizacao(gestor(this)));
});

When(
    "o gestor consulta a página {int} das atividades da primeira O.S. com {int} por página",
    async function (this: CustomWorld, pagina: number, limite: number) {
        this.response = await api
            .get(`/ordens-servico/${this.data.primeiraId}/historico?pagina=${pagina}&limite=${limite}`)
            .set("Authorization", autorizacao(gestor(this)));
    },
);

When("o gestor consulta as atividades dessa O.S.", async function (this: CustomWorld) {
    this.response = await api
        .get(`/ordens-servico/${this.data.osSemAtividadesId}/historico`)
        .set("Authorization", autorizacao(gestor(this)));
});

When("o gestor consulta as atividades da O.S. {int}", async function (this: CustomWorld, osId: number) {
    this.response = await api
        .get(`/ordens-servico/${osId}/historico`)
        .set("Authorization", autorizacao(gestor(this)));
});

When("o gestor consulta os logs buscando pelo marcador do cenário", async function (this: CustomWorld) {
    this.response = await api
        .get("/auditoria")
        .query({ busca: this.data.marcador, limite: 100 })
        .set("Authorization", autorizacao(gestor(this)));
});

When(
    "o gestor consulta os logs do tipo {string} buscando pelo marcador do cenário",
    async function (this: CustomWorld, tipo: string) {
        this.response = await api
            .get("/auditoria")
            .query({ busca: this.data.marcador, tipo, limite: 100 })
            .set("Authorization", autorizacao(gestor(this)));
    },
);

When(
    "o gestor consulta a página {int} dos logs do marcador do cenário com {int} por página",
    async function (this: CustomWorld, pagina: number, limite: number) {
        const anterior = await api
            .get("/auditoria")
            .query({ busca: this.data.marcador, pagina: pagina - 1, limite })
            .set("Authorization", autorizacao(gestor(this)));
        assert.equal(anterior.status, 200, JSON.stringify(anterior.body));
        this.data.paginaAnterior = anterior.body.dados;

        this.response = await api
            .get("/auditoria")
            .query({ busca: this.data.marcador, pagina, limite })
            .set("Authorization", autorizacao(gestor(this)));
    },
);

When("o gestor consulta os logs do marcador do cenário no período de hoje", async function (this: CustomWorld) {
    const hoje = diaNoFuso(new Date(), FUSO_EXIBICAO);
    this.response = await api
        .get("/auditoria")
        .query({ busca: this.data.marcador, data_inicio: hoje, data_fim: hoje, limite: 100 })
        .set("Authorization", autorizacao(gestor(this)));
});

When(
    "o gestor consulta os logs do marcador do cenário entre {string} e {string}",
    async function (this: CustomWorld, inicio: string, fim: string) {
        this.response = await api
            .get("/auditoria")
            .query({ busca: this.data.marcador, data_inicio: inicio, data_fim: fim })
            .set("Authorization", autorizacao(gestor(this)));
    },
);

When(
    "o gestor consulta os logs entre {string} e {string}",
    async function (this: CustomWorld, inicio: string, fim: string) {
        this.response = await api
            .get("/auditoria")
            .query({ data_inicio: inicio, data_fim: fim })
            .set("Authorization", autorizacao(gestor(this)));
    },
);

When("o gestor consulta os logs do tipo {string}", async function (this: CustomWorld, tipo: string) {
    this.response = await api
        .get("/auditoria")
        .query({ tipo })
        .set("Authorization", autorizacao(gestor(this)));
});

When("o técnico consulta {string}", async function (this: CustomWorld, rota: string) {
    const caminho = rota === "os logs globais" ? "/auditoria" : `/ordens-servico/${this.data.primeiraId}/historico`;
    this.response = await api.get(caminho).set("Authorization", autorizacao(this.data.tecnico));
});

When("alguém sem token consulta os logs de auditoria", async function (this: CustomWorld) {
    this.response = await api.get("/auditoria");
});

When("o gestor envia {string} para a auditoria", async function (this: CustomWorld, metodo: string) {
    const caminho = "/auditoria/1";
    const requisicao =
        metodo === "PUT" ? api.put(caminho) : metodo === "PATCH" ? api.patch(caminho) : api.delete(caminho);
    this.response = await requisicao.set("Authorization", autorizacao(gestor(this))).send({ descricao: "alterada" });
});

When("um registro de auditoria da primeira O.S. é alterado direto no banco", async function (this: CustomWorld) {
    const registro = await prisma.auditoria.findFirstOrThrow({ where: { os_id: this.data.primeiraId } });
    this.data.erroAlteracaoBanco = await prisma.auditoria
        .update({ where: { id: registro.id }, data: { descricao: "alterada pelo teste" } })
        .then(() => null, (erro: unknown) => erro);
});

When(
    "a gravação da auditoria falha durante a edição do título da primeira O.S.",
    async function (this: CustomWorld) {
        this.data.atividadesAntes = await prisma.auditoria.count({ where: { os_id: this.data.primeiraId } });
        await comFalhaNaAuditoria(async () => {
            this.response = await api
                .patch(`/ordens-servico/${this.data.primeiraId}`)
                .set("Authorization", autorizacao(gestor(this)))
                .send({ titulo: `Auditoria ${this.data.marcador} rollback` });
        });
    },
);

When("a gravação da auditoria falha durante a criação de uma O.S.", async function (this: CustomWorld) {
    this.data.tituloRollback = `Auditoria ${this.data.marcador} criação desfeita`;
    await comFalhaNaAuditoria(async () => {
        this.response = await api
            .post("/ordens-servico")
            .set("Authorization", autorizacao(gestor(this)))
            .send({
                tipo: "instalacao",
                titulo: this.data.tituloRollback,
                descricao: "O.S. que não deve ser gravada",
                departamento_id: gestor(this).funcionario.departamento_id,
            });
    });
});

// Conferências
Then("a consulta de atividades é aceita", function (this: CustomWorld) {
    assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
});

Then("a consulta de auditoria responde com o status {int}", function (this: CustomWorld, status: number) {
    assert.equal(this.response?.status, status, JSON.stringify(this.response?.body));
    if (status >= 400) {
        assert.equal(typeof this.response?.body.mensagem, "string", "Erro fora do formato { mensagem }");
    }
});

Then("todas as atividades pertencem à primeira O.S.", function (this: CustomWorld) {
    const lista = atividades(this);
    assert.ok(lista.length >= 3, `Esperava ao menos 3 atividades, veio ${lista.length}`);
    for (const atividade of lista) {
        assert.equal(atividade.os_id, this.data.primeiraId);
        assert.equal(atividade.ordem_servico.id, this.data.primeiraId);
    }
});

Then("nenhuma atividade da segunda O.S. aparece", async function (this: CustomWorld) {
    const daSegunda = await prisma.auditoria.findMany({ where: { os_id: this.data.segundaId }, select: { id: true } });
    assert.ok(daSegunda.length > 0, "A segunda O.S. deveria ter atividades");
    const idsConsultados = new Set(atividades(this).map((atividade) => atividade.id));
    for (const { id } of daSegunda) {
        assert.ok(!idsConsultados.has(id), `A atividade ${id} da segunda O.S. apareceu na primeira`);
    }
});

Then("as atividades estão em ordem decrescente de data e, no empate, de id", function (this: CustomWorld) {
    const lista = atividades(this);
    for (let i = 1; i < lista.length; i += 1) {
        const anterior = lista[i - 1]!;
        const atual = lista[i]!;
        const dataAnterior = new Date(anterior.data_modificacao).getTime();
        const dataAtual = new Date(atual.data_modificacao).getTime();
        assert.ok(dataAnterior >= dataAtual, `Atividade ${atual.id} está fora da ordem de data`);
        if (dataAnterior === dataAtual) {
            assert.ok(anterior.id > atual.id, `Empate de data entre ${anterior.id} e ${atual.id} fora da ordem de id`);
        }
    }
});

Then("a atividade mais antiga é a criação da O.S.", function (this: CustomWorld) {
    const lista = atividades(this);
    assert.equal(lista.at(-1)?.tipo_evento, "criacao");
});

Then(
    "cada atividade traz descrição, responsável e data no formato {string}",
    function (this: CustomWorld, _formato: string) {
        for (const atividade of atividades(this)) {
            assert.ok(atividade.descricao.trim().length > 0, `Atividade ${atividade.id} sem descrição`);
            assert.equal(atividade.funcionarios.id, gestor(this).funcionario.id);
            assert.ok(atividade.funcionarios.nome, `Atividade ${atividade.id} sem o nome do responsável`);
            assert.match(atividade.data_hora, /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
        }
    },
);

Then("a edição do título mostra o campo, o valor anterior e o novo", function (this: CustomWorld) {
    const edicao = atividades(this).find((atividade) => atividade.tipo_evento === "edicao");
    assert.ok(edicao, "Atividade de edição não encontrada");
    assert.equal(edicao.campo_alterado, "titulo");
    assert.equal(edicao.dado_antigo, `Auditoria ${this.data.marcador} A`);
    assert.equal(edicao.dado_novo, this.data.tituloEditado);
});

Then(
    "a atividade mais recente é a mudança de status com o parecer {string}",
    function (this: CustomWorld, parecer: string) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        const [maisRecente] = atividades(this);
        assert.ok(maisRecente, "Nenhuma atividade retornada");
        assert.equal(maisRecente.tipo_evento, "mudanca_status");
        assert.equal(maisRecente.dado_antigo, "aguardando");
        assert.equal(maisRecente.dado_novo, "concluido");
        assert.equal(maisRecente.parecer, parecer);
    },
);

Then(
    "a página traz {int} atividade com a paginação da página {int}",
    function (this: CustomWorld, quantidade: number, pagina: number) {
        assert.equal(atividades(this).length, quantidade);
        const paginacao = this.response?.body.paginacao;
        assert.equal(paginacao.pagina, pagina);
        assert.equal(paginacao.limite, quantidade);
        assert.equal(paginacao.total, 3);
        assert.equal(paginacao.total_paginas, 3);
    },
);

Then("a lista de atividades vem vazia com a paginação zerada", function (this: CustomWorld) {
    assert.deepEqual(this.response?.body.dados, []);
    assert.equal(this.response?.body.paginacao.total, 0);
    assert.equal(this.response?.body.paginacao.total_paginas, 0);
});

Then("todos os logs pertencem às O.S. do cenário", function (this: CustomWorld) {
    const lista = atividades(this);
    // A: criação, edição e status; B: criação e status
    assert.equal(lista.length, 5, JSON.stringify(lista.map((atividade) => atividade.descricao)));
    const ordensDoCenario = [this.data.primeiraId, this.data.segundaId];
    for (const atividade of lista) {
        assert.ok(ordensDoCenario.includes(atividade.os_id), `Log ${atividade.id} é de outra O.S.`);
    }
});

Then("todos os logs são do tipo {string}", function (this: CustomWorld, tipo: string) {
    const lista = atividades(this);
    assert.equal(lista.length, 2);
    for (const atividade of lista) {
        assert.equal(atividade.tipo_evento, tipo);
    }
});

Then("os indicadores refletem o filtro aplicado", function (this: CustomWorld) {
    const { indicadores, paginacao, dados } = this.response?.body;
    const lista = dados as AtividadeResposta[];
    assert.equal(indicadores.total_eventos, paginacao.total);
    assert.equal(indicadores.total_eventos, lista.length);
    assert.equal(indicadores.ordens_impactadas, new Set(lista.map((atividade) => atividade.os_id)).size);
    // Os registros do cenário acabaram de ser criados
    assert.equal(indicadores.eventos_hoje, lista.length);
    assert.equal(indicadores.ultimo_evento_formatado, lista[0]?.data_hora);
});

Then("a lista de logs vem vazia com os indicadores zerados", function (this: CustomWorld) {
    const { dados, paginacao, indicadores } = this.response?.body;
    assert.deepEqual(dados, []);
    assert.equal(paginacao.total, 0);
    assert.equal(paginacao.total_paginas, 0);
    assert.equal(indicadores.total_eventos, 0);
    assert.equal(indicadores.eventos_hoje, 0);
    assert.equal(indicadores.ordens_impactadas, 0);
    assert.equal(indicadores.ultimo_evento, null);
});

Then(
    "a página dos logs respeita o limite de {int} e não repete a página 1",
    function (this: CustomWorld, limite: number) {
        const lista = atividades(this);
        assert.ok(lista.length > 0 && lista.length <= limite);
        assert.equal(this.response?.body.paginacao.total, 5);
        assert.equal(this.response?.body.paginacao.total_paginas, 3);
        const idsAnteriores = new Set((this.data.paginaAnterior as AtividadeResposta[]).map((atividade) => atividade.id));
        for (const atividade of lista) {
            assert.ok(!idsAnteriores.has(atividade.id), `O log ${atividade.id} se repetiu entre as páginas`);
        }
    },
);

Then("o banco recusa a alteração da auditoria", function (this: CustomWorld) {
    assert.ok(this.data.erroAlteracaoBanco, "O banco aceitou alterar um registro de auditoria");
    assert.match(String(this.data.erroAlteracaoBanco), /imutáveis/);
});

Then("o título da primeira O.S. continua o mesmo no banco", async function (this: CustomWorld) {
    const ordem = await prisma.ordens_servico.findUniqueOrThrow({ where: { id: this.data.primeiraId } });
    assert.equal(ordem.titulo, this.data.tituloEditado);
});

Then("nenhuma atividade nova é registrada para a primeira O.S.", async function (this: CustomWorld) {
    const depois = await prisma.auditoria.count({ where: { os_id: this.data.primeiraId } });
    assert.equal(depois, this.data.atividadesAntes);
});

Then("a O.S. não fica gravada no banco", async function (this: CustomWorld) {
    const quantidade = await prisma.ordens_servico.count({ where: { titulo: this.data.tituloRollback } });
    assert.equal(quantidade, 0);
});
