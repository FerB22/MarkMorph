import JSZip from 'jszip';

export interface SampleFile {
  id: string;
  name: string;
  format: 'html' | 'csv' | 'json' | 'txt' | 'docx' | 'epub';
  label: string;
  description: string;
  content?: string;
  getContent?: () => Promise<ArrayBuffer>;
}

export async function createSampleDocxBuffer(): Promise<ArrayBuffer> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );

  zip.file(
    'word/_rels/document.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  zip.file(
    'word/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
  </w:style>
</w:styles>`
  );

  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Especificación de arquitectura editorial</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t xml:space="preserve">Este documento Word (.docx) se procesa íntegramente en la memoria del navegador mediante </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>Mammoth</w:t></w:r>
      <w:r><w:t xml:space="preserve"> con una capacidad de análisis superior a </w:t></w:r>
      <w:r><w:rPr><w:i/></w:rPr><w:t>50 000 palabras por segundo</w:t></w:r>
      <w:r><w:t>.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
      <w:r><w:t>Criterios de validación</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>1. Extracción limpia de encabezados jerárquicos y énfasis tipográfico.</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>2. Conversión en sintaxis CommonMark sin estilos en línea residuales.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`
  );

  return await zip.generateAsync({ type: 'arraybuffer' });
}

export async function createSampleEpubBuffer(): Promise<ArrayBuffer> {
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
    <dc:title>El principito digital</dc:title>
    <dc:creator>Antoine de Saint-Exupéry</dc:creator>
  </metadata>
  <manifest>
    <item id="chap1" href="capitulo1.xhtml" media-type="application/xhtml+xml"/>
    <item id="chap2" href="capitulo2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chap1"/>
    <itemref idref="chap2"/>
  </spine>
</package>`
  );
  zip.file(
    'OEBPS/capitulo1.xhtml',
    `<!DOCTYPE html><html><body><h1>Capítulo I</h1><p>Pido perdón a los niños por haber dedicado este libro a una persona grande.</p><blockquote>«Todas las personas grandes han sido niños antes, pero pocas lo recuerdan».</blockquote></body></html>`
  );
  zip.file(
    'OEBPS/capitulo2.xhtml',
    `<!DOCTYPE html><html><body><h2>Capítulo II</h2><p>Viví así, solo, sin nadie con quien hablar verdaderamente, hasta una avería en el desierto de Sahara.</p><ul><li>Un dibujo de una boa</li><li>Un cordero en una caja</li><li>Una rosa misteriosa</li></ul></body></html>`
  );

  return await zip.generateAsync({ type: 'arraybuffer' });
}

export const SAMPLE_FILES: SampleFile[] = [
  {
    id: 'sample-csv',
    name: 'ventas_trimestrales.csv',
    format: 'csv',
    label: 'De CSV a tabla GFM',
    description: 'Cifras alineadas a la derecha y texto a la izquierda',
    content: `ID,Región,Producto,Ventas T1,Ventas T2,Crecimiento,Estado
101,Norte,Licencia profesional,45 000 $,58 000 $,"+28,8 %",Cumplido
102,Sur,Servidor dedicado,32 000 $,34 500 $,"+7,8 %",En progreso
103,Este,Suscripción en la nube,89 000 $,112 000 $,"+25,8 %",Superado
104,Oeste,Asistencia prémium,15 400 $,19 200 $,"+24,6 %",Superado`,
  },
  {
    id: 'sample-html',
    name: 'documento_web.html',
    format: 'html',
    label: 'De HTML a Markdown',
    description: 'Página web con encabezados, citas, listas y tabla',
    content: `<!DOCTYPE html>
<html>
<head><title>Informe de lanzamiento</title></head>
<body>
  <h1>Guía de arquitectura del producto</h1>
  <p>Esta es una especificación técnica de la versión <strong>2.0</strong> con mejoras de <em>rendimiento</em> y escalabilidad.</p>
  
  <h2>Objetivos principales</h2>
  <ul>
    <li>Reducción del 50 % en el tiempo de carga</li>
    <li>Compatibilidad nativa con <strong>Markdown</strong> multiplataforma</li>
    <li>Interfaz accesible con modo oscuro</li>
  </ul>

  <blockquote>«La simplicidad es el requisito previo para la confiabilidad». — Edsger W. Dijkstra</blockquote>

  <h2>Comparativa de métricas</h2>
  <table>
    <thead>
      <tr>
        <th>Módulo</th>
        <th>Estado</th>
        <th>Latencia</th>
        <th>Disponibilidad</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Motor de análisis</td>
        <td>Óptimo</td>
        <td>12 ms</td>
        <td>99,9 %</td>
      </tr>
      <tr>
        <td>Conversor HTML y DOCX</td>
        <td>Activo</td>
        <td>45 ms</td>
        <td>99,8 %</td>
      </tr>
      <tr>
        <td>Previsualizador</td>
        <td>En vivo</td>
        <td>5 ms</td>
        <td>100 %</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`,
  },
  {
    id: 'sample-docx',
    name: 'arquitectura_editorial.docx',
    format: 'docx',
    label: 'De Word (.docx) a Markdown',
    description: 'Documento Word con títulos, negrita y cursiva',
    getContent: createSampleDocxBuffer,
  },
  {
    id: 'sample-epub',
    name: 'el_principito.epub',
    format: 'epub',
    label: 'De libro EPUB a Markdown',
    description: 'Libro electrónico con capítulos, citas y autor',
    getContent: createSampleEpubBuffer,
  },
  {
    id: 'sample-json',
    name: 'configuracion_app.json',
    format: 'json',
    label: 'De JSON a bloque de código',
    description: 'Estructura JSON formateada con resaltado',
    content: `{
  "app": "MarkMorph",
  "version": "2.0.0",
  "settings": {
    "theme": "system",
    "includeFrontmatter": true,
    "lineWrapping": true,
    "supportedFormats": ["txt", "html", "docx", "epub", "csv", "json"]
  },
  "author": {
    "name": "Equipo editorial",
    "license": "MIT"
  },
  "features": [
    "Conversión en el cliente sin subidas a servidores",
    "Tablas GFM con alineación numérica automática",
    "Edición bidireccional y exportación instantánea"
  ]
}`,
  },
  {
    id: 'sample-txt',
    name: 'notas_reunion.txt',
    format: 'txt',
    label: 'De TXT a Markdown',
    description: 'Notas de reunión y puntos de seguimiento',
    content: `MINUTA DE REUNIÓN — SINCRONIZACIÓN DE PROYECTO
Fecha: 23 de octubre de 2026
Participantes: equipos de diseño, desarrollo y calidad

PUNTOS CLAVE
1. Validar la respuesta del arrastre de archivos en navegadores modernos.
2. Asegurar que las tablas generadas respeten el formato estándar de GitHub Flavored Markdown.
3. Proporcionar confirmación visual inmediata al copiar en el portapapeles.

ACCIONES INMEDIATAS
- Revisar la compatibilidad con archivos DOCX de Word 2016 o superior.
- Mantener el desplazamiento independiente entre el editor y la vista previa.`,
  },
];
