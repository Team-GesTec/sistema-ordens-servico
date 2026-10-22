import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { ServiceNotificacao } from "../../src/services/serviceNotificacao";
import type { Notificacao } from "../../src/models/modelNotificacao";
import type { RepositoryNotificacao } from "../../src/repositories/repositoryNotificacao";
import type { RepositoryOrdemServico } from "../../src/repositories/repositoryOrdemServico";
import type { RepositoryFuncionario } from "../../src/repositories/repositoryFuncionario";

/** Data de criação das O.S. de teste. Para manutenção, o risco depende só do limite. */
const DATA_CRIACAO = new Date("2026-10-19T08:00:00-03:00");

/** Monta uma O.S. de mentira (manutenção) e guarda na lista do cenário. */
function adicionarOS(
    world: CustomWorld,
    id: number,
    responsavelId: number | null,
    limite: string,
    status: string,
    ativo: boolean,
) {
    world.data.ordens ??= [];
    world.data.ordens.push({
        id,
        titulo: `OS de teste ${id}`,
        tipo: "manutencao",
        status,
        ativo,
        responsavel_id: responsavelId,
        data_criacao: DATA_CRIACAO,
        data_limite_sla: new Date(limite),
    });
}

/** Cria o service com repositories de mentira (sem banco e sem arquivo). Um por cenário. */
function criarService(world: CustomWorld): ServiceNotificacao {
    if (world.data.servico) {
        return world.data.servico;
    }

    world.data.notificacoesGuardadas = [];

    const notificacoesFalsas = {
        listarTodas: async () => [...world.data.notificacoesGuardadas],
        salvarTodas: async (lista: Notificacao[]) => {
            world.data.notificacoesGuardadas = [...lista];
        },
    };
    const ordensFalsas = {
        listar: async () => world.data.ordens ?? [],
    };
    const funcionariosFalsos = {
        listar: async () => (world.data.gestores ?? []).map((id: number) => ({ id, tipo: "gestor" })),
    };

    world.data.servico = new ServiceNotificacao(
        notificacoesFalsas as unknown as RepositoryNotificacao,
        ordensFalsas as unknown as RepositoryOrdemServico,
        funcionariosFalsos as unknown as RepositoryFuncionario,
    );
    return world.data.servico;
}

// Preparação
Given(
    "que os gestores cadastrados têm os ids {int} e {int}",
    function (this: CustomWorld, gestor1: number, gestor2: number) {
        this.data.gestores = [gestor1, gestor2];
    }
);

Given(
    "que existe a O.S. ativa {int} com responsável {int} e limite em {string}",
    function (this: CustomWorld, id: number, responsavelId: number, limite: string) {
        adicionarOS(this, id, responsavelId, limite, "em_andamento", true);
    }
);

Given(
    "que existe a O.S. ativa {int} sem responsável e limite em {string}",
    function (this: CustomWorld, id: number, limite: string) {
        adicionarOS(this, id, null, limite, "em_andamento", true);
    }
);

Given(
    "que existe a O.S. concluída {int} com responsável {int} e limite em {string}",
    function (this: CustomWorld, id: number, responsavelId: number, limite: string) {
        adicionarOS(this, id, responsavelId, limite, "concluido", true);
    }
);

Given(
    "que existe a O.S. inativa {int} com responsável {int} e limite em {string}",
    function (this: CustomWorld, id: number, responsavelId: number, limite: string) {
        adicionarOS(this, id, responsavelId, limite, "em_andamento", false);
    }
);

// Ações
When(
    "a rotina de notificações roda em {string}",
    async function (this: CustomWorld, agora: string) {
        const servico = criarService(this);
        this.data.criadasNaUltimaRodada = await servico.gerarNotificacoesSla(new Date(agora));
    }
);

When(
    "as notificações são consultadas sem estar autenticado",
    async function (this: CustomWorld) {
        this.response = await api.get("/notificacoes");
    }
);

// Conferências
Then(
    "a última rodada cria {int} avisos novos",
    function (this: CustomWorld, esperado: number) {
        assert.equal(this.data.criadasNaUltimaRodada, esperado);
    }
);

Then(
    "o funcionário {int} recebe um aviso de {string} sobre a O.S. {int}",
    function (this: CustomWorld, funcionarioId: number, tipo: string, osId: number) {
        const recebeu = (this.data.notificacoesGuardadas as Notificacao[]).some(
            (notificacao) =>
                notificacao.funcionario_id === funcionarioId &&
                notificacao.tipo === tipo &&
                notificacao.os_id === osId,
        );
        assert.ok(recebeu, `O funcionário ${funcionarioId} não recebeu aviso de ${tipo} sobre a O.S. ${osId}`);
    }
);

Then(
    "a consulta de notificações é recusada por falta de login",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 401, JSON.stringify(this.response?.body));
    }
);