const fs = require('node:fs');
const path = require('node:path');

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);
const normalizePath = (value) => {
  const normalized = value.replace(/:([A-Za-z0-9_]+)/g, '{$1}').replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return normalized || '/';
};
const joinPath = (prefix, route) => normalizePath(`${prefix === '/' ? '' : prefix}/${route === '/' ? '' : route}`);

function readImports(source) {
  const imports = new Map();
  const re = /import\s+(?:(\w+)\s*(?:,\s*\{[^}]*\})?|\{([^}]+)\})\s*from\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = re.exec(source))) {
    const modulePath = match[3];
    if (!modulePath.startsWith('.')) continue;
    const resolved = path.resolve(path.dirname(source.__filename || process.cwd()), `${modulePath}.ts`);
    if (match[1]) imports.set(match[1], resolved);
    if (match[2]) {
      for (const item of match[2].split(',')) {
        const [original, alias] = item.trim().split(/\s+as\s+/);
        if (original) imports.set((alias || original).trim(), { file: resolved, exportName: original.trim() });
      }
    }
  }
  return imports;
}

function extractFunctionBody(source, functionName) {
  const declaration = new RegExp(`(?:export\\s+)?function\\s+${functionName}\\s*\\([^)]*\\)[^{]*\\{`, 'm');
  const match = declaration.exec(source);
  if (!match) return null;
  const start = match.index + match[0].length;
  let depth = 1;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i);
  }
  throw new Error(`Bloco da função ${functionName} não foi fechado.`);
}

function routeDeclarations(source) {
  const found = [];
  const re = /\b(?:router|\w+Router)\.(get|post|put|patch|delete|options|head)\s*\(\s*(['"`])([^'"`]+)\2/g;
  let match;
  while ((match = re.exec(source))) found.push({ method: match[1].toLowerCase(), path: match[3] });
  return found;
}


function collectNestedModuleRoutes(file, prefix, visited = new Set()) {
  const absolute = path.resolve(file);
  if (visited.has(absolute)) return [];
  visited.add(absolute);
  const source = fs.readFileSync(absolute, 'utf8');
  const imports = readImports(Object.assign(source, { __filename: absolute }));
  const routes = routeDeclarations(source).map((route) => ({
    method: route.method,
    path: joinPath(prefix, route.path),
    source: absolute,
  }));
  const nested = /\brouter\.use\s*\(\s*(['"])([^'"]+)\1\s*,\s*([A-Za-z_$][\w$]*)\s*\)/g;
  let match;
  while ((match = nested.exec(source))) {
    const target = imports.get(match[3]);
    if (!target) continue;
    const childFile = typeof target === 'string' ? target : target.file;
    routes.push(...collectNestedModuleRoutes(childFile, joinPath(prefix, match[2]), visited));
  }
  return routes;
}

function resolveMountedRoutes({ appSource, appFile, routesDir }) {
  const imports = readImports(Object.assign(appSource, { __filename: appFile }));
  const actual = [];
  const mountedFiles = new Set();
  const useCalls = [];
  const useRe = /app\.use\s*\(/g;
  let useMatch;
  while ((useMatch = useRe.exec(appSource))) {
    let depth = 1;
    let quote = null;
    let end = useRe.lastIndex;
    for (; end < appSource.length && depth; end += 1) {
      const ch = appSource[end];
      if (quote) { if (ch === quote && appSource[end - 1] !== '\\') quote = null; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
    }
    const args = appSource.slice(useRe.lastIndex, end - 1);
    const prefixMatch = args.match(/^\s*(['"])([^'"]+)\1\s*,/);
    if (!prefixMatch) continue;
    const prefix = prefixMatch[2];
    const remaining = args.slice(prefixMatch[0].length).trim();
    const tail = remaining.split(/,(?![^()]*\))/).at(-1).trim();
    const factory = tail.match(/^([A-Za-z_$][\w$]*)\s*\(/);
    const identifier = tail.match(/^([A-Za-z_$][\w$]*)\s*$/);
    if (factory && imports.has(factory[1])) {
      const target = imports.get(factory[1]);
      const file = typeof target === 'string' ? target : target.file;
      const moduleSource = fs.readFileSync(file, 'utf8');
      const body = extractFunctionBody(moduleSource, factory[1]);
      if (!body) throw new Error(`Não foi possível localizar a factory ${factory[1]} em ${file}`);
      for (const route of routeDeclarations(body)) actual.push({ method: route.method, path: joinPath(prefix, route.path), source: file });
      mountedFiles.add(file);
    } else if (identifier && imports.has(identifier[1])) {
      const target = imports.get(identifier[1]);
      const file = typeof target === 'string' ? target : target.file;
      actual.push(...collectNestedModuleRoutes(file, prefix));
      mountedFiles.add(file);
    }
    useCalls.push({ prefix, tail });
    useRe.lastIndex = end;
  }

  // Rotas registradas diretamente na aplicação (a documentação tem endpoints próprios excluídos).
  const direct = /app\.(get|post|put|patch|delete|options|head)\s*\(\s*(['"])([^'"]+)\2/g;
  let match;
  while ((match = direct.exec(appSource))) {
    if (match[3] === '/docs' || match[3] === '/docs/openapi.json') continue;
    actual.push({ method: match[1].toLowerCase(), path: normalizePath(match[3]), source: appFile });
  }

  return { actual, mountedFiles: [...mountedFiles], useCalls };
}

function compareCoverage(actualRoutes, paths) {
  const keys = actualRoutes.map(({ method, path: route }) => `${method} ${normalizePath(route)}`);
  const duplicates = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];
  const documented = [];
  for (const [route, methods] of Object.entries(paths || {})) {
    for (const method of Object.keys(methods)) {
      if (HTTP_METHODS.has(method.toLowerCase())) documented.push(`${method.toLowerCase()} ${normalizePath(route)}`);
    }
  }
  const documentedDuplicates = [...new Set(documented.filter((key, index) => documented.indexOf(key) !== index))];
  const actual = new Set(keys);
  const docs = new Set(documented);
  return {
    missing: [...actual].filter((key) => !docs.has(key)),
    stale: [...docs].filter((key) => !actual.has(key)),
    duplicates,
    documentedDuplicates,
    actualCount: actual.size,
    documentedCount: docs.size,
  };
}

module.exports = { normalizePath, joinPath, routeDeclarations, collectNestedModuleRoutes, resolveMountedRoutes, compareCoverage };
