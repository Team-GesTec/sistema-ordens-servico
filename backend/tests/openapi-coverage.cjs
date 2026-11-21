const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const os = require('node:os');
const { resolveMountedRoutes, compareCoverage, collectNestedModuleRoutes } = require('../scripts/openapi-route-discovery.cjs');

const root = path.resolve(__dirname, '..');
const appFile = path.join(root, 'src/app.ts');
const appSource = fs.readFileSync(appFile, 'utf8');
const specSource = fs.readFileSync(path.join(root, 'src/docs/openapi.ts'), 'utf8');
const specMatch = specSource.match(/const base = ([\s\S]*?) as const;/);
assert.ok(specMatch, 'Objeto base OpenAPI não encontrado');
const spec = JSON.parse(specMatch[1]);

const { actual, mountedFiles } = resolveMountedRoutes({ appSource, appFile, routesDir: path.join(root, 'src/routes') });
assert.ok(mountedFiles.length >= 8, `Poucos módulos de rotas montados foram descobertos (${mountedFiles.length}).`);
const result = compareCoverage(actual, spec.paths);
assert.deepEqual(result.duplicates, [], `Rotas reais duplicadas: ${result.duplicates.join(', ')}`);
assert.deepEqual(result.documentedDuplicates, [], `Operações OpenAPI duplicadas: ${result.documentedDuplicates.join(', ')}`);
assert.deepEqual(result.missing, [], `Rotas sem documentação: ${result.missing.join('\n')}`);
assert.deepEqual(result.stale, [], `Operações documentadas sem rota: ${result.stale.join('\n')}`);

// Prova de regressão: uma rota real adicionada sem operação OpenAPI deve ser detectada.
const regression = compareCoverage([...actual, { method: 'get', path: '/regression/nao-documentada' }], spec.paths);
assert.ok(regression.missing.includes('get /regression/nao-documentada'), 'O teste não detectou uma rota sem documentação.');

// Fixture de routers aninhados: confirma prefixos compostos e parâmetros dinâmicos.
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgos-openapi-'));
try {
  fs.writeFileSync(path.join(fixtureDir, 'child.ts'), "import { Router } from 'express'; const router = Router(); router.get('/:id', handler); export default router;");
  fs.writeFileSync(path.join(fixtureDir, 'parent.ts'), "import { Router } from 'express'; import childRoutes from './child'; const router = Router(); router.get('/root', handler); router.use('/nested', childRoutes); export default router;");
  const nested = collectNestedModuleRoutes(path.join(fixtureDir, 'parent.ts'), '/api').map((r) => `${r.method} ${r.path}`).sort();
  assert.deepEqual(nested, ['get /api/nested/{id}', 'get /api/root']);
} finally { fs.rmSync(fixtureDir, { recursive: true, force: true }); }
console.log(`Cobertura conferida: ${result.actualCount} operações em ${mountedFiles.length} módulos montados; teste de regressão aprovado.`);
