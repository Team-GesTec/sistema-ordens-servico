/** Gera PDFs textuais pequenos sem dependências externas, usando as fontes padrão PDF/WinAnsi. */
function byteWinAnsi(caractere: string): number {
    const codigo = caractere.codePointAt(0) ?? 0x3f;
    if (codigo <= 0xff) return codigo;
    const mapa: Record<number, number> = {
        0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
        0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
        0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
        0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
        0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
        0x017e: 0x9e, 0x0178: 0x9f,
    };
    return mapa[codigo] ?? 0x3f;
}

function paraHexWinAnsi(texto: string): string {
    return Array.from(texto, (caractere) => byteWinAnsi(caractere).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function quebrarLinha(texto: string, limite = 96): string[] {
    const normalizado = texto.replace(/\r/g, '').replace(/\t/g, '    ');
    if (!normalizado) return [''];
    const palavras = normalizado.split(/\s+/);
    const linhas: string[] = [];
    let atual = '';
    for (const palavra of palavras) {
        if (palavra.length > limite) {
            if (atual) linhas.push(atual);
            atual = '';
            for (let i = 0; i < palavra.length; i += limite) linhas.push(palavra.slice(i, i + limite));
            continue;
        }
        const candidato = atual ? `${atual} ${palavra}` : palavra;
        if (candidato.length > limite) {
            linhas.push(atual);
            atual = palavra;
        } else atual = candidato;
    }
    if (atual) linhas.push(atual);
    return linhas;
}

/** Cria um PDF A4 paginado para relatórios administrativos em texto. */
export function gerarPdfTexto(titulo: string, conteudo: string[]): Buffer {
    const linhas = [titulo, `Gerado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, '', ...conteudo]
        .flatMap((linha) => quebrarLinha(linha));
    const porPagina = 48;
    const paginas: string[][] = [];
    for (let i = 0; i < linhas.length; i += porPagina) paginas.push(linhas.slice(i, i + porPagina));
    if (paginas.length === 0) paginas.push([]);

    const objetos: string[] = [];
    objetos[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objetos[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objetos[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    const idsPaginas: number[] = [];
    paginas.forEach((linhasPagina, indice) => {
        const idPagina = 5 + indice * 2;
        const idStream = idPagina + 1;
        idsPaginas.push(idPagina);
        const comandos: string[] = [];
        linhasPagina.forEach((linha, linhaIndice) => {
            const y = 800 - linhaIndice * 15;
            const negrito = indice === 0 && linhaIndice === 0;
            comandos.push(`BT /${negrito ? 'F2' : 'F1'} ${negrito ? 16 : 9} Tf 48 ${y} Td <${paraHexWinAnsi(linha)}> Tj ET`);
        });
        const stream = comandos.join('\n');
        objetos[idPagina] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idStream} 0 R >>`;
        objetos[idStream] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`;
    });
    objetos[2] = `<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(' ')}] /Count ${idsPaginas.length} >>`;

    let pdf = '%PDF-1.4\n%SGOS\n';
    const offsets: number[] = [0];
    for (let id = 1; id < objetos.length; id += 1) {
        offsets[id] = Buffer.byteLength(pdf, 'ascii');
        pdf += `${id} 0 obj\n${objetos[id]}\nendobj\n`;
    }
    const inicioXref = Buffer.byteLength(pdf, 'ascii');
    pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
    for (let id = 1; id < objetos.length; id += 1) {
        pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
    return Buffer.from(pdf, 'ascii');
}
