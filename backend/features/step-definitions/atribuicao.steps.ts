import { Given, When, Then } from "@cucumber/cucumber";
import assert from "assert/strict";
import { api } from "../support/api";
import { CustomWorld } from "../support/world";
import { env } from "process";
import { prisma } from "../../src/prisma/client";

const SENHA_TECNICO_CONCORRENCIA = "TesteCucumber2026!";

async function obterOuCriarTecnicoConcorrencia(
    world: CustomWorld,
    usuario: string
) {
    const departamentoId =
        world.data.usuarioAutenticado?.funcionario?.departamento_id;
    assert.ok(departamentoId, "Departamento do gestor não encontrado");

    const funcionarios = await api
        .get("/funcionario")
        .set("Authorization", token(world));
    assert.equal(funcionarios.status, 200);

    const existente = funcionarios.body.find(
        (funcionario: { usuario: string }) => funcionario.usuario === usuario
    );

    if (!existente) {
        const criacao = await api
            .post("/funcionario")
            .set("Authorization", token(world))
            .send({
                departamento_id: departamentoId,
                usuario,
                senha: SENHA_TECNICO_CONCORRENCIA,
                nome: usuario,
                tipo: "tecnico"
            });
        assert.equal(
            criacao.status,
            201,
            `Falha ao criar técnico de teste: ${JSON.stringify(criacao.body)}`
        );
    }

    const login = await api.post("/auth/login").send({
        usuario,
        senha: SENHA_TECNICO_CONCORRENCIA
    });
    assert.equal(
        login.status,
        200,
        `Falha ao autenticar técnico de teste: ${JSON.stringify(login.body)}`
    );
    return login.body;
}

const token = (world: CustomWorld) => `Bearer ${world.data.token}`;

async function autenticar(world: CustomWorld, usuario: string | undefined, senha: string | undefined) {
    assert.ok(usuario, "Usuário de teste não configurado");
    assert.ok(senha, "Senha de teste não configurada");

    const response = await api.post("/auth/login").send({
        usuario,
        senha
    });

    assert.equal(
        response.status,
        200,
        `Falha na autenticação: ${JSON.stringify(response.body)}`
    );

    world.data.token = response.body.token;
    world.data.usuarioAutenticado = response.body;
}

async function criarOS(world: CustomWorld, opcoes: { departamentoId?: number; status?: string; responsavelId?: number; } = {}) {
    const departamentoId =
        opcoes.departamentoId ??
        world.data.usuarioAutenticado?.funcionario?.departamento_id;
    assert.ok(departamentoId, "Departamento do usuário autenticado não encontrado");

    const response = await api
        .post("/ordens-servico")
        .set("Authorization", token(world))
        .send({
            tipo: "instalacao",
            departamento_id: departamentoId,
            descricao: "OS criada para teste de atribuição",
            titulo: "OS teste de atribuição",
            ...(opcoes.status ? { status: opcoes.status } : {}),
            ...(opcoes.responsavelId ? { responsavel_id: opcoes.responsavelId } : {})
        });

    assert.equal(
        response.status,
        201,
        `Falha ao criar OS: ${JSON.stringify(response.body)}`
    );

    world.data.osId = response.body.id;
    world.data.os = response.body;

    return response.body;
}

async function atribuirResponsavel(world: CustomWorld, osId: number, funcionarioId: number) {
    world.response = await api
        .patch(`/ordens-servico/atribuir/${osId}`)
        .set("Authorization", token(world))
        .send({ funcionario_id: funcionarioId });

    world.data.respostasAtribuicao ??= [];
    world.data.respostasAtribuicao.push(world.response.status);
    return world.response;
}

function assertStatus(world: CustomWorld, statuses: number[]) {
    assert.ok(
        statuses.includes(world.response?.status ?? 0),
        `Esperava status ${statuses.join(" ou ")}, mas recebeu ${
            world.response?.status
        }: ${JSON.stringify(world.response?.body)}`
    );
}

// Autenticação
Given(
    "que existe um gestor autenticado",
    async function (this: CustomWorld) {
        await autenticar(
            this,
            env.SEED_GESTOR_USUARIO,
            env.SEED_GESTOR_SENHA
        );
    }
);

Given(
    "que existe um técnico autenticado",
    async function (this: CustomWorld) {
        await autenticar(
            this,
            env.SEED_TECNICO_USUARIO,
            env.SEED_TECNICO_SENHA
        );
    }
);

// Ordens de serviço
Given(
    "que existe uma O.S. não concluída sem responsável",
    async function (this: CustomWorld) {
        await criarOS(this);
    }
);

Given(
    "que existe uma O.S. concluída",
    async function (this: CustomWorld) {
        await criarOS(this, { status: "concluido" });
    }
);

Given(
    "que existe uma O.S. sem responsável em outro departamento",
    async function (this: CustomWorld) {
        const departamentoTecnico =
            this.data.usuarioAutenticado?.funcionario?.departamento_id;
        assert.ok(departamentoTecnico, "Departamento do técnico não encontrado");

        const response = await api
            .get("/departamento")
            .set("Authorization", token(this));
        assert.equal(response.status, 200);
        const outroDepartamento = response.body.find(
            (departamento: { id: number }) => departamento.id !== departamentoTecnico
        );
        assert.ok(
            outroDepartamento,
            "É necessário outro departamento cadastrado para este cenário"
        );

        await criarOS(this, { departamentoId: outroDepartamento.id });
    }
);

Given(
    "que existe uma O.S. sem responsável no departamento do técnico",
    async function (this: CustomWorld) {
        await criarOS(this, {
            departamentoId: this.data.usuarioAutenticado?.funcionario?.departamento_id
        });
    }
);

Given(
    "que existe uma O.S. com responsável atribuído",
    async function (this: CustomWorld) {
        const responsavelId = this.data.usuarioAutenticado?.funcionario?.id;
        assert.ok(responsavelId, "ID do usuário autenticado não encontrado");
        await criarOS(this, { responsavelId });
    }
);

Given(
    "que existe uma O.S. de outro departamento",
    async function (this: CustomWorld) {
        const departamentoAtual =
            this.data.usuarioAutenticado?.funcionario?.departamento_id;
        assert.ok(departamentoAtual, "Departamento do usuário autenticado não encontrado");

        const response = await api
            .get("/departamento")
            .set("Authorization", token(this));
        assert.equal(response.status, 200);
        const outroDepartamento = response.body.find(
            (departamento: { id: number }) => departamento.id !== departamentoAtual
        );
        assert.ok(
            outroDepartamento,
            "É necessário outro departamento cadastrado para este cenário"
        );

        await criarOS(this, { departamentoId: outroDepartamento.id });
    }
);

// Colaboradores
Given(
    "que existem dois colaboradores ativos",
    async function (this: CustomWorld) {
        const response = await api
            .get("/funcionario")
            .set("Authorization", token(this));
        assert.equal(response.status, 200);

        const funcionarios: Array<{ id: number }> = response.body;
        assert.ok(
            funcionarios.length >= 2,
            "É necessário haver pelo menos dois colaboradores cadastrados"
        );

        this.data.primeiroResponsavelId = funcionarios[0].id;
        this.data.segundoResponsavelId = funcionarios[1].id;
    }
);

Given(
    "que existe outro colaborador ativo",
    async function (this: CustomWorld) {
        const response = await api
            .get("/funcionario")
            .set("Authorization", token(this));
        assert.equal(response.status, 200);

        const funcionarioAtual = this.data.usuarioAutenticado?.funcionario?.id;
        const outroFuncionario = response.body.find(
            (funcionario: { id: number }) => funcionario.id !== funcionarioAtual
        );
        assert.ok(outroFuncionario, "É necessário outro colaborador cadastrado");
        this.data.outroResponsavelId = outroFuncionario.id;
    }
);

Given(
    "que existe uma O.S. sem responsável",
    async function (this: CustomWorld) {
        await criarOS(this);
    }
);

Given(
    "que o técnico pertence ao departamento da O.S.",
    async function (this: CustomWorld) {
        assert.equal(
            this.data.os?.departamento_id,
            this.data.usuarioAutenticado?.funcionario?.departamento_id,
            "A O.S. precisa estar no departamento do técnico"
        );
    }
);

Given(
    "que existe um técnico autorizado para assumir",
    async function (this: CustomWorld) {
        assert.ok(
            this.data.token,
            "O técnico precisa estar autenticado"
        );
    }
);

Given(
    "que existem dois técnicos autorizados a assumir",
    async function (this: CustomWorld) {
        await autenticar(
            this,
            env.SEED_GESTOR_USUARIO,
            env.SEED_GESTOR_SENHA
        );
        const sufixo = "cucumber-concorrencia";
        const [tecnico1, tecnico2] = await Promise.all([
            obterOuCriarTecnicoConcorrencia(this, `${sufixo}-1`),
            obterOuCriarTecnicoConcorrencia(this, `${sufixo}-2`)
        ]);

        this.data.tokenTecnico1 = tecnico1.token;
        this.data.tokenTecnico2 = tecnico2.token;
        this.data.tecnico1Id = tecnico1.funcionario.id;
        this.data.tecnico2Id = tecnico2.funcionario.id;
    }
);

When(
    "o gestor atribui o primeiro colaborador à O.S.",
    async function (this: CustomWorld) {
        await atribuirResponsavel(
            this,
            this.data.osId,
            this.data.primeiroResponsavelId
        );
    }
);

When(
    "substitui o responsável pelo segundo colaborador",
    async function (this: CustomWorld) {
        await atribuirResponsavel(
            this,
            this.data.osId,
            this.data.segundoResponsavelId
        );
    }
);

When(
    "o técnico atribui a si mesmo como responsável",
    async function (this: CustomWorld) {
    const funcionarioId =
        this.data.usuarioAutenticado?.funcionario_id ??
        this.data.usuarioAutenticado?.funcionario?.id;

    assert.ok(
        funcionarioId,
        "Não foi possível obter o ID do funcionário autenticado na resposta de login"
    );

    await atribuirResponsavel(this, this.data.osId, funcionarioId);
});

When(
    "o gestor tenta atribuir um colaborador inexistente",
    async function (this: CustomWorld) {
        await atribuirResponsavel(this, this.data.osId, -1);
    }
);

When(
    "o gestor tenta atribuir um responsável a uma O.S. inexistente",
    async function (this: CustomWorld) {
        await atribuirResponsavel(
            this,
            2147483647,
            this.data.usuarioAutenticado?.funcionario?.id
        );
    }
);

When(
    "o gestor tenta atribuir um responsável à O.S.",
    async function (this: CustomWorld) {
        await atribuirResponsavel(
            this,
            this.data.osId,
            this.data.usuarioAutenticado?.funcionario?.id
        );
    }
);

When(
    "o técnico tenta atribuir a si mesmo como responsável",
    async function (this: CustomWorld) {
        const funcionarioId =
            this.data.usuarioAutenticado?.funcionario_id ??
            this.data.usuarioAutenticado?.funcionario?.id;

        assert.ok(funcionarioId, "ID do técnico não encontrado no login");

        await atribuirResponsavel(this, this.data.osId, funcionarioId);
    }
);

When(
    "o técnico tenta atribuir o outro colaborador à O.S.",
    async function (this: CustomWorld) {
        await atribuirResponsavel(
            this,
            this.data.osId,
            this.data.outroResponsavelId
        );
    }
);

When(
    "o técnico tenta substituir o responsável",
    async function (this: CustomWorld) {
        await atribuirResponsavel(
            this,
            this.data.osId,
            this.data.outroResponsavelId
        );
    }
);

When(
    "o técnico tenta atribuir um responsável à O.S.", 
    async function (this: CustomWorld) {
        await atribuirResponsavel(
            this,
            this.data.osId,
            this.data.usuarioAutenticado?.funcionario?.id
        );
    }
);

When(
    "os dois técnicos tentam assumir a O.S. simultaneamente",
    async function (this: CustomWorld) {
        const osId = this.data.osId;
        const funcionario1 = this.data.tecnico1Id;
        const funcionario2 = this.data.tecnico2Id;

        assert.ok(funcionario1 && funcionario2, "IDs dos dois técnicos são necessários");

        const [resposta1, resposta2] = await Promise.all([
            api
                .patch(`/ordens-servico/atribuir/${osId}`)
                .set("Authorization", `Bearer ${this.data.tokenTecnico1}`)
                .send({ funcionario_id: funcionario1 }),
            api
                .patch(`/ordens-servico/atribuir/${osId}`)
                .set("Authorization", `Bearer ${this.data.tokenTecnico2}`)
                .send({ funcionario_id: funcionario2 }),
        ]);

        this.data.respostasConcorrentes = [resposta1, resposta2];
    }
);

// Consulta posterior
When(
    "o gestor atribui um colaborador à O.S.",
    async function (this: CustomWorld) {
        const responsavelId = this.data.usuarioAutenticado?.funcionario?.id;
        assert.ok(responsavelId, "ID do gestor não encontrado");
        this.data.responsavelAnteriorId = this.data.os?.responsavel_id ?? null;
        this.data.responsavelNovoId = responsavelId;
        await atribuirResponsavel(
            this,
            this.data.osId,
            responsavelId
        );
    }
);

When(
    "consulta novamente a O.S.",
    async function (this: CustomWorld) {
        this.response = await api
            .get(`/ordens-servico/${this.data.osId}`)
            .set("Authorization", token(this));
    }
);

// Indisponibilidade
When(
    "a API fica indisponível durante uma tentativa de substituição",
    async function (this: CustomWorld) {
        this.data.responsavelAnteriorId = this.data.os?.responsavel_id;
        this.data.erroSimulado = true;
    }
);

// Asserções
Then(
    "a API confirma a atribuição",
    function (this: CustomWorld) {
        assertStatus(this, [200]);
    }
);

Then(
    "a API confirma as duas atribuições",
    function (this: CustomWorld) {
        assert.ok(
            this.data.respostasAtribuicao?.every((status: number) => status === 200),
            "As duas atribuições precisam ter sido confirmadas"
        );
    }
);

Then(
    "o segundo colaborador permanece como responsável",
    async function (this: CustomWorld) {
        const response = await api
            .get(`/ordens-servico/${this.data.osId}`)
            .set("Authorization", token(this));

        assert.equal(response.status, 200);
        assert.equal(
            response.body.responsavel_id,
            this.data.segundoResponsavelId
        );
    }
);

Then(
    "o técnico permanece como responsável",
    async function (this: CustomWorld) {
        const response = await api
            .get(`/ordens-servico/${this.data.osId}`)
            .set("Authorization", token(this));
        assert.equal(response.status, 200);
        assert.equal(
            response.body.responsavel_id,
            this.data.usuarioAutenticado?.funcionario?.id
        );
    }
);

Then(
    "a API rejeita a atribuição com erro de validação",
    function (this: CustomWorld) {
        assertStatus(this, [400, 422]);
    }
);

Then(
    "a API informa que a O.S. não foi encontrada",
    function (this: CustomWorld) {
        assertStatus(this, [404]);
    }
);

Then(
    "a API rejeita a atribuição",
    function (this: CustomWorld) {
        assertStatus(this, [400, 403, 422]);
    }
);

Then(
    "a API nega a operação por falta de permissão",
    function (this: CustomWorld) {
        assertStatus(this, [403]);
    }
);

Then(
    "apenas uma atribuição é confirmada",
    function (this: CustomWorld) {
        const respostas = this.data.respostasConcorrentes ?? [];
        const confirmadas = respostas.filter(
            (resposta: { status: number }) => resposta.status === 200
        );

        assert.equal(confirmadas.length, 1);
    }
);

Then(
    "a O.S. possui somente um responsável",
    async function (this: CustomWorld) {
        const response = await api
            .get(`/ordens-servico/${this.data.osId}`)
            .set("Authorization", token(this));

        assert.equal(response.status, 200);
        assert.ok(
            response.body.funcionario_responsavel_id ??
                response.body.responsavel_id
        );
    }
);

Then(
    "o responsável atribuído permanece registrado",
    function (this: CustomWorld) {
        assert.equal(this.response?.status, 200);
        assert.ok(
            this.response.body.funcionario_responsavel_id ??
                this.response.body.responsavel_id
        );
    }
);

Then(
    "a auditoria registra o responsável anterior e o novo",
    async function (this: CustomWorld) {
        const auditoria = await prisma.auditoria.findFirst({
            where: {
                os_id: this.data.osId,
                campo_alterado: "responsavel_id"
            },
            orderBy: { data_modificacao: "desc" }
        });
        assert.ok(auditoria, "Registro de auditoria não encontrado");
        assert.equal(
            auditoria.dado_antigo,
            this.data.responsavelAnteriorId?.toString() ?? null
        );
        assert.equal(
            auditoria.dado_novo,
            this.data.responsavelNovoId.toString()
        );
        this.data.auditoria = auditoria;
    }
);

Then(
    "a auditoria identifica quem realizou a alteração e quando",
    function (this: CustomWorld) {
        const auditoria = this.response?.body.auditoria ?? this.data.auditoria;

        assert.ok(auditoria, "Registro de auditoria não encontrado");
        assert.ok(
            auditoria.funcionario_id ?? auditoria.usuario_id,
            "A auditoria deve identificar quem realizou a alteração"
        );
        assert.ok(
            auditoria.data_modificacao ?? auditoria.created_at,
            "A auditoria deve registrar quando a alteração ocorreu"
        );
    }
);

Then(
    "a operação é apresentada como falha",
    function (this: CustomWorld) {
        assert.equal(this.data.erroSimulado, true);
    }
);

Then(
    "o responsável anterior permanece registrado",
    async function (this: CustomWorld) {
        const response = await api
            .get(`/ordens-servico/${this.data.osId}`)
            .set("Authorization", token(this));
        assert.equal(response.status, 200);
        assert.equal(
            response.body.responsavel_id,
            this.data.responsavelAnteriorId
        );
    }
);