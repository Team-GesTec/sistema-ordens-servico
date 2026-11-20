import PDFDocument from 'pdfkit';

type Campo = { rotulo: string; valor: unknown };

const MARGEM = 48;
const LARGURA_PAGINA = 595.28;
const LARGURA_CONTEUDO = LARGURA_PAGINA - MARGEM * 2;

export function textoRelatorio(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') return 'Não informado';
    if (valor instanceof Date) return valor.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    return String(valor);
}

export function dataRelatorio(valor: Date | null | undefined): string {
    if (!valor) return 'Não informado';
    return valor.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function criarPdfRelatorio(titulo: string, subtitulo: string, secoes: Array<{ titulo: string; campos?: Campo[]; linhas?: string[] }>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const partes: Buffer[] = [];
        const documento = new PDFDocument({ size: 'A4', margin: MARGEM, bufferPages: true, info: { Title: titulo, Author: 'SGOS - GesTec' } });
        documento.on('data', (parte: Buffer) => partes.push(parte));
        documento.on('end', () => resolve(Buffer.concat(partes)));
        documento.on('error', reject);

        const cabecalho = () => {
            documento.fillColor('#17345f').font('Helvetica-Bold').fontSize(18).text('GesTec - SGOS', { continued: false });
            documento.moveDown(0.35).fillColor('#25344d').fontSize(15).text(titulo);
            documento.fillColor('#64748b').font('Helvetica').fontSize(9).text(subtitulo);
            documento.moveDown(1);
        };

        const garantirEspaco = (altura: number) => {
            if (documento.y + altura > documento.page.height - 55) {
                documento.addPage();
                cabecalho();
            }
        };

        cabecalho();
        for (const secao of secoes) {
            garantirEspaco(36);
            documento.fillColor('#1f8a5b').font('Helvetica-Bold').fontSize(11).text(secao.titulo.toUpperCase());
            documento.moveDown(0.35);
            if (secao.campos) {
                for (const campo of secao.campos) {
                    const valor = textoRelatorio(campo.valor);
                    const altura = Math.max(19, documento.heightOfString(valor, { width: LARGURA_CONTEUDO - 150 }) + 8);
                    garantirEspaco(altura);
                    const y = documento.y;
                    documento.fillColor('#526176').font('Helvetica-Bold').fontSize(9).text(`${campo.rotulo}:`, MARGEM, y, { width: 142 });
                    documento.fillColor('#172033').font('Helvetica').fontSize(9).text(valor, MARGEM + 150, y, { width: LARGURA_CONTEUDO - 150 });
                    documento.moveDown(0.35);
                }
            }
            if (secao.linhas) {
                for (const linha of secao.linhas) {
                    const altura = documento.heightOfString(linha, { width: LARGURA_CONTEUDO - 12 }) + 10;
                    garantirEspaco(altura);
                    documento.fillColor('#172033').font('Helvetica').fontSize(9).text(`- ${linha}`, { width: LARGURA_CONTEUDO - 12 });
                    documento.moveDown(0.2);
                }
            }
            documento.moveDown(0.55);
        }

        const paginas = documento.bufferedPageRange();
        for (let pagina = 0; pagina < paginas.count; pagina += 1) {
            documento.switchToPage(pagina);
            documento.strokeColor('#dbe3ee').moveTo(MARGEM, documento.page.height - 38).lineTo(documento.page.width - MARGEM, documento.page.height - 38).stroke();
            documento.fillColor('#64748b').font('Helvetica').fontSize(8).text(`GesTec - SGOS | Página ${pagina + 1} de ${paginas.count}`, MARGEM, documento.page.height - 28, { width: LARGURA_CONTEUDO, align: 'right' });
        }
        documento.end();
    });
}
