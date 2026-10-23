import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  convertTxtToMarkdown,
  convertHtmlToMarkdown,
  convertCsvToMarkdown,
  convertJsonToMarkdown,
  convertDocxToMarkdown,
  convertEpubToMarkdown,
  resolveZipPath,
  detectFormat,
  buildFrontmatter,
  applyFrontmatterToggle,
  formatBytes,
  formatNumberRAE,
  isNumericCell,
} from './converters.ts';
import { createSampleDocxBuffer } from './samples.ts';

test('formatBytes formats file sizes correctly with RAE space before unit', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1 KB');
  assert.equal(formatBytes(1048576), '1 MB');
  assert.equal(formatBytes(1536), '1.5 KB');
});

test('formatNumberRAE follows RAE orthography rules for thousands', () => {
  assert.equal(formatNumberRAE(999), '999');
  assert.equal(formatNumberRAE(1000), '1000');
  assert.equal(formatNumberRAE(2500), '2500');
  assert.equal(formatNumberRAE(9999), '9999');
  assert.equal(formatNumberRAE(35000), '35 000');
  assert.equal(formatNumberRAE(120000), '120 000');
  assert.equal(formatNumberRAE(1000000), '1 000 000');
  assert.equal(formatNumberRAE(35000.5), '35 000.5');
});

test('isNumericCell detects numbers, RAE-spaced numbers, percentages, and currencies', () => {
  assert.equal(isNumericCell('101'), true);
  assert.equal(isNumericCell('45 000 $'), true);
  assert.equal(isNumericCell('+28,8 %'), true);
  assert.equal(isNumericCell('12 ms'), true);
  assert.equal(isNumericCell('Norte'), false);
  assert.equal(isNumericCell('Licencia profesional'), false);
});

test('detectFormat detects supported extensions', () => {
  assert.equal(detectFormat('documento.txt'), 'txt');
  assert.equal(detectFormat('pagina.html'), 'html');
  assert.equal(detectFormat('reporte.docx'), 'docx');
  assert.equal(detectFormat('novela.epub'), 'epub');
  assert.equal(detectFormat('datos.csv'), 'csv');
  assert.equal(detectFormat('config.json'), 'json');
  assert.equal(detectFormat('foto.png'), 'unknown');
});

test('convertTxtToMarkdown cleans whitespace', () => {
  const input = '  Hola mundo desde texto plano.\r\nSegunda línea.  ';
  const result = convertTxtToMarkdown(input);
  assert.equal(result, 'Hola mundo desde texto plano.\nSegunda línea.');
});

test('convertHtmlToMarkdown converts tags to clean markdown', () => {
  const html =
    '<h1>Título principal</h1><p>Este es un <strong>texto en negrita</strong> y <em>cursiva</em>.</p><ul><li>Elemento 1</li><li>Elemento 2</li></ul>';
  const md = convertHtmlToMarkdown(html);
  assert.match(md, /# Título principal/);
  assert.match(md, /\*\*texto en negrita\*\*/);
  assert.match(md, /\*cursiva\*/);
  assert.match(md, /-\s+Elemento 1/);
  assert.match(md, /-\s+Elemento 2/);
});

test('convertHtmlToMarkdown converts tables with GFM alignment', () => {
  const html = `
    <table>
      <thead>
        <tr><th>Nombre</th><th>Edad</th></tr>
      </thead>
      <tbody>
        <tr><td>Ana</td><td>28</td></tr>
        <tr><td>Carlos</td><td>34</td></tr>
      </tbody>
    </table>
  `;
  const md = convertHtmlToMarkdown(html);
  assert.match(md, /Nombre/);
  assert.match(md, /Edad/);
  assert.match(md, /:-+/);
  assert.match(md, /-+:/);
  assert.match(md, /Ana/);
  assert.match(md, /28/);
});

test('convertCsvToMarkdown aligns text columns left (:---) and numeric columns right (---:)', () => {
  const csv = 'Producto,Precio,Existencias\nPortátil,1200 $,15\nRatón,25 $,80';
  const md = convertCsvToMarkdown(csv);
  const lines = md.split('\n');
  assert.equal(lines.length, 4);
  // First column is text (:---), second and third are numeric (---:)
  assert.match(lines[1], /^\|\s*:-+\s*\|\s*-+:\s*\|\s*-+:\s*\|$/);
  assert.match(md, /Portátil/);
  assert.match(md, /1200 \$/);
  assert.match(md, /Ratón/);
});

test('convertJsonToMarkdown wraps pretty json in markdown code block', () => {
  const jsonStr = '{"nombre":"MarkMorph","version":1,"activo":true}';
  const md = convertJsonToMarkdown(jsonStr);
  assert.match(md, /^```json\n/);
  assert.match(md, /"nombre": "MarkMorph"/);
  assert.match(md, /\n```$/);
});

test('buildFrontmatter produces valid YAML frontmatter with title, original_format, file_size_kb, and conversion_date', () => {
  const meta = {
    fileName: 'balance_2026.csv',
    originalFormat: 'csv',
    sizeBytes: 2048,
    date: '2026-10-23 10:00:00',
  };
  const frontmatter = buildFrontmatter(meta);
  assert.match(frontmatter, /^---\ntitle: "balance_2026\.csv"\noriginal_format: "CSV"\nfile_size_kb: 2\nconversion_date: "2026-10-23 10:00:00"\n---\n\n$/);
});

test('applyFrontmatterToggle adds and removes frontmatter cleanly while preserving edits', () => {
  const meta = {
    fileName: 'notas.txt',
    originalFormat: 'txt',
    sizeBytes: 1024,
    date: '2026-10-23 10:00:00',
  };
  const body = '# Mis notas\n\nContenido de ejemplo.';
  const withFM = applyFrontmatterToggle(body, body, true, meta);
  assert.match(withFM, /^---\ntitle: "notas\.txt"/);
  assert.match(withFM, /file_size_kb: 1/);
  assert.match(withFM, /# Mis notas/);

  const withoutFM = applyFrontmatterToggle(withFM, body, false, meta);
  assert.equal(withoutFM, body);
});

test('resolveZipPath handles parent directory navigation', () => {
  assert.equal(resolveZipPath('OEBPS/text', '../chapter1.xhtml'), 'OEBPS/chapter1.xhtml');
  assert.equal(resolveZipPath('OEBPS', 'intro.xhtml'), 'OEBPS/intro.xhtml');
  assert.equal(resolveZipPath('', 'intro.xhtml'), 'intro.xhtml');
});

test('convertDocxToMarkdown extracts headings and formatted text from DOCX buffer', async () => {
  const buffer = await createSampleDocxBuffer();
  const md = await convertDocxToMarkdown(buffer);
  assert.match(md, /# Especificación de arquitectura editorial/);
  assert.match(md, /\*\*Mammoth\*\*/);
  assert.match(md, /\*50 000 palabras por segundo\*/);
});

test('convertEpubToMarkdown extracts chapters and metadata from EPUB buffer', async () => {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Libro de prueba</dc:title>
    <dc:creator>Autor de ejemplo</dc:creator>
  </metadata>
  <manifest>
    <item id="c1" href="cap1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="cap2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="c1"/>
    <itemref idref="c2"/>
  </spine>
</package>`
  );
  zip.file('OEBPS/cap1.xhtml', '<h1>Primer capítulo</h1><p>Había una vez un conversor universal.</p>');
  zip.file('OEBPS/cap2.xhtml', '<h2>Segundo capítulo</h2><p>Ahora admite <strong>EPUB</strong>.</p>');

  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  const result = await convertEpubToMarkdown(buffer);

  assert.equal(result.bookTitle, 'Libro de prueba');
  assert.equal(result.bookAuthor, 'Autor de ejemplo');
  assert.match(result.markdown, /# Primer capítulo/);
  assert.match(result.markdown, /## Segundo capítulo/);
  assert.match(result.markdown, /\*\*EPUB\*\*/);
});
