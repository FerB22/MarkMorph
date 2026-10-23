# MarkMorph — Conversor universal de archivos en Markdown

MarkMorph es una estación de trabajo editorial ejecutada al 100 % en el navegador que permite transformar documentos de múltiples formatos en código Markdown limpio, estructurado y compatible con las especificaciones CommonMark y GitHub Flavored Markdown (GFM), aplicando de forma estricta las normas ortotipográficas y numéricas de la RAE y la ASALE.

## Revisión del usuario y decisiones críticas

> [!IMPORTANT]
> - **Procesamiento local y privacidad absoluta**: Toda la lectura, el análisis sintáctico y la conversión de archivos (`.txt`, `.html`, `.docx`, `.epub`, `.csv` y `.json`) se ejecutan exclusivamente en la memoria del navegador del usuario sin enviar datos a servidores externos.
> - **Alineación inteligente en tablas CSV**: El motor analizará las celdas de cada columna para detectar valores numéricos, porcentajes e importes monetarios; aplicará alineación a la derecha (`---:`) en columnas numéricas y alineación a la izquierda (`:---`) en columnas de texto, además de rellenar con espacios las celdas para mantener separadores verticales uniformes en el código fuente.
> - **Esquema normativo de metadatos YAML**: Cuando la opción de metadatos esté activa, se inyectará al inicio del documento un bloque delimitado por `---` con las propiedades exactas siguientes: `title`, `original_format`, `file_size_kb` y `conversion_date`.
> - **Desplazamiento independiente y progreso detallado**: El área de trabajo dividida mantendrá contenedores de desplazamiento aislados para el editor y la vista previa, e incorporará una barra de progreso por etapas reales de procesamiento.

---

## 1. Visión general y concepto central

- **Propósito de la aplicación**: Facilitar a redactores técnicos, desarrolladores y editores la conversión inmediata de documentos ofimáticos, libros electrónicos y conjuntos de datos tabulares en archivos Markdown listos para repositorios de documentación o sistemas de gestión de contenidos.
- **Formatos admitidos y optimizados**:
  - **Texto plano (`.txt`)**: Normalización de saltos de línea, preservación de párrafos y aplicación de formato numérico RAE.
  - **Páginas web (`.html`)**: Limpieza de etiquetas de estilo y scripts mediante Turndown, generando encabezados ATX (`#`), bloques de código delimitados por triple acento grave y tablas GFM.
  - **Documentos Word (`.docx`)**: Extracción semántica de jerarquías de títulos, listas anidadas, énfasis y tablas mediante Mammoth, seguida de conversión en Markdown limpio.
  - **Libros electrónicos (`.epub`)**: Descompresión en memoria del contenedor ZIP mediante JSZip, lectura del manifiesto OPF (`content.opf`), extracción ordenada de capítulos XHTML y consolidación en un único documento Markdown estructurado.
  - **Datos tabulares (`.csv`)**: Detección automática de delimitadores con PapaParse, inferencia de tipos por columna, alineación sintáctica GFM (`:---` para texto y `---:` para cifras) y formateo de encabezados y separadores alineados.
  - **Estructuras de datos (`.json`)**: Validación, embellecimiento con sangría de 2 espacios y encapsulado en bloques de código con resaltado de sintaxis `json`.

---

## 2. Experiencia de usuario y diseño visual

- **Estética y dirección visual**:
  - Interfaz de precisión técnica inspirada en entornos de edición modernos, con superficies planas de un solo nivel de elevación delimitadas por bordes sutiles de 1 px (`border-zinc-200` en modo claro y `border-zinc-800` en modo oscuro).
  - Tipografía diferenciada que combina `Plus Jakarta Sans` en la interfaz general con `JetBrains Mono` y numerales tabulares (`tabular-nums`) en el editor de código, las métricas de palabras, los tiempos de respuesta y las tablas de datos.
  - Cumplimiento estricto de la disciplina visual sin saturación de insignias: los metadatos estáticos de formato y las métricas del documento se presentan como texto limpio separado por puntos medios (`·`), reservando los bordes interactivos exclusivamente para los controles accionables.
- **Flujo de interacción y estados visuales**:
  1. **Zona de carga interactiva (Drag & Drop)**: Área receptiva con retroalimentación visual inmediata al arrastrar archivos sobre el lienzo, selector de archivos del sistema y acceso directo a muestras reales integradas para probar cada formato al instante.
  2. **Barra de progreso detallada**: Indicador visual durante el procesamiento que informa del porcentaje de avance (`0 %` a `100 %`) y de la etapa activa (lectura de bytes, análisis estructural, normalización tipográfica y generación de Markdown).
  3. **Gestión accesible de errores**: Alertas claras con regiones `role="alert"` cuando el usuario intenta cargar un formato no admitido o un archivo dañado, indicando la causa exacta y los formatos compatibles.
  4. **Espacio de trabajo dividido (Split-pane)**:
     - **Panel izquierdo (Editor Markdown)**: Editor de texto monoespaciado con numeración e indicadores de líneas, edición manual en tiempo real y desplazamiento vertical independiente.
     - **Panel derecho (Previsualización renderizada)**: Representación HTML limpia y segura (mediante Marked y DOMPurify) con soporte completo para tablas GFM con cifras alineadas a la derecha, listas de tareas, citas y bloques de código, dotada de su propio contenedor de desplazamiento independiente.
  5. **Acciones de exportación y control**: Conmutador para activar o desactivar en vivo el bloque Frontmatter YAML, botón «Copiar Markdown» con confirmación visual instantánea y botón «Descargar .md» que genera el archivo final con el nombre normalizado del documento original.

---

## 3. Decisiones clave de producto y compensaciones

- **Alineación automática en tablas CSV frente a configuración manual**:
  - Se ha optado por inspeccionar automáticamente las filas de datos de cada columna en los archivos CSV para determinar si contienen valores numéricos (enteros, decimales, porcentajes como `25 %` o importes monetarios como `50 000 €`). Las columnas numéricas reciben el marcador `---:` y las textuales `:---`, además de igualar el ancho de las celdas con espacios en el código Markdown para que la tabla sea legible tanto en el editor de texto plano como en la vista previa renderizada.
- **Conmutación reactiva del Frontmatter YAML sin perder ediciones**:
  - El bloque YAML (`title`, `original_format`, `file_size_kb` y `conversion_date`) se gestiona de forma dinámica al inicio del documento. Si el usuario activa o desactiva la casilla después de haber editado el cuerpo del Markdown, el sistema actualiza únicamente la cabecera YAML preservando intactos los cambios realizados en el contenido.
- **Normalización ortotipográfica RAE / ASALE no destructiva**:
  - El formateador numérico agrupa con espacio fino o simple los números de cinco o más dígitos (`35 000`, `1 250 000`) y garantiza el espacio antes de símbolos de porcentaje y unidades (`100 %`, `25 KB`), pero protege de forma estricta los bloques de código fuente, las URL, las rutas de archivo y los números de cuatro cifras (como el año `2026` o el puerto `8080`).

---

## 4. Arquitectura técnica y estrategia de datos

```
+-------------------------------------------------------------------------+
|                        Interfaz de usuario React                        |
|   +-----------------------+   +-------------------------------------+   |
|   |   Cabecera y ajustes  |   |     Zona de carga y muestras        |   |
|   | (Tema, interruptor    |   | (Arrastrar y soltar, barra de       |   |
|   |  Frontmatter YAML)    |   |  progreso por etapas, alertas)      |   |
|   +-----------+-----------+   +------------------+------------------+   |
+---------------|----------------------------------|----------------------+
                |                                  | Archivo seleccionado
                v                                  v
+-------------------------------------------------------------------------+
|               Motor de conversión en el cliente (Browser)               |
|                                                                         |
|  1. Detección de formato y extracción de metadatos (tamaño en KB, fecha)|
|  2. Procesadores específicos por formato:                               |
|     - TXT  -> Normalización de párrafos y saltos de línea               |
|     - HTML -> Turndown + plugin GFM (tablas, tachado, tareas)           |
|     - DOCX -> Mammoth (DOCX a HTML semántico) -> Turndown               |
|     - EPUB -> JSZip + DOMParser (OPF + capítulos XHTML) -> Turndown     |
|     - CSV  -> PapaParse -> Inferencia numérica/texto -> Tabla GFM       |
|     - JSON -> JSON.parse / stringify -> Bloque de código ```json        |
|  3. Normalizador ortotipográfico RAE (miles de 5+ cifras, unidades, %)  |
|  4. Inyector dinámico de Frontmatter YAML                               |
+------------------------------------+------------------------------------+
                                     | Markdown generado
                                     v
+-------------------------------------------------------------------------+
|                Área de trabajo dividida (Split-pane)                    |
|   +-------------------------------+   +-----------------------------+   |
|   |   Panel izquierdo: Editor     |   | Panel derecho: Vista previa |   |
|   | - Edición en vivo             |   | - Renderizado Marked + GFM  |   |
|   | - Fuente monoespaciada        |   | - Sanitización DOMPurify    |   |
|   | - Scroll vertical propio      |   | - Scroll vertical propio    |   |
|   +-------------------------------+   +-----------------------------+   |
+-------------------------------------------------------------------------+
```

- **Gestión de estado y rendimiento**:
  - El estado principal mantiene el contenido Markdown actual, los metadatos del archivo activo, el estado del interruptor YAML, el progreso de carga por etapas y el modo de visualización (`split`, `editor` o `preview`).
  - El renderizado de la vista previa utiliza memorización (`useMemo`) combinando `marked` (configurado con soporte GFM y saltos de línea) y `DOMPurify` para garantizar fluidez instantánea al escribir y protección frente a inyecciones XSS.
