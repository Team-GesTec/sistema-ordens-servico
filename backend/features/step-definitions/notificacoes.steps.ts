import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { randomUUID } from "crypto";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { ServiceNotificacao } from "../../src/services/serviceNotificacao";
import type { Notificacao } from "../../src/models/modelNotificacao";
import type { RepositoryNotificacao } from "../../src/repositories/repositoryNotificacao";
import type { RepositoryOrdemServico } from "../../src/repositories/repositoryOrdemServico";

function adicionarOS(world: CustomWorld, id: number, responsavelId: number | null, limite: string, status: string, ativo: boolean) {
    world.data.ordens ??= [];
    world.data.ordens.push({
        id,
        titulo: `OS de teste ${id}`,
        tipo: "manutencao",
        status,
        ativo,
        departamento_id: 10,
        responsavel_id: responsavelId,
        data_criacao: new Date("2026-10-19T08:00:00-03:00"),
        data_limite_sla: new Date(limite),
    });
}

function criarService(world: CustomWorld): ServiceNotificacao {
    if (world.data.servico) return world.data.servico;
    world.data.notificacoesGuardadas = [];
    const repositorioFalso = {
        criarEmLote: async (dados: Array<Omit<Notificacao, "id" | "lida" | "data_criacao">>) => {
            for (const dado of dados) {
                (world.data.notificacoesGuardadas as Notificacao[]).push({ ...dado, id: randomUUID(), lida: false, data_criacao: new Date() });
            }
            return dados.length;
        },
        listarDestinatarios: async (_departamentoId: number, responsavelId: number | null) => [
            ...(world.data.funcionariosDepartamento as number[]),
            ...(responsavelId === null ? [] : [responsavelId]),
        ],
        existe: async (osId: number, funcionarioId: number, tipo: Notificacao["tipo"]) =>
            (world.data.notificacoesGuardadas as Notificacao[]).some((item) => item.os_id === osId && item.funcionario_id === funcionarioId && item.tipo === tipo),
        removerAlertaCritico: async (osId: number) => {
            world.data.notificacoesGuardadas = (world.data.notificacoesGuardadas as Notificacao[]).filter((item) => item.os_id !== osId || item.tipo !== "sla_critica");
        },
    };
    const ordensFalsas = { listar: async () => world.data.ordens ?? [] };
    world.data.servico = new ServiceNotificacao(
        repositorioFalso as unknown as RepositoryNotificacao,
        ordensFalsas as unknown as Pick<RepositoryOrdemServico, "listar">,
    );
    return world.data.servico;
}

Given("que os funcionários do departamento têm os ids {int} e {int}", function (this: CustomWorld, funcionario1: number, funcionario2: number) {
    this.data.funcionariosDepartamento = [funcionario1, funcionario2];
});

Given("que existe a O.S. ativa {int} com responsável {int} e limite em {string}", function (this: CustomWorld, id: number, responsavelId: number, limite: string) {
    adicionarOS(this, id, responsavelId, limite, "em_andamento", true);
});

Given("que existe a O.S. concluída {int} com responsável {int} e limite em {string}", function (this: CustomWorld, id: number, responsavelId: number, limite: string) {
    adicionarOS(this, id, responsavelId, limite, "concluido", true);
});

Given("que existe a O.S. inativa {int} com responsável {int} e limite em {string}", function (this: CustomWorld, id: number, responsavelId: number, limite: string) {
    adicionarOS(this, id, responsavelId, limite, "em_andamento", false);
});

When("a rotina de notificações roda em {string}", async function (this: CustomWorld, agora: string) {
    this.data.criadasNaUltimaRodada = await criarService(this).gerarNotificacoesSla(new Date(agora));
});

When("as notificações são consultadas sem estar autenticado", async function (this: CustomWorld) {
    this.response = await api.get("/notificacoes");
});

Then("a última rodada cria {int} avisos novos", function (this: CustomWorld, esperado: number) {
    assert.equal(this.data.criadasNaUltimaRodada, esperado);
});

Then("o funcionário {int} recebe um aviso de {string} sobre a O.S. {int}", function (this: CustomWorld, funcionarioId: number, tipo: string, osId: number) {
    const recebeu = (this.data.notificacoesGuardadas as Notificacao[]).some((item) => item.funcionario_id === funcionarioId && item.tipo === tipo && item.os_id === osId);
    assert.ok(recebeu, `O funcionário ${funcionarioId} não recebeu aviso de ${tipo} sobre a O.S. ${osId}`);
});

Then("não existe aviso crítico para a O.S. {int}", function (this: CustomWorld, osId: number) {
    const existe = (this.data.notificacoesGuardadas as Notificacao[]).some((item) => item.os_id === osId && item.tipo === "sla_critica");
    assert.equal(existe, false);
});

Then("a consulta de notificações é recusada por falta de login", function (this: CustomWorld) {
    assert.equal(this.response?.status, 401, JSON.stringify(this.response?.body));
});
