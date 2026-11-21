const fs = require('node:fs');
const path = require('node:path');
const specPath = path.join(__dirname, '../src/docs/openapi.ts');
const source = fs.readFileSync(specPath, 'utf8');
const match = source.match(/const base = ([\s\S]*?) as const;/);
if (!match) throw new Error('Não foi possível localizar o objeto OpenAPI base.');
let spec;
try { spec = JSON.parse(match[1]); } catch (error) { throw new Error(`OpenAPI não é JSON válido: ${error.message}`); }
const errors = [];
if (spec.openapi !== '3.0.3') errors.push('Versão OpenAPI deve ser 3.0.3.');
if (!spec.info?.title || !spec.info?.version || !spec.info?.description) errors.push('info.title, info.version e info.description são obrigatórios.');
if (!Array.isArray(spec.servers) || !spec.servers.length) errors.push('Defina ao menos um servidor.');
const methods = new Set(['get','post','put','patch','delete','options','head']);
const ids = new Set();
for (const [route, operations] of Object.entries(spec.paths || {})) {
  if (!route.startsWith('/')) errors.push(`Caminho inválido: ${route}`);
  for (const [method, op] of Object.entries(operations)) {
    if (!methods.has(method)) continue;
    if (!op.operationId) errors.push(`${method.toUpperCase()} ${route}: operationId ausente.`);
    else if (ids.has(op.operationId)) errors.push(`operationId duplicado: ${op.operationId}`);
    else ids.add(op.operationId);
    if (!Array.isArray(op.tags) || !op.tags.length) errors.push(`${method.toUpperCase()} ${route}: tag ausente.`);
    if (!op.summary || !op.description) errors.push(`${method.toUpperCase()} ${route}: summary/description ausente.`);
    if (!op.responses || !Object.keys(op.responses).length) errors.push(`${method.toUpperCase()} ${route}: respostas ausentes.`);
    for (const [status, response] of Object.entries(op.responses || {})) {
      if (status !== '204' && !response.content) errors.push(`${method.toUpperCase()} ${route}: resposta ${status} sem schema/content.`);
      if (response.description?.includes('formato do corpo depende') || response.description?.includes('Consulte as validações do controller/service')) errors.push(`${method.toUpperCase()} ${route}: descrição genérica de contrato.`);
    }
    const requestSchema = op.requestBody?.content?.['application/json']?.schema;
    if (requestSchema?.additionalProperties === true) errors.push(`${method.toUpperCase()} ${route}: requestBody JSON genérico (additionalProperties=true).`);
    for (const p of op.parameters || []) if (p.in === 'path' && !p.required) errors.push(`${method.toUpperCase()} ${route}: parâmetro de rota ${p.name} precisa ser required.`);
  }
}
for (const [name, schema] of Object.entries(spec.components?.schemas || {})) {
  if (!schema || typeof schema !== 'object' || !schema.type) errors.push(`Schema inválido: ${name}`);
}
const schemaNames = new Set(Object.keys(spec.components?.schemas || {}));
function validateRefs(value, location = 'root') {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string') {
    const prefix = '#/components/schemas/';
    if (value.$ref.startsWith(prefix) && !schemaNames.has(value.$ref.slice(prefix.length))) errors.push(`${location}: referência inexistente ${value.$ref}`);
  }
  for (const [key, child] of Object.entries(value)) validateRefs(child, `${location}.${key}`);
}
validateRefs(spec);
if (errors.length) { console.error(errors.map(e => `- ${e}`).join('\n')); process.exit(1); }
console.log(`OpenAPI válido estruturalmente: ${Object.keys(spec.paths).length} caminhos, ${ids.size} operações.`);
