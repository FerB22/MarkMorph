import TurndownService from 'turndown';
import Papa from 'papaparse';
import * as mammoth from 'mammoth';
import JSZip from 'jszip';

export interface ConversionOptions {
  includeFrontmatter: boolean;
  headingStyle?: 'atx' | 'setext';
  bulletMarker?: '-' | '*' | '+';
  onProgress?: (percent: number, stage: string) => void;
}

export interface FileMetadata {
  fileName: string;
  originalFormat: 'txt' | 'html' | 'docx' | 'csv' | 'json' | 'epub' | string;
  sizeBytes: number;
  date: string;
  author?: string;
  title?: string;
}

export interface ConversionResult {
  markdown: string;
  rawConverted: string;
  metadata: FileMetadata;
}

/**
 * Determine whether a cell value represents a number, currency, percentage, or metric with unit
 * so its column can be right-aligned (---:) in GFM tables.
 */
export function isNumericCell(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Strip leading sign, trailing/leading currency symbols, percentages, and common metric units
  const cleaned = trimmed
    .replace(/^[+-]\s*/, '')
    .replace(
      /\s*(%|€|\$|£|¥|CLP|USD|EUR|MXN|ARS|COP|PEN|ms|s|h|min|B|KB|MB|GB|TB|kg|g|km|m|cm|mm|°C|°F|°)$/i,
      ''
    )
    .replace(/^(\$|\€|£|¥)\s*/, '')
    .trim();

  if (!cleaned) return false;

  // Match integers, decimals, or RAE space-grouped numbers (e.g. 45 000, 99,9, 1 250.50)
  return /^\d+(?:[ \u00A0.,]\d+)*$/.test(cleaned);
}

/**
 * Build a GFM table with automatic numeric right-alignment (---:), text left-alignment (:---),
 * padded headers, and consistent vertical separators.
 */
export function formatMarkdownTable(headerRow: string[], dataRows: string[][]): string {
  const maxCols = Math.max(
    headerRow.length,
    ...dataRows.map((r) => r.length)
  );
  if (maxCols === 0) return '';

  const normalizedHeader = [...headerRow];
  while (normalizedHeader.length < maxCols) {
    normalizedHeader.push(`Columna ${normalizedHeader.length + 1}`);
  }

  const normalizedRows = dataRows.map((row) => {
    const copy = [...row];
    while (copy.length < maxCols) {
      copy.push('');
    }
    return copy;
  });

  // Determine alignment for each column: 'right' if all non-empty data cells are numeric, else 'left'
  const alignments: ('left' | 'right')[] = [];
  for (let col = 0; col < maxCols; col++) {
    const nonEmptyCells = normalizedRows
      .map((r) => r[col].trim())
      .filter((val) => val.length > 0);

    const isNumericCol =
      nonEmptyCells.length > 0 && nonEmptyCells.every((val) => isNumericCell(val));
    alignments.push(isNumericCol ? 'right' : 'left');
  }

  // Compute uniform width for each column (minimum 4 chars to fit :--- or ---:)
  const colWidths: number[] = [];
  for (let col = 0; col < maxCols; col++) {
    const maxDataLen = normalizedRows.reduce(
      (max, row) => Math.max(max, row[col].length),
      0
    );
    colWidths.push(Math.max(4, normalizedHeader[col].length, maxDataLen));
  }

  // Format header row with padding
  const formattedHeaders = normalizedHeader.map((h, col) =>
    alignments[col] === 'right' ? h.padStart(colWidths[col], ' ') : h.padEnd(colWidths[col], ' ')
  );

  // Format separator row with GFM alignment markers (:--- or ---:)
  const separatorCells = colWidths.map((w, col) =>
    alignments[col] === 'right'
      ? '-'.repeat(Math.max(3, w - 1)) + ':'
      : ':' + '-'.repeat(Math.max(3, w - 1))
  );

  const lines: string[] = [];
  lines.push('| ' + formattedHeaders.join(' | ') + ' |');
  lines.push('| ' + separatorCells.join(' | ') + ' |');

  if (normalizedRows.length > 0) {
    for (const row of normalizedRows) {
      const formattedCells = row.map((cell, col) =>
        alignments[col] === 'right'
          ? cell.padStart(colWidths[col], ' ')
          : cell.padEnd(colWidths[col], ' ')
      );
      lines.push('| ' + formattedCells.join(' | ') + ' |');
    }
  } else {
    const emptyCells = colWidths.map((w) => ' '.repeat(w));
    lines.push('| ' + emptyCells.join(' | ') + ' |');
  }

  return lines.join('\n');
}

/**
 * Configure Turndown with GFM table support, task lists, strikethrough, and clean formatting
 */
export function createTurndownService(options?: Partial<ConversionOptions>): TurndownService {
  const service = new TurndownService({
    headingStyle: options?.headingStyle || 'atx',
    codeBlockStyle: 'fenced',
    hr: '---',
    bulletListMarker: options?.bulletMarker || '-',
    emDelimiter: '*',
    strongDelimiter: '**',
  });

  // Remove script, style, and noscript tags cleanly
  service.remove(['script', 'style', 'noscript']);

  // Strikethrough support (GFM)
  service.addRule('strikethrough', {
    filter: ['del', 's'],
    replacement: (content) => `~~${content}~~`,
  });

  // Table rules for HTML tables using aligned GFM generator
  service.addRule('table', {
    filter: ['table'],
    replacement: (_content, node) => {
      const element = node as HTMLTableElement;
      const rows = Array.from(element.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      const tableData: string[][] = [];
      let maxCols = 0;

      rows.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('th, td')).map((cell) => {
          return (cell.textContent || '').trim().replace(/\|/g, '\\|').replace(/\n+/g, ' ');
        });
        if (cells.length > maxCols) maxCols = cells.length;
        if (cells.length > 0) {
          tableData.push(cells);
        }
      });

      if (tableData.length === 0 || maxCols === 0) return '';

      const headerRow = tableData[0];
      const dataRows = tableData.slice(1);
      const formatted = formatMarkdownTable(headerRow, dataRows);

      return formatted ? `\n\n${formatted}\n\n` : '';
    },
  });

  return service;
}

/**
 * Format bytes to human readable format with RAE space before unit
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format numbers according to RAE / international orthography norm:
 * - 4-digit numbers have no space (e.g. 1000, 9999)
 * - 5+ digit numbers are grouped 3 by 3 with a space (e.g. 35 000, 1 000 000)
 * - Decimals are preserved without spaces
 */
export function formatNumberRAE(value: number): string {
  const isNegative = value < 0;
  const absVal = Math.abs(value);
  const parts = absVal.toString().split('.');
  const intPart = parts[0];
  const decPart = parts[1];

  let formattedInt = intPart;
  if (intPart.length >= 5) {
    formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  const result = decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
  return isNegative ? `-${result}` : result;
}

/**
 * Build YAML frontmatter block with required keys:
 * title, original_format, file_size_kb, and conversion_date
 */
export function buildFrontmatter(meta: FileMetadata): string {
  const cleanTitle = (meta.title || meta.fileName).replace(/"/g, '\\"');
  const sizeKb = Number((meta.sizeBytes / 1024).toFixed(2));
  let yaml = `---\ntitle: "${cleanTitle}"\noriginal_format: "${meta.originalFormat.toUpperCase()}"\nfile_size_kb: ${sizeKb}\nconversion_date: "${meta.date}"\n`;
  if (meta.author) {
    yaml += `author: "${meta.author.replace(/"/g, '\\"')}"\n`;
  }
  yaml += `---\n\n`;
  return yaml;
}

/**
 * Resolve relative path inside a zip archive
 */
export function resolveZipPath(baseDir: string, relativePath: string): string {
  if (!baseDir) return relativePath.replace(/^\.\//, '');
  const normalized = `${baseDir.replace(/\/+$/, '')}/${relativePath}`.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

/**
 * Convert EPUB ArrayBuffer to clean Markdown
 */
export async function convertEpubToMarkdown(
  buffer: ArrayBuffer,
  options?: Partial<ConversionOptions>
): Promise<{ markdown: string; bookTitle?: string; bookAuthor?: string }> {
  const zip = await JSZip.loadAsync(buffer);

  // 1. Locate package OPF file via META-INF/container.xml
  let opfPath = '';
  const containerXml = zip.file('META-INF/container.xml');
  if (containerXml) {
    const text = await containerXml.async('text');
    const match = text.match(/full-path=["']([^"']+)["']/i);
    if (match) {
      opfPath = match[1];
    }
  }

  // Fallback: search any .opf in the zip
  if (!opfPath) {
    const opfKey = Object.keys(zip.files).find((k) => k.toLowerCase().endsWith('.opf'));
    if (opfKey) opfPath = opfKey;
  }

  // If no OPF found, extract any HTML/XHTML files sorted
  if (!opfPath || !zip.file(opfPath)) {
    const htmlFiles = Object.keys(zip.files)
      .filter((k) => /\.(xhtml|html|htm)$/i.test(k) && !zip.files[k].dir)
      .sort();

    if (htmlFiles.length === 0) {
      throw new Error('El archivo EPUB no contiene documentos legibles.');
    }

    const sections: string[] = [];
    for (const hf of htmlFiles) {
      const file = zip.file(hf);
      if (file) {
        const html = await file.async('text');
        const md = convertHtmlToMarkdown(html, options);
        if (md.trim()) sections.push(md.trim());
      }
    }
    return { markdown: sections.join('\n\n---\n\n') };
  }

  const opfText = await zip.file(opfPath)!.async('text');
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // Extract metadata
  let bookTitle: string | undefined;
  let bookAuthor: string | undefined;

  const titleMatch = opfText.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  if (titleMatch) bookTitle = titleMatch[1].trim();

  const authorMatch = opfText.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
  if (authorMatch) bookAuthor = authorMatch[1].trim();

  // Extract manifest (id -> href)
  const manifest = new Map<string, string>();
  const itemRegex = /<item\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(opfText)) !== null) {
    const tag = match[0];
    const id = tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (id && href) {
      manifest.set(id, href);
    }
  }

  // Extract spine reading order
  const spineIds: string[] = [];
  const itemrefRegex = /<itemref\b[^>]*\bidref=["']([^"']+)["'][^>]*>/gi;
  while ((match = itemrefRegex.exec(opfText)) !== null) {
    spineIds.push(match[1]);
  }

  // Determine file order
  const hrefOrder: string[] = [];
  if (spineIds.length > 0) {
    for (const id of spineIds) {
      const href = manifest.get(id);
      if (href) hrefOrder.push(href);
    }
  } else {
    for (const href of manifest.values()) {
      if (/\.(xhtml|html|htm)$/i.test(href)) {
        hrefOrder.push(href);
      }
    }
  }

  const chapters: string[] = [];
  for (const rawHref of hrefOrder) {
    const cleanHref = decodeURIComponent(rawHref.split('#')[0]);
    const zipPath = resolveZipPath(opfDir, cleanHref);

    let file = zip.file(zipPath);
    if (!file) {
      const altPath = zipPath.replace(/^\.\//, '');
      file = zip.file(altPath);
      if (!file) {
        const found = Object.keys(zip.files).find((k) => k.toLowerCase() === altPath.toLowerCase());
        if (found) file = zip.file(found);
      }
    }

    if (file) {
      const content = await file.async('text');
      const md = convertHtmlToMarkdown(content, options);
      if (md.trim()) {
        chapters.push(md.trim());
      }
    }
  }

  if (chapters.length === 0) {
    throw new Error('No se pudo extraer contenido de texto del libro EPUB.');
  }

  return {
    markdown: chapters.join('\n\n---\n\n'),
    bookTitle,
    bookAuthor,
  };
}

/**
 * Remove or update frontmatter in existing markdown content
 */
export function applyFrontmatterToggle(
  currentMarkdown: string,
  _rawConverted: string,
  includeFrontmatter: boolean,
  meta: FileMetadata
): string {
  const frontmatterRegex = /^---\r?\n[\s\S]*?\r?\n---\r?\n\r?\n?/;
  const hasFrontmatter = frontmatterRegex.test(currentMarkdown);

  if (includeFrontmatter) {
    if (hasFrontmatter) {
      const body = currentMarkdown.replace(frontmatterRegex, '');
      return buildFrontmatter(meta) + body;
    } else {
      return buildFrontmatter(meta) + currentMarkdown;
    }
  } else {
    if (hasFrontmatter) {
      return currentMarkdown.replace(frontmatterRegex, '');
    }
    return currentMarkdown;
  }
}

/**
 * Convert plain text (.txt)
 */
export function convertTxtToMarkdown(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  return normalized;
}

/**
 * Convert HTML string to Markdown using Turndown
 */
export function convertHtmlToMarkdown(htmlContent: string, options?: Partial<ConversionOptions>): string {
  const turndown = createTurndownService(options);
  const markdown = turndown.turndown(htmlContent);
  return markdown.trim();
}

/**
 * Convert CSV string to GFM Markdown Table with aligned headers, consistent separators,
 * right-aligned numeric columns (---:), and left-aligned text columns (:---)
 */
export function convertCsvToMarkdown(csvContent: string): string {
  const parsed = Papa.parse<string[]>(csvContent, {
    skipEmptyLines: 'greedy',
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error('Error al analizar el archivo CSV. Detalle: ' + parsed.errors[0].message);
  }

  const rows = parsed.data;
  if (rows.length === 0) {
    return '*[Archivo CSV vacío]*';
  }

  let maxCols = 0;
  rows.forEach((r) => {
    if (r.length > maxCols) maxCols = r.length;
  });

  if (maxCols === 0) {
    return '*[Archivo CSV vacío]*';
  }

  const headerRow = rows[0].map((cell, idx) => {
    const val = (cell ?? '').toString().trim().replace(/\|/g, '\\|').replace(/\n+/g, ' ');
    return val === '' ? `Columna ${idx + 1}` : val;
  });

  const dataRows = rows.slice(1).map((row) =>
    row.map((cell) => (cell ?? '').toString().trim().replace(/\|/g, '\\|').replace(/\n+/g, ' '))
  );

  return formatMarkdownTable(headerRow, dataRows);
}

/**
 * Convert JSON to Markdown code block with syntax highlighting
 */
export function convertJsonToMarkdown(jsonContent: string): string {
  try {
    const parsed = JSON.parse(jsonContent);
    const formatted = JSON.stringify(parsed, null, 2);
    return '```json\n' + formatted + '\n```';
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Sintaxis JSON no válida';
    throw new Error('Error al procesar el archivo JSON. Detalle: ' + errorMsg);
  }
}

/**
 * Convert DOCX ArrayBuffer to Markdown via Mammoth.js and Turndown
 */
export async function convertDocxToMarkdown(
  arrayBuffer: ArrayBuffer,
  options?: Partial<ConversionOptions>
): Promise<string> {
  try {
    const mammothInput: { arrayBuffer: ArrayBuffer; buffer?: Uint8Array } = {
      arrayBuffer,
    };
    if (typeof Buffer !== 'undefined') {
      mammothInput.buffer = Buffer.from(arrayBuffer);
    }

    const result = await mammoth.convertToHtml(mammothInput as { arrayBuffer: ArrayBuffer });
    const html = result.value;
    if (!html || html.trim() === '') {
      const rawResult = await mammoth.extractRawText(mammothInput as { arrayBuffer: ArrayBuffer });
      return rawResult.value.trim() || '*[Documento Word sin contenido de texto]*';
    }

    return convertHtmlToMarkdown(html, options);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    throw new Error('No se pudo convertir el documento DOCX. Detalle: ' + errorMsg);
  }
}

/**
 * Detect file format from name or type
 */
export function detectFormat(
  fileName: string,
  mimeType?: string
): 'txt' | 'html' | 'docx' | 'csv' | 'json' | 'epub' | 'unknown' {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'md' || ext === 'markdown') return 'txt';
  if (ext === 'txt' || ext === 'text' || ext === 'log') return 'txt';
  if (ext === 'html' || ext === 'htm' || ext === 'xhtml') return 'html';
  if (ext === 'docx') return 'docx';
  if (ext === 'epub') return 'epub';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'json') return 'json';

  if (mimeType) {
    if (mimeType.includes('epub')) return 'epub';
    if (mimeType.includes('text/html')) return 'html';
    if (mimeType.includes('text/csv')) return 'csv';
    if (mimeType.includes('application/json')) return 'json';
    if (mimeType.includes('officedocument.wordprocessingml')) return 'docx';
    if (mimeType.startsWith('text/')) return 'txt';
  }

  return 'unknown';
}

/**
 * Main conversion orchestrator with detailed progress stages
 */
export async function processFileConversion(
  file: File | { name: string; size: number; content: string | ArrayBuffer; type?: string },
  options: ConversionOptions
): Promise<ConversionResult> {
  options.onProgress?.(15, 'Verificando formato y leyendo archivo en memoria local...');

  const format = detectFormat(file.name, 'type' in file ? file.type : undefined);

  if (format === 'unknown') {
    throw new Error(
      `Formato de archivo no compatible («.${file.name.split('.').pop()}»). Los formatos admitidos son los siguientes: .txt, .html, .docx, .epub, .csv y .json.`
    );
  }

  const metadata: FileMetadata = {
    fileName: file.name,
    originalFormat: format,
    sizeBytes: file.size,
    date: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };

  let rawMarkdown = '';

  if (format === 'docx') {
    options.onProgress?.(40, 'Extrayendo jerarquía semántica del documento Word (.docx)...');
    let buffer: ArrayBuffer;
    if ('content' in file && file.content instanceof ArrayBuffer) {
      buffer = file.content;
    } else if ('arrayBuffer' in file && typeof (file as File).arrayBuffer === 'function') {
      buffer = await (file as File).arrayBuffer();
    } else {
      throw new Error('El archivo DOCX requiere un búfer binario válido.');
    }
    options.onProgress?.(70, 'Transformando estructura HTML en sintaxis Markdown...');
    rawMarkdown = await convertDocxToMarkdown(buffer, options);
  } else if (format === 'epub') {
    options.onProgress?.(35, 'Descomprimiendo contenedor EPUB y leyendo manifiesto OPF...');
    let buffer: ArrayBuffer;
    if ('content' in file && file.content instanceof ArrayBuffer) {
      buffer = file.content;
    } else if ('arrayBuffer' in file && typeof (file as File).arrayBuffer === 'function') {
      buffer = await (file as File).arrayBuffer();
    } else {
      throw new Error('El archivo EPUB requiere un búfer binario válido.');
    }
    options.onProgress?.(65, 'Procesando capítulos XHTML y metadatos bibliográficos...');
    const epubRes = await convertEpubToMarkdown(buffer, options);
    rawMarkdown = epubRes.markdown;
    if (epubRes.bookTitle) {
      metadata.title = epubRes.bookTitle;
    }
    if (epubRes.bookAuthor) {
      metadata.author = epubRes.bookAuthor;
    }
  } else {
    options.onProgress?.(40, 'Decodificando flujo de texto en UTF-8...');
    let textContent = '';
    if ('content' in file) {
      if (typeof file.content === 'string') {
        textContent = file.content;
      } else if (file.content instanceof ArrayBuffer) {
        const decoder = new TextDecoder('utf-8');
        textContent = decoder.decode(file.content);
      }
    } else if ('text' in file && typeof (file as File).text === 'function') {
      textContent = await (file as File).text();
    }

    options.onProgress?.(70, 'Aplicando reglas de conversión CommonMark y GFM...');
    switch (format) {
      case 'txt':
        rawMarkdown = convertTxtToMarkdown(textContent);
        break;
      case 'html':
        rawMarkdown = convertHtmlToMarkdown(textContent, options);
        break;
      case 'csv':
        rawMarkdown = convertCsvToMarkdown(textContent);
        break;
      case 'json':
        rawMarkdown = convertJsonToMarkdown(textContent);
        break;
      default:
        throw new Error(`Formato no compatible (${format}).`);
    }
  }

  options.onProgress?.(90, 'Generando bloque de metadatos YAML y vista previa...');
  const finalMarkdown = options.includeFrontmatter
    ? buildFrontmatter(metadata) + rawMarkdown
    : rawMarkdown;

  options.onProgress?.(100, 'Conversión completada');

  return {
    markdown: finalMarkdown,
    rawConverted: rawMarkdown,
    metadata,
  };
}
