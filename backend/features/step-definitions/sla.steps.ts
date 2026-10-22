import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { CustomWorld } from "../support/world";
import { calcularEstadoSla, type DadosSla } from "../../src/utils/estadoSla";

/** Os estados que a API pode devolver no campo estado_sla. */
const ESTADOS_VALIDOS = ["sem_sla", "normal", "em_risco", "vencido", "encerrada"];

// Teste da função, sem API e sem banco
Given(
    "uma O.S. do tipo {string} com status {string}, criada em {string} e com limite em {string}",
    function (this: CustomWorld, tipo: string, status: string, criacao: string, limite: string) {
        const ordem: DadosSla = {
            tipo,
            status,
            data_criacao: new Date(criacao),
            data_limite_sla: limite === "sem limite" ? null : new Date(limite),
        };
        this.data.ordemSla = ordem;
    }
);

When(
    "o estado do SLA é calculado em {string}",
    function (this: CustomWorld, agora: string) {
        this.data.estadoSla = calcularEstadoSla(this.data.ordemSla, new Date(agora));
    }
);

Then(
    "o estado do SLA é {string}",
    function (this: CustomWorld, esperado: string) {
        assert.equal(this.data.estadoSla, esperado);
    }
);

// Teste pela API
Then(
    "a resposta traz um estado de SLA válido",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        assert.ok(
            ESTADOS_VALIDOS.includes(this.response?.body.estado_sla),
            `estado_sla inválido: ${this.response?.body.estado_sla}`
        );
    }
);