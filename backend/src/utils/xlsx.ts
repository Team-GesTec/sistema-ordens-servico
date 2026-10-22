import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { TextDecoder } from 'node:util';

const ZIP_LOCAL = 0x04034b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_END = 0x06054b50;
const MAX_ENTRADAS_ZIP = 2000;
const MAX_DESCOMPACTADO = 24 * 1024 * 1024;

interface EntradaZip {
    nome: string;
    metodo: number;
    flags: number;
    comprimido: number;
    descomprimido: number;
    checksum: number;
    offsetLocal: number;
}

function grupoRegex(match: RegExpMatchArray, indice: number, contexto: string): string {
    const valor = match[indice];
    if (valor === undefined) throw new Error(`Estrutura XML inválida ao ler ${contexto}.`);
    return valor;
}

function decodificarXml(valor: string): string {
    return valor
        .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function extrairTextos(xml: string): string {
    return [...xml.matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g)]
        .map((match) => decodificarXml(grupoRegex(match, 1, 'texto da célula').replace(/<[^>]+>/g, '')))
        .join('');
}

function lerEntradasZip(buffer: Buffer): Map<string, { meta: EntradaZip; dados: Buffer }> {
    if (buffer.length < 22) throw new Error('Arquivo XLSX inválido ou incompleto.');
    let fim = -1;
    const limite = Math.max(0, buffer.length - 65_557);
    for (let offset = buffer.length - 22; offset >= limite; offset--) {
        if (buffer.readUInt32LE(offset) === ZIP_END) { fim = offset; break; }
    }
    if (fim < 0) throw new Error('Estrutura ZIP do XLSX não foi encontrada.');
    const quantidade = buffer.readUInt16LE(fim + 10);
    const tamanhoCentral = buffer.readUInt32LE(fim + 12);
    const offsetCentral = buffer.readUInt32LE(fim + 16);
    if (quantidade < 1 || quantidade > MAX_ENTRADAS_ZIP || offsetCentral + tamanhoCentral > fim) {
        throw new Error('A estrutura interna do XLSX excede os limites permitidos.');
    }
    const metadados: EntradaZip[] = [];
    let cursor = offsetCentral;
    let totalDescomprimido = 0;
    for (let i = 0; i < quantidade; i++) {
        if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== ZIP_CENTRAL) {
            throw new Error('Diretório interno do XLSX inválido.');
        }
        const flags = buffer.readUInt16LE(cursor + 8);
        const metodo = buffer.readUInt16LE(cursor + 10);
        const checksum = buffer.readUInt32LE(cursor + 16);
        const comprimido = buffer.readUInt32LE(cursor + 20);
        const descomprimido = buffer.readUInt32LE(cursor + 24);
        const nomeTam = buffer.readUInt16LE(cursor + 28);
        const extraTam = buffer.readUInt16LE(cursor + 30);
        const comentarioTam = buffer.readUInt16LE(cursor + 32);
        const offsetLocal = buffer.readUInt32LE(cursor + 42);
        const nome = buffer.toString('utf8', cursor + 46, cursor + 46 + nomeTam);
        if ((flags & 0x1) !== 0) throw new Error('XLSX protegido por senha não é aceito.');
        if (metodo !== 0 && metodo !== 8) throw new Error('O XLSX utiliza um método de compressão não suportado.');
        if (nome.startsWith('/') || nome.split(/[\\/]/).some((parte) => parte === '..')) {
            throw new Error('O XLSX contém um caminho interno inválido.');
        }
        totalDescomprimido += descomprimido;
        if (totalDescomprimido > MAX_DESCOMPACTADO || descomprimido > MAX_DESCOMPACTADO) {
            throw new Error('O conteúdo descompactado do XLSX excede o limite permitido.');
        }
        metadados.push({ nome, metodo, flags, comprimido, descomprimido, checksum, offsetLocal });
        cursor += 46 + nomeTam + extraTam + comentarioTam;
    }
    const entradas = new Map<string, { meta: EntradaZip; dados: Buffer }>();
    let totalDescomprimidoReal = 0;
    for (const meta of metadados) {
        if (meta.offsetLocal + 30 > buffer.length || buffer.readUInt32LE(meta.offsetLocal) !== ZIP_LOCAL) {
            throw new Error('Entrada interna do XLSX inválida.');
        }
        const nomeTam = buffer.readUInt16LE(meta.offsetLocal + 26);
        const extraTam = buffer.readUInt16LE(meta.offsetLocal + 28);
        const inicio = meta.offsetLocal + 30 + nomeTam + extraTam;
        const fimDados = inicio + meta.comprimido;
        if (fimDados > buffer.length) throw new Error('Dados internos incompletos no XLSX.');
        const comprimidos = buffer.subarray(inicio, fimDados);
        const dados = meta.metodo === 0 ? Buffer.from(comprimidos) : inflateRawSync(comprimidos, { maxOutputLength: MAX_DESCOMPACTADO });
        if (dados.length !== meta.descomprimido) throw new Error('Tamanho de dados interno inconsistente no XLSX.');
        totalDescomprimidoReal += dados.length;
        if (totalDescomprimidoReal > MAX_DESCOMPACTADO) throw new Error('O conteúdo descompactado real do XLSX excede o limite permitido.');
        if (crc32(dados) !== meta.checksum) throw new Error('A integridade de uma entrada interna do XLSX é inválida.');
        entradas.set(meta.nome, { meta, dados });
    }
    return entradas;
}

function colunaIndice(referencia: string): number {
    const letras = referencia.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
    if (!letras) return 0;
    let valor = 0;
    for (const letra of letras) valor = valor * 26 + letra.charCodeAt(0) - 64;
    return valor - 1;
}

function serialExcelParaData(numero: number): string {
    const milissegundos = Math.round((numero - 25569) * 86_400_000);
    const data = new Date(milissegundos);
    if (Number.isNaN(data.getTime())) return '';
    return `${data.getUTCFullYear().toString().padStart(4, '0')}-${(data.getUTCMonth() + 1).toString().padStart(2, '0')}-${data.getUTCDate().toString().padStart(2, '0')}`;
}

function estilosData(xml: string | undefined): Set<number> {
    if (!xml) return new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
    const formatos = new Map<number, string>();
    for (const match of xml.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"[^>]*\/?\s*>/g)) {
        formatos.set(Number(grupoRegex(match, 1, 'identificador do formato')), decodificarXml(grupoRegex(match, 2, 'código do formato')).replace(/"[^"]*"|\\./g, ''));
    }
    const formatosData = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
    const blocoXfs = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1] ?? '';
    let indice = 0;
    for (const match of blocoXfs.matchAll(/<xf\b([^>]*)\/?\s*>/g)) {
        const atributos = grupoRegex(match, 1, 'atributos de estilo');
        const numFmtId = Number(atributos.match(/numFmtId="(\d+)"/)?.[1] ?? 0);
        const custom = formatos.get(numFmtId) ?? '';
        if (formatosData.has(numFmtId) || (numFmtId >= 164 && /[dmy]/i.test(custom))) formatosData.add(1000 + indice);
        indice++;
    }
    // O conjunto usa os IDs de estilo (índice em cellXfs), não os numFmtIds.
    const estilos = new Set<number>();
    indice = 0;
    for (const match of blocoXfs.matchAll(/<xf\b([^>]*)\/?\s*>/g)) {
        const atributos = grupoRegex(match, 1, 'atributos de estilo');
        const numFmtId = Number(atributos.match(/numFmtId="(\d+)"/)?.[1] ?? 0);
        const custom = formatos.get(numFmtId) ?? '';
        if (formatosData.has(numFmtId) || (numFmtId >= 164 && /[dmy]/i.test(custom))) estilos.add(indice);
        indice++;
    }
    return estilos;
}

/** Lê a primeira planilha de um XLSX sem executar fórmulas ou extrair arquivos no disco. */
export function lerPlanilhaXlsx(buffer: Buffer): string[][] {
    const entradas = lerEntradasZip(buffer);
    const workbook = entradas.get('xl/workbook.xml')?.dados.toString('utf8');
    if (!workbook || /<!DOCTYPE|<!ENTITY/i.test(workbook)) throw new Error('O XLSX não contém um workbook válido.');
    const rels = entradas.get('xl/_rels/workbook.xml.rels')?.dados.toString('utf8') ?? '';
    const idRel = workbook.match(/<sheet\b[^>]*r:id="([^"]+)"[^>]*\/?\s*>/)?.[1];
    if (!idRel) throw new Error('O XLSX não contém uma planilha legível.');
    const relacionamento = [...rels.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].find((m) => grupoRegex(m, 1, 'atributos de relacionamento').match(/Id="([^"]+)"/)?.[1] === idRel);
    const atributosRelacionamento = relacionamento ? grupoRegex(relacionamento, 1, 'atributos de relacionamento') : undefined;
    const destinoRel = atributosRelacionamento?.match(/Target="([^"]+)"/)?.[1];
    if (!destinoRel) throw new Error('Não foi possível localizar a primeira planilha do XLSX.');
    const caminho = destinoRel.startsWith('/') ? destinoRel.slice(1) : `xl/${destinoRel.replace(/^\.\//, '')}`;
    const caminhoNormalizado = caminho.replace(/\/[^/]+\/\.\.\//g, '/');
    const xmlPlanilha = entradas.get(caminhoNormalizado)?.dados.toString('utf8') ?? entradas.get(caminho)?.dados.toString('utf8');
    if (!xmlPlanilha || /<!DOCTYPE|<!ENTITY/i.test(xmlPlanilha)) throw new Error('O conteúdo da planilha é inválido.');
    if (/<f(?:\s|>)/i.test(xmlPlanilha)) throw new Error('A planilha contém fórmulas; remova-as antes de importar.');
    const compartilhadasXml = entradas.get('xl/sharedStrings.xml')?.dados.toString('utf8');
    const compartilhadas = compartilhadasXml
        ? [...compartilhadasXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => extrairTextos(grupoRegex(m, 1, 'texto compartilhado')))
        : [];
    const formatosData = estilosData(entradas.get('xl/styles.xml')?.dados.toString('utf8'));
    const matriz: string[][] = [];
    for (const rowMatch of xmlPlanilha.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
        const conteudoLinha = grupoRegex(rowMatch, 1, 'linha da planilha');
        const colunas = new Map<number, string>();
        let max = -1;
        for (const cellMatch of conteudoLinha.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
            const attrs = grupoRegex(cellMatch, 1, 'atributos da célula');
            const conteudo = grupoRegex(cellMatch, 2, 'conteúdo da célula');
            const ref = attrs.match(/\br="([A-Z]+\d+)"/i)?.[1] ?? 'A1';
            const idx = colunaIndice(ref);
            const tipo = attrs.match(/\bt="([^"]+)"/)?.[1] ?? 'n';
            const estilo = Number(attrs.match(/\bs="(\d+)"/)?.[1] ?? 0);
            const raw = conteudo.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? '';
            let value = '';
            if (tipo === 's') value = compartilhadas[Number(raw)] ?? '';
            else if (tipo === 'inlineStr') value = extrairTextos(conteudo);
            else if (tipo === 'b') value = raw === '1' ? 'true' : 'false';
            else if (tipo === 'e') throw new Error(`A célula ${ref} contém um erro do Excel.`);
            else if (raw !== '') value = formatosData.has(estilo) && Number.isFinite(Number(raw)) ? serialExcelParaData(Number(raw)) : raw;
            colunas.set(idx, value);
            max = Math.max(max, idx);
        }
        if (max >= 0) matriz.push(Array.from({ length: max + 1 }, (_v, i) => colunas.get(i) ?? ''));
    }
    return matriz;
}

/** Parser CSV com suporte a delimitador, campos entre aspas e quebras de linha citadas. */
export function lerCsv(buffer: Buffer): string[][] {
    let texto: string;
    try { texto = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, ''); }
    catch { throw new Error('O CSV deve estar codificado em UTF-8 válido.'); }
    if (texto.includes('\u0000')) throw new Error('O arquivo CSV contém caracteres NUL e não parece ser texto UTF-8.');
    const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? '';
    const delimitadores = [';', ',', '\t'];
    const delimitador = delimitadores.sort((a, b) => primeiraLinha.split(b).length - primeiraLinha.split(a).length)[0];
    const linhas: string[][] = [];
    let linha: string[] = [];
    let campo = '';
    let citado = false;
    for (let i = 0; i < texto.length; i++) {
        const char = texto[i];
        if (citado) {
            if (char === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
            else if (char === '"') citado = false;
            else campo += char;
        } else if (char === '"' && campo.length === 0) citado = true;
        else if (char === delimitador) { linha.push(campo); campo = ''; }
        else if (char === '\n' || char === '\r') {
            if (char === '\r' && texto[i + 1] === '\n') i++;
            linha.push(campo); campo = '';
            if (linha.some((v) => v.trim() !== '')) linhas.push(linha);
            linha = [];
            if (linhas.length > 5001) throw new Error('O arquivo contém mais de 5.000 registros.');
        } else campo += char;
    }
    if (citado) throw new Error('O CSV contém um campo entre aspas sem fechamento.');
    if (campo.length || linha.length) { linha.push(campo); if (linha.some((v) => v.trim() !== '')) linhas.push(linha); }
    if (linhas.length > 5001) throw new Error('O arquivo contém mais de 5.000 registros.');
    return linhas;
}

function escaparXml(valor: unknown): string {
    // XML 1.0 não permite diversos caracteres de controle. Dados externos são tratados
    // como texto e os controles inválidos são removidos para manter o XLSX legível.
    return String(valor ?? '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function referenciaColuna(indice: number): string {
    let n = indice + 1;
    let letras = '';
    while (n > 0) { const resto = (n - 1) % 26; letras = String.fromCharCode(65 + resto) + letras; n = Math.floor((n - 1) / 26); }
    return letras;
}

const tabelaCrc = (() => {
    const tabela = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tabela[n] = c >>> 0; }
    return tabela;
})();
function crc32(buffer: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        const valorTabela = tabelaCrc[(crc ^ byte) & 0xff] ?? 0;
        crc = valorTabela ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function cabeçalhoLocal(nome: Buffer, dados: Buffer, comprimidos: Buffer, crc: number, hora: number, data: number): Buffer {
    const b = Buffer.alloc(30);
    b.writeUInt32LE(ZIP_LOCAL, 0); b.writeUInt16LE(20, 4); b.writeUInt16LE(0x0800, 6); b.writeUInt16LE(8, 8);
    b.writeUInt16LE(hora, 10); b.writeUInt16LE(data, 12); b.writeUInt32LE(crc, 14); b.writeUInt32LE(comprimidos.length, 18); b.writeUInt32LE(dados.length, 22); b.writeUInt16LE(nome.length, 26); b.writeUInt16LE(0, 28);
    return b;
}
function cabeçalhoCentral(nome: Buffer, dados: Buffer, comprimidos: Buffer, crc: number, hora: number, data: number, offset: number): Buffer {
    const b = Buffer.alloc(46);
    b.writeUInt32LE(ZIP_CENTRAL, 0); b.writeUInt16LE(20, 4); b.writeUInt16LE(20, 6); b.writeUInt16LE(0x0800, 8); b.writeUInt16LE(8, 10);
    b.writeUInt16LE(hora, 12); b.writeUInt16LE(data, 14); b.writeUInt32LE(crc, 16); b.writeUInt32LE(comprimidos.length, 20); b.writeUInt32LE(dados.length, 24); b.writeUInt16LE(nome.length, 28); b.writeUInt16LE(0, 30); b.writeUInt16LE(0, 32); b.writeUInt16LE(0, 34); b.writeUInt16LE(0, 36); b.writeUInt32LE(0, 38); b.writeUInt32LE(offset, 42);
    return b;
}

function montarZip(arquivos: Array<{ nome: string; conteudo: string }>): Buffer {
    const locais: Buffer[] = [];
    const centrais: Buffer[] = [];
    let offset = 0;
    const agora = new Date();
    const dosHora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | Math.floor(agora.getSeconds() / 2);
    const dosData = ((Math.max(1980, agora.getFullYear()) - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate();
    for (const arquivo of arquivos) {
        const nome = Buffer.from(arquivo.nome, 'utf8');
        const dados = Buffer.from(arquivo.conteudo, 'utf8');
        const comprimidos = deflateRawSync(dados, { level: 6 });
        const crc = crc32(dados);
        const local = Buffer.concat([cabeçalhoLocal(nome, dados, comprimidos, crc, dosHora, dosData), nome, comprimidos]);
        locais.push(local);
        centrais.push(Buffer.concat([cabeçalhoCentral(nome, dados, comprimidos, crc, dosHora, dosData, offset), nome]));
        offset += local.length;
    }
    const central = Buffer.concat(centrais);
    const fim = Buffer.alloc(22);
    fim.writeUInt32LE(ZIP_END, 0); fim.writeUInt16LE(0, 4); fim.writeUInt16LE(0, 6); fim.writeUInt16LE(arquivos.length, 8); fim.writeUInt16LE(arquivos.length, 10); fim.writeUInt32LE(central.length, 12); fim.writeUInt32LE(offset, 16); fim.writeUInt16LE(0, 20);
    return Buffer.concat([...locais, central, fim]);
}

/** Produz um XLSX nativo com strings inline, sem fórmulas ou macros. */
export function gerarXlsx(cabecalhos: string[], linhas: unknown[][], nomePlanilha = 'Relatorio'): Buffer {
    const tudo = [cabecalhos, ...linhas];
    const linhasXml = tudo.map((row, indiceLinha) => {
        const celulas = row.map((valor, indiceColuna) => {
            const ref = `${referenciaColuna(indiceColuna)}${indiceLinha + 1}`;
            if (indiceLinha > 0 && indiceColuna === 0 && typeof valor === 'number' && Number.isFinite(valor)) {
                return `<c r="${ref}"><v>${valor}</v></c>`;
            }
            const texto = escaparXml(valor instanceof Date ? valor.toISOString() : valor ?? '');
            return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${texto}</t></is></c>`;
        }).join('');
        return `<row r="${indiceLinha + 1}">${celulas}</row>`;
    }).join('');
    const sheetName = nomePlanilha.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31) || 'Relatorio';
    const planilha = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${linhasXml}</sheetData></worksheet>`;
    return montarZip([
        { nome: '[Content_Types].xml', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
        { nome: '_rels/.rels', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
        { nome: 'xl/workbook.xml', conteudo: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escaparXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
        { nome: 'xl/_rels/workbook.xml.rels', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
        { nome: 'xl/styles.xml', conteudo: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' },
        { nome: 'xl/worksheets/sheet1.xml', conteudo: planilha },
    ]);
}
