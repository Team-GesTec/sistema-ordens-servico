const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ServiceEmail } = require('../src/services/serviceEmail.ts');
function fixture(send) {
    let data = [];
    const repo = { listar: async () => structuredClone(data), salvar: async v => { data = structuredClone(v); } };
    return { service: new ServiceEmail(repo, { enviar: send }), data: () => data };
}
const message = i => ({ evento_id: String(i), destinatario_id: i, para: 'test@example.com', assunto: 'Teste', html: '<p>Teste</p>' });
test('enfileiramento concorrente e processamento preservam todos os itens', async () => {
    const f = fixture(async () => {});
    await Promise.all(Array.from({length: 20}, (_, i) => f.service.enfileirar(message(i))));
    await Promise.all([f.service.processar(new Date(Date.now()+1000)), f.service.enfileirar(message(21))]);
    assert.equal(f.data().length, 21);
    assert.equal(f.data().filter(x => x.estado === 'enviado').length, 20);
    await f.service.enfileirar(message(21));
    assert.equal(f.data().length, 21);
});
test('falhas são persistidas e cessam após três tentativas', async () => {
    let calls = 0;
    const f = fixture(async () => { calls++; throw new Error('indisponível'); });
    await f.service.enfileirar(message(1));
    for (let i=1;i<=4;i++) await f.service.processar(new Date(Date.now()+i*10000));
    assert.equal(calls, 3);
    assert.equal(f.data()[0].estado, 'falhou');
    assert.equal(f.data()[0].tentativas, 3);
});
