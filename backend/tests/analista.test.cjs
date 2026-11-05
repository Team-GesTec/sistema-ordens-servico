/** Cenários do Analista: API, regras de criação e transação de auditoria, sem banco externo. */
const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

// A inicialização usa somente credenciais fictícias; todos os acessos a dados são substituídos.
process.env.DATABASE_URL = 'postgresql://teste:teste@127.0.0.1:1/teste';
process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-analista-123456';
const request = require('supertest');
const { criarApp } = require('../src/app.ts');
const { serviceAuth } = require('../src/services/serviceAuth.ts');
const { ServiceOrdemServico, serviceOrdemServico } = require('../src/services/serviceOrdemServico.ts');
const { ServiceFuncionario } = require('../src/services/serviceFuncionario.ts');
const { repositoryFuncionario } = require('../src/repositories/repositoryFuncionario.ts');
const { RepositoryOrdemServico } = require('../src/repositories/repositoryOrdemServico.ts');
const { ordemServicoCache } = require('../src/cache/ordemServicoCache.ts');
const analista = { id: 11, tipo: 'analista', ativo: true, departamento_id: 1, nome: 'Analista', usuario: 'analista' };
const corpo = { tipo: 'instalacao', titulo: 'Nova demanda', descricao: 'Descrição', departamento_id: 2, sla_manual: false };
const status403 = (erro) => erro.statusCode === 403;
afterEach(() => mock.restoreAll());

function criarService() {
    let salvo;
    const repositorio = {
        criar: async (dados) => { salvo = { ...dados, id: 71 }; return salvo; },
        buscarPorId: async () => null,
    };
    const funcionarios = { buscarPorId: async () => analista };
    const service = new ServiceOrdemServico(repositorio, funcionarios);
    mock.method(service, 'criarComAuditoria', async (dados, registros) => {
        assert.ok(registros.some((registro) => registro.acao === 'insercao' && registro.funcionario_id === analista.id));
        return repositorio.criar(dados);
    });
    return { service, salvo: () => salvo };
}

test('Analista escolhe outro departamento; responsável e status enviados não prevalecem', async () => {
    const { service } = criarService();
    const os = await service.criar({ ...corpo, responsavel_id: 88, status: 'concluido', solicitante_id: 999 }, analista);
    assert.equal(os.departamento_id, 2);
    assert.equal(os.responsavel_id, null);
    assert.equal(os.status, 'em_andamento');
    assert.equal(os.solicitante_id, analista.id);
    assert.equal(os.sla_manual, false);
});

for (const campo of [
    { sla_manual: true }, { sla_manual: 'false' }, { prazo_dias_uteis: 4 },
    { data_limite_sla: '2026-12-01' }, { justificativa_sla_manual: 'Alterar prazo' },
]) {
    test(`Analista não configura SLA no POST: ${JSON.stringify(campo)}`, async () => {
        const { service, salvo } = criarService();
        await assert.rejects(service.criar({ ...corpo, ...campo }, analista), status403);
        assert.equal(salvo(), undefined);
    });
}

test('Campos de SLA calculados pelo sistema não são aceitos nem nulos', async () => {
    const { service } = criarService();
    await assert.rejects(service.criar({ ...corpo, prazo_dias_uteis: null, data_limite_sla: null }, analista), (erro) => erro.statusCode === 400);
});

test('Analista não atribui responsável mesmo chamando o service diretamente', async () => {
    const { service } = criarService();
    await assert.rejects(service.atribuirResponsavel(71, 11, 11), status403);
});

for (const tipo of ['gestor', 'tecnico']) {
    test(`Preserva criação de O.S. pelo ${tipo}`, async () => {
        const { service } = criarService();
        const os = await service.criar({ ...corpo, responsavel_id: 11 }, { ...analista, tipo });
        assert.equal(os.responsavel_id, 11);
    });
}

function autenticar() {
    mock.method(repositoryFuncionario, 'buscarPorId', async () => analista);
    return `Bearer ${serviceAuth.gerarToken(analista)}`;
}

test('API permite consultar O.S. e autentica o perfil Analista no token', async () => {
    const token = autenticar();
    mock.method(serviceOrdemServico, 'listar', async () => [{ id: 71 }]);
    mock.method(serviceOrdemServico, 'buscarPorId', async () => ({ id: 71 }));
    await request(criarApp()).get('/ordens-servico').set('Authorization', token).expect(200);
    await request(criarApp()).get('/ordens-servico/71').set('Authorization', token).expect(200);
    const me = await request(criarApp()).get('/auth/me').set('Authorization', token).expect(200);
    assert.equal(me.body.tipo, 'analista');
});

test('API permite criar O.S. usando a identidade autenticada', async () => {
    const token = autenticar();
    const { service } = criarService();
    mock.method(serviceOrdemServico, 'criar', (dados, usuario) => service.criar(dados, usuario));
    const resposta = await request(criarApp()).post('/ordens-servico').set('Authorization', token).send(corpo).expect(201);
    assert.equal(resposta.body.responsavel_id, null);
    assert.equal(resposta.body.departamento_id, 2);
    assert.equal(resposta.body.solicitante_id, analista.id);
    await request(criarApp()).post('/ordens-servico').set('Authorization', token).send({ ...corpo, sla_manual: true }).expect(403);
});

for (const [metodo, rota] of [
    ['patch', '/ordens-servico/71'], ['put', '/ordens-servico/71'], ['delete', '/ordens-servico/71'],
    ['patch', '/ordens-servico/atribuir/71'], ['patch', '/ordens-servico/bloquear/71'], ['patch', '/ordens-servico/desbloquear/71'],
    ...['cliente', 'departamento', 'funcionario'].flatMap((recurso) => [
        ['post', `/${recurso}`], ['put', `/${recurso}/71`], ['patch', `/${recurso}/71`], ['delete', `/${recurso}/71`],
    ]),
    ['post', '/projeto'], ['put', '/projeto/71'], ['patch', '/projeto/71'], ['patch', '/projeto/71/ativo'],
    ['patch', '/ordens-servico/71/status'], ['patch', '/ordens-servico/71/sla-manual'],
    ['patch', '/ordens-servico/71/ativo'], ['post', '/ordens-servico/71/anexos'],
]) {
    test(`Analista recebe 403 em ${metodo.toUpperCase()} ${rota}`, async () => {
        await request(criarApp())[metodo](rota).set('Authorization', autenticar()).send({}).expect(403);
    });
}

test('API rejeita ausência de token com 401', async () => {
    await request(criarApp()).get('/ordens-servico').expect(401);
    await request(criarApp()).post('/ordens-servico').send(corpo).expect(401);
});

test('Consulta de O.S. inexistente retorna 404 para Analista', async () => {
    const token = autenticar();
    const { service } = criarService();
    mock.method(serviceOrdemServico, 'buscarPorId', (id) => service.buscarPorId(id));
    await request(criarApp()).get('/ordens-servico/999').set('Authorization', token).expect(404);
});

test('Perfil atual do funcionário prevalece sobre perfil Gestor antigo no token', async () => {
    mock.method(repositoryFuncionario, 'buscarPorId', async () => analista);
    const token = serviceAuth.gerarToken({ ...analista, tipo: 'gestor' });
    await request(criarApp()).patch('/ordens-servico/71').set('Authorization', `Bearer ${token}`).send({}).expect(403);
});

test('Gestor cadastra e edita colaborador com perfil Analista no service', async () => {
    const funcionarios = {
        criar: async (dados) => dados,
        buscarPorId: async () => ({ ...analista, tipo: 'tecnico' }),
        atualizar: async (_id, dados) => ({ ...analista, ...dados }),
    };
    const departamentos = { buscarPorId: async () => ({ id: 1 }) };
    const service = new ServiceFuncionario(funcionarios, departamentos);
    const criado = await service.criar({ departamento_id: 1, usuario: 'novo', nome: 'Novo', senha: 'Teste2026!', tipo: 'analista' });
    assert.equal(criado.tipo, 'analista');
    assert.equal((await service.atualizar(11, { tipo: 'analista' }, true)).tipo, 'analista');
});

test('Repository cria O.S. e auditoria na mesma transação e só depois atualiza cache', async () => {
    const eventos = [];
    const { service } = criarService();
    const dados = await service.criar(corpo, analista);
    const banco = { $transaction: async (callback) => {
        const resultado = await callback({
            ordens_servico: { create: async () => { eventos.push('os'); return dados; } },
            auditoria: { create: async ({ data }) => {
                eventos.push('auditoria');
                assert.deepEqual(data, { os_id: 71, funcionario_id: 11, acao: 'insercao', tipo_entidade: 'ordem_servico' });
            } },
        });
        eventos.push('commit');
        return resultado;
    } };
    mock.method(ordemServicoCache, 'definir', () => eventos.push('cache'));
    await new RepositoryOrdemServico(banco).criar(dados);
    assert.deepEqual(eventos, ['os', 'auditoria', 'commit', 'cache']);
});

test('Falha de auditoria propaga erro e não publica O.S. no cache', async () => {
    const falha = new Error('Falha simulada de auditoria');
    const { service } = criarService();
    const dados = await service.criar(corpo, analista);
    const banco = { $transaction: (callback) => callback({
        ordens_servico: { create: async () => dados },
        auditoria: { create: async () => { throw falha; } },
    }) };
    const cache = mock.method(ordemServicoCache, 'definir');
    await assert.rejects(new RepositoryOrdemServico(banco).criar(dados), (erro) => erro === falha);
    assert.equal(cache.mock.callCount(), 0);
});
