/**
 * Steps BDD dos anexos da O.S. (US#2.6 — 2.6-BE01 inclusão; 2.6-BE02 consulta e download).
 * Os cenários de API usam o endpoint real. O cenário de compensação instancia o ServiceAnexo com
 * um armazenamento em memória e um repositório que falha ao gravar, sem depender do Supabase Storage.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { randomUUID } from "crypto";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import {
    autorizacao,
    criarOrdemDeTeste,
    entrarGestorETecnico,
    obterOutroDepartamento,
    type Sessao,
} from "../support/sessao";
import { prisma } from "../../src/prisma/client";
import { env } from "../../src/config/env";
import { ServiceAnexo } from "../../src/services/serviceAnexo";
import { RepositoryAnexo } from "../../src/repositories/repositoryAnexo";
import { repositoryOrdemServico } from "../../src/repositories/repositoryOrdemServico";
import { serviceEscopoOrdemServico } from "../../src/services/serviceEscopoOrdemServico";
import type { ArmazenamentoAnexos } from "../../src/repositories/repositoryStorageAnexo";
import type { DadosCriacaoAnexo } from "../../src/models/modelAnexo";

/** Id que não existe no banco (maior INTEGER do Postgres). */
const ID_INEXISTENTE = 2_147_483_647;

/** Primeiros bytes de cada tipo, para o arquivo de teste passar na conferência de conteúdo. */
const CABECALHOS: Record<string, Buffer> = {
    "application/pdf": Buffer.from("%PDF-1.4\n"),
    "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    "image/jpeg": Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
};

/** Monta um arquivo de teste com o tamanho exato, começando com a assinatura do tipo. */
function montarArquivo(tipo: string, tamanho: number): Buffer {
    const arquivo = Buffer.alloc(tamanho, 0x20);
    (CABECALHOS[tipo] ?? Buffer.alloc(0)).copy(arquivo, 0);
    return arquivo;
}

const sessao = (world: CustomWorld, perfil: "gestor" | "tecnico"): Sessao => world.data[perfil];

/** Envia um anexo pela API e guarda a resposta no World. */
async function enviarAnexo(
    world: CustomWorld,
    perfil: "gestor" | "tecnico" | null,
    osId: number,
    nome: string,
    tipo: string,
    conteudo: Buffer,
    relato?: string,
) {
    const requisicao = api.post(`/ordens-servico/${osId}/anexos`);
    if (perfil !== null) {
        requisicao.set("Authorization", autorizacao(sessao(world, perfil)));
    }
    if (relato !== undefined) {
        requisicao.field("relato", relato);
    }
    world.response = await requisicao.attach("arquivo", conteudo, { filename: nome, contentType: tipo });
    world.data.anexoEnviado = { nome, tipo, tamanho: conteudo.length, perfil };
}

// Contexto
Given(
    "que o gestor e o técnico estão autenticados para os testes de anexo",
    async function (this: CustomWorld) {
        const { gestor, tecnico } = await entrarGestorETecnico();
        this.data.gestor = gestor;
        this.data.tecnico = tecnico;
    }
);

// O.S. de teste
Given(
    "que existe uma O.S. ativa sem responsável no departamento do técnico",
    async function (this: CustomWorld) {
        const os = await criarOrdemDeTeste(sessao(this, "gestor"), {
            departamentoId: sessao(this, "tecnico").funcionario.departamento_id,
        });
        this.data.osId = os.id;
    }
);

Given(
    "que existe uma O.S. ativa atribuída ao técnico",
    async function (this: CustomWorld) {
        const os = await criarOrdemDeTeste(sessao(this, "gestor"), {
            departamentoId: sessao(this, "gestor").funcionario.departamento_id,
            responsavelId: sessao(this, "tecnico").funcionario.id,
        });
        this.data.osId = os.id;
    }
);

Given(
    "que existe uma O.S. ativa sem responsável em outro departamento",
    async function (this: CustomWorld) {
        const gestor = sessao(this, "gestor");
        const outroDepartamento = await obterOutroDepartamento(gestor, sessao(this, "tecnico").funcionario.departamento_id);
        const os = await criarOrdemDeTeste(gestor, { departamentoId: outroDepartamento });
        this.data.osId = os.id;
    }
);

// Envio
When(
    /^o (gestor|técnico) envia o anexo "([^"]+)" do tipo "([^"]+)" com (\d+) bytes$/,
    async function (this: CustomWorld, quem: string, nome: string, tipo: string, tamanho: string) {
        const perfil = quem === "gestor" ? "gestor" : "tecnico";
        await enviarAnexo(this, perfil, this.data.osId, nome, tipo, montarArquivo(tipo, Number(tamanho)));
    }
);

When(
    "o gestor envia o arquivo {string} como {string} com conteúdo de outro formato",
    async function (this: CustomWorld, nome: string, tipo: string) {
        // Começa como um executável do Windows ("MZ"), não como PDF
        const conteudo = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(510, 0x00)]);
        await enviarAnexo(this, "gestor", this.data.osId, nome, tipo, conteudo);
    }
);

When(
    "alguém sem token envia um anexo para a O.S.",
    async function (this: CustomWorld) {
        await enviarAnexo(this, null, this.data.osId, "laudo.pdf", "application/pdf", montarArquivo("application/pdf", 128));
    }
);

When(
    "o gestor envia um anexo para uma O.S. inexistente",
    async function (this: CustomWorld) {
        await enviarAnexo(this, "gestor", ID_INEXISTENTE, "laudo.pdf", "application/pdf", montarArquivo("application/pdf", 128));
    }
);

When(
    "o banco falha ao gravar os metadados de um anexo já enviado ao armazenamento",
    async function (this: CustomWorld) {
        const enviados: string[] = [];
        const removidos: string[] = [];
        const armazenamentoEmMemoria: ArmazenamentoAnexos = {
            async enviar(caminho) {
                enviados.push(caminho);
            },
            async remover(caminho) {
                removidos.push(caminho);
            },
            async baixar() {
                throw new Error("não usado neste cenário");
            },
        };

        class RepositoryAnexoQueFalha extends RepositoryAnexo {
            override async criar(_dados: DadosCriacaoAnexo): Promise<never> {
                throw new Error("Falha simulada ao gravar os metadados");
            }
        }

        const service = new ServiceAnexo(
            new RepositoryAnexoQueFalha(),
            repositoryOrdemServico,
            armazenamentoEmMemoria,
            serviceEscopoOrdemServico,
            env.anexos,
        );

        const gestor = sessao(this, "gestor").funcionario;
        await assert.rejects(
            service.anexar(
                this.data.osId,
                {
                    nomeOriginal: "laudo.pdf",
                    tipo: "application/pdf",
                    tamanho: 256,
                    conteudo: montarArquivo("application/pdf", 256),
                },
                gestor
            ),
            /Falha simulada/
        );
        this.data.armazenamento = { enviados, removidos };
    }
);

// Resultados
Then(
    "o anexo é gravado com nome, tamanho, autor e data",
    async function (this: CustomWorld) {
        const resposta = this.response;
        const enviado = this.data.anexoEnviado;
        assert.equal(resposta?.status, 201, `Esperava 201, recebeu ${resposta?.status}: ${JSON.stringify(resposta?.body)}`);

        const autor = sessao(this, enviado.perfil);
        assert.equal(resposta.body.nome, enviado.nome);
        assert.equal(resposta.body.tamanho, enviado.tamanho);
        assert.equal(resposta.body.tipo, enviado.tipo);
        assert.equal(resposta.body.autor.id, autor.funcionario.id);
        assert.ok(!Number.isNaN(new Date(resposta.body.data).getTime()), "data inválida");
        assert.equal(resposta.body.caminho, undefined, "o caminho no Storage não deve ser exposto");

        const gravado = await prisma.anexos.findUnique({ where: { id: resposta.body.id } });
        assert.ok(gravado, "metadados não foram gravados no banco");
        assert.equal(Number(gravado.tamanho_bytes), enviado.tamanho);
        assert.match(gravado.caminho, new RegExp(`^os_${this.data.osId}/[0-9a-f-]{36}_`));
        this.data.anexoId = resposta.body.id;
    }
);

Then(
    "a auditoria registra a inclusão do anexo",
    async function (this: CustomWorld) {
        const registro = await prisma.auditoria.findFirst({
            where: { os_id: this.data.osId, campo_alterado: "anexo", acao: "insercao" },
            orderBy: { id: "desc" },
        });
        assert.ok(registro, "a inclusão do anexo não foi auditada");
        assert.equal(registro.funcionario_id, sessao(this, "gestor").funcionario.id);
        assert.equal(JSON.parse(registro.dado_novo ?? "{}").anexo_id, this.data.anexoId);
        assert.ok(registro.data_modificacao instanceof Date);
    }
);

Then(
    "a API rejeita o anexo com status {int}",
    function (this: CustomWorld, status: number) {
        assert.equal(this.response?.status, status, `Esperava ${status}, recebeu ${this.response?.status}: ${JSON.stringify(this.response?.body)}`);
        assert.equal(typeof this.response?.body?.mensagem, "string", "a resposta de erro deve ter { mensagem }");
    }
);

Then(
    "nenhum anexo fica gravado na O.S.",
    async function (this: CustomWorld) {
        const quantidade = await prisma.anexos.count({ where: { os_id: this.data.osId } });
        assert.equal(quantidade, 0);
    }
);

Then(
    "o arquivo enviado é removido do armazenamento",
    function (this: CustomWorld) {
        const { enviados, removidos } = this.data.armazenamento;
        assert.equal(enviados.length, 1, "o arquivo deveria ter sido enviado ao armazenamento");
        assert.deepEqual(removidos, enviados, "o arquivo enviado deveria ter sido removido (compensação)");
    }
);

// Consulta e download (2.6-BE02)
Given(
    "que a O.S. já possui os anexos {string} e {string}",
    async function (this: CustomWorld, primeiro: string, segundo: string) {
        this.data.anexos = {};
        for (const [nome, tipo] of [[primeiro, "application/pdf"], [segundo, "image/png"]] as const) {
            const conteudo = montarArquivo(tipo, 4096);
            conteudo.write(randomUUID(), 64); // conteúdo diferente a cada execução
            await enviarAnexo(this, "gestor", this.data.osId, nome, tipo, conteudo);
            assert.equal(this.response?.status, 201, `Falha ao anexar: ${JSON.stringify(this.response?.body)}`);
            this.data.anexos[nome] = { id: this.response.body.id, tipo, conteudo };
        }
        this.data.auditoriasAntes = await prisma.auditoria.count({ where: { os_id: this.data.osId } });
    }
);

Given(
    "que a O.S. possui um anexo registrado",
    async function (this: CustomWorld) {
        // Só os metadados: os cenários que usam este step são barrados antes de acessar o Storage
        const registro = await prisma.anexos.create({
            data: {
                os_id: this.data.osId,
                funcionario_id: sessao(this, "gestor").funcionario.id,
                nome: "registro-de-teste.pdf",
                tipo: "application/pdf",
                tamanho_bytes: 10n,
                caminho: `os_${this.data.osId}/teste_${randomUUID()}.pdf`,
            },
        });
        this.data.anexoRegistradoId = registro.id;
    }
);

When(
    "o técnico lista os anexos da O.S.",
    async function (this: CustomWorld) {
        this.response = await api
            .get(`/ordens-servico/${this.data.osId}/anexos`)
            .set("Authorization", autorizacao(sessao(this, "tecnico")));
    }
);


When(
    "o técnico baixa o anexo {string}",
    async function (this: CustomWorld, nome: string) {
        const anexo = this.data.anexos[nome];
        this.data.anexoBaixado = { nome, ...anexo };
        this.response = await api
            .get(`/ordens-servico/${this.data.osId}/anexos/${anexo.id}/download`)
            .set("Authorization", autorizacao(sessao(this, "tecnico")))
            .buffer(true)
            .parse((res, callback) => {
                // Lê o corpo como Buffer (o download é binário)
                const corpo = res as unknown as NodeJS.ReadableStream;
                const partes: Buffer[] = [];
                corpo.on("data", (parte: Buffer) => partes.push(parte));
                corpo.on("end", () => callback(null, Buffer.concat(partes)));
            });
    }
);

When(
    "o técnico tenta baixar o anexo registrado",
    async function (this: CustomWorld) {
        this.response = await api
            .get(`/ordens-servico/${this.data.osId}/anexos/${this.data.anexoRegistradoId}/download`)
            .set("Authorization", autorizacao(sessao(this, "tecnico")));
    }
);

When(
    "o gestor tenta excluir o anexo registrado",
    async function (this: CustomWorld) {
        this.response = await api
            .delete(`/ordens-servico/${this.data.osId}/anexos/${this.data.anexoRegistradoId}`)
            .set("Authorization", autorizacao(sessao(this, "gestor")));
    }
);

Then(
    "a lista contém exatamente os anexos gravados com nome, tamanho, autor e data",
    async function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        const lista: { id: number; nome: string; tamanho: number; autor: { id: number; nome: string }; data: string }[] =
            this.response.body;

        const gravados = await prisma.anexos.findMany({ where: { os_id: this.data.osId } });
        assert.deepEqual(
            lista.map((anexo) => anexo.id).sort((a, b) => a - b),
            gravados.map((anexo) => anexo.id).sort((a, b) => a - b),
        );
        for (const item of lista) {
            const gravado = gravados.find((anexo) => anexo.id === item.id);
            assert.ok(gravado);
            assert.equal(item.nome, gravado.nome);
            assert.equal(item.tamanho, Number(gravado.tamanho_bytes));
            assert.equal(item.autor.id, gravado.funcionario_id);
            assert.equal(typeof item.autor.nome, "string");
            assert.equal(new Date(item.data).getTime(), gravado.data_upload.getTime());
        }
    }
);

Then(
    "o arquivo baixado é idêntico ao enviado",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 200, `Download falhou: ${this.response?.status}`);
        assert.ok(Buffer.isBuffer(this.response.body), "o corpo do download deveria ser binário");
        assert.ok(this.response.body.equals(this.data.anexoBaixado.conteudo), "o arquivo baixado não é idêntico ao enviado");
    }
);

Then(
    "a resposta do download traz nome, tipo e tamanho nos cabeçalhos",
    function (this: CustomWorld) {
        const cabecalhos = this.response?.headers ?? {};
        const { nome, tipo, conteudo } = this.data.anexoBaixado;
        assert.match(cabecalhos["content-disposition"] ?? "", /^attachment;/);
        assert.ok(
            (cabecalhos["content-disposition"] ?? "").includes(`filename*=UTF-8''${encodeURIComponent(nome)}`),
            `Content-Disposition sem o nome original: ${cabecalhos["content-disposition"]}`,
        );
        assert.equal(cabecalhos["content-type"], tipo);
        assert.equal(Number(cabecalhos["content-length"]), conteudo.length);
    }
);

Then(
    "a consulta não gera registro de auditoria",
    async function (this: CustomWorld) {
        const depois = await prisma.auditoria.count({ where: { os_id: this.data.osId } });
        assert.equal(depois, this.data.auditoriasAntes);
    }
);

Then(
    "o anexo registrado continua gravado",
    async function (this: CustomWorld) {
        const anexo = await prisma.anexos.findUnique({ where: { id: this.data.anexoRegistradoId } });
        assert.ok(anexo, "o anexo não deveria ter sido excluído");
    }
);

// Relato e configuração (integração com o frontend)
When(
    "o gestor envia o anexo {string} com o relato {string}",
    async function (this: CustomWorld, nome: string, relato: string) {
        await enviarAnexo(this, "gestor", this.data.osId, nome, "application/pdf", montarArquivo("application/pdf", 512), relato);
    }
);

When(
    "o gestor envia o anexo {string} com um relato de {int} caracteres",
    async function (this: CustomWorld, nome: string, tamanho: number) {
        await enviarAnexo(this, "gestor", this.data.osId, nome, "application/pdf", montarArquivo("application/pdf", 512), "r".repeat(tamanho));
    }
);

When("o técnico consulta a configuração dos anexos", async function (this: CustomWorld) {
    this.response = await api.get("/anexos/configuracao").set("Authorization", autorizacao(sessao(this, "tecnico")));
});

Then("o anexo é gravado com o relato {string}", async function (this: CustomWorld, relato: string) {
    assert.equal(this.response?.status, 201, JSON.stringify(this.response?.body));
    assert.equal(this.response.body.relato, relato);
    const gravado = await prisma.anexos.findUnique({ where: { id: this.response.body.id } });
    assert.equal(gravado?.relato, relato);
    this.data.anexoId = this.response.body.id;
});

Then("a auditoria registra o relato {string}", async function (this: CustomWorld, relato: string) {
    const registro = await prisma.auditoria.findFirst({
        where: { os_id: this.data.osId, campo_alterado: "anexo", acao: "insercao" },
        orderBy: { id: "desc" },
    });
    assert.equal(registro?.justificativa, relato);
});

Then(
    "a configuração informa o limite de {int} bytes e os tipos aceitos",
    function (this: CustomWorld, limite: number) {
        assert.equal(this.response?.status, 200, JSON.stringify(this.response?.body));
        assert.equal(this.response.body.tamanho_maximo_bytes, limite);
        assert.ok(Array.isArray(this.response.body.tipos_permitidos) && this.response.body.tipos_permitidos.length > 0);
        assert.ok(Array.isArray(this.response.body.extensoes_permitidas));
        assert.equal(typeof this.response.body.quantidade_maxima_por_os, "number");
    }
);
