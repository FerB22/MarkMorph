import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileCode,
  FileSpreadsheet,
  Braces,
  FileBadge2,
  BookOpen,
  FileSearch,
  FolderArchive,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { SAMPLE_FILES, SampleFile } from '../utils/samples.ts';

interface DropzoneProps {
  onFilesSelect: (files: File[]) => void;
  onSampleSelect: (sample: SampleFile) => void;
  onBatchSampleSelect: () => void;
  includeFrontmatter: boolean;
  onToggleFrontmatter: (val: boolean) => void;
  isProcessing: boolean;
  progressPercent?: number;
  progressStage?: string;
}

export const Dropzone: React.FC<DropzoneProps> = ({
  onFilesSelect,
  onSampleSelect,
  onBatchSampleSelect,
  includeFrontmatter,
  onToggleFrontmatter,
  isProcessing,
  progressPercent = 0,
  progressStage = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelect(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const formats = [
    { ext: '.pdf', name: 'PDF', icon: FileSearch, desc: 'Títulos y párrafos con pdfjs-dist' },
    { ext: '.epub', name: 'EPUB', icon: BookOpen, desc: 'Capítulos XHTML y manifiesto OPF' },
    { ext: '.docx', name: 'Word', icon: FileBadge2, desc: 'Jerarquía semántica con Mammoth' },
    { ext: '.html', name: 'HTML', icon: FileCode, desc: 'Etiquetas limpias con Turndown' },
    { ext: '.csv', name: 'CSV', icon: FileSpreadsheet, desc: 'Tablas GFM con alineación numérica' },
    { ext: '.json', name: 'JSON', icon: Braces, desc: 'Bloques de código con sangría' },
    { ext: '.txt', name: 'TXT', icon: FileText, desc: 'Normalización de saltos y párrafos' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
      {/* Intro Hero */}
      <div className="text-center mb-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400 mb-2.5">
          Ejecución 100 % en el cliente · Conversión individual o por lotes (.zip)
        </p>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
          Convierte uno o varios documentos en{' '}
          <span className="text-emerald-600 dark:text-emerald-400">Markdown estructurado</span>
        </h1>
        <p className="mt-2.5 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Arrastra simultáneamente hasta 10 o más archivos PDF, EPUB, Word (.docx), HTML, CSV, JSON o TXT y descárgalos de forma individual o en un único archivo comprimido <code className="font-mono text-xs">.zip</code>.
        </p>
      </div>

      {/* Main Drag & Drop Zone (Supports Single & Multiple Files) */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona para arrastrar y soltar uno o varios archivos simultáneamente"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={`relative border-2 border-dashed rounded-2xl p-7 sm:p-10 text-center cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
          isDragOver
            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 scale-[1.005]'
            : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-500 dark:hover:border-emerald-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.epub,.docx,.txt,.html,.htm,.xhtml,.csv,.tsv,.json,.md"
          onChange={handleInputChange}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="flex flex-col items-center justify-center">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-150 border ${
              isDragOver
                ? 'bg-emerald-600 text-white border-emerald-500 scale-105'
                : 'bg-zinc-50 dark:bg-zinc-800/80 text-emerald-600 dark:text-emerald-400 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <UploadCloud className="w-7 h-7" />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {isDragOver
              ? '¡Suelta los archivos para iniciar la conversión por lotes!'
              : 'Arrastra y suelta aquí uno o varios archivos a la vez'}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            o{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 underline underline-offset-4">
              haz clic para seleccionar múltiples documentos
            </span>{' '}
            desde tu equipo
          </p>

          {/* Clean typographic format list */}
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 w-full max-w-2xl">
            <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              Formatos admitidos: <strong className="text-zinc-800 dark:text-zinc-200">.pdf</strong> ·{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">.docx</strong> ·{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">.epub</strong> ·{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">.html</strong> ·{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">.csv</strong> ·{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">.json</strong> ·{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">.txt</strong>
            </p>
          </div>

          {/* Inline Progress Bar when processing */}
          {isProcessing && (
            <div
              className="mt-5 w-full max-w-md text-left bg-zinc-50 dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between text-xs font-medium mb-1.5">
                <span className="text-zinc-700 dark:text-zinc-300 truncate pr-2">
                  {progressStage || 'Procesando archivos...'}
                </span>
                <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {progressPercent} %
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progreso de conversión de archivos"
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-200"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Frontmatter Configuration Bar */}
      <div className="mt-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Incluir bloque de metadatos (frontmatter YAML)
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Inserta al inicio de cada archivo las propiedades <code className="font-mono text-[11px]">title</code>,{' '}
              <code className="font-mono text-[11px]">original_format</code>,{' '}
              <code className="font-mono text-[11px]">file_size_kb</code> y{' '}
              <code className="font-mono text-[11px]">conversion_date</code> delimitadas por{' '}
              <code className="font-mono text-[11px]">---</code>.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none bg-zinc-50 dark:bg-zinc-800/90 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 transition-colors shrink-0">
          <input
            type="checkbox"
            checked={includeFrontmatter}
            onChange={(e) => onToggleFrontmatter(e.target.checked)}
            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-600 bg-transparent"
          />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            Incluir frontmatter YAML
          </span>
        </label>
      </div>

      {/* Quick Test Samples + Batch Demo Action */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Muestras interactivas para probar los 7 formatos o el modo por lotes
            </h3>
          </div>
          <button
            onClick={onBatchSampleSelect}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Probar lote de 5 archivos simultáneos (.zip)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SAMPLE_FILES.map((sample) => (
            <button
              key={sample.id}
              onClick={(e) => {
                e.stopPropagation();
                onSampleSelect(sample);
              }}
              disabled={isProcessing}
              className="flex flex-col text-left p-3.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-600 transition-all group disabled:opacity-50"
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  .{sample.format}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-1">
                {sample.label}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                {sample.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Technical Architecture & Format Capabilities Grid */}
      <div className="mt-8 pt-7 border-t border-zinc-200 dark:border-zinc-800">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {formats.map((fmt) => {
            const Icon = fmt.icon;
            return (
              <div
                key={fmt.ext}
                className="p-3 rounded-xl bg-white/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{fmt.name}</span>
                  <span className="font-mono text-[11px] font-normal text-zinc-400">{fmt.ext}</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                  {fmt.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="flex gap-2.5 items-start">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-200">Conversión por lotes (.zip):</strong>{' '}
              procesa 5, 10 o más documentos simultáneamente, edítalos por separado y descárgalos en un único archivo comprimido.
            </p>
          </div>
          <div className="flex gap-2.5 items-start">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-200">Extracción PDF con pdfjs-dist:</strong>{' '}
              analiza las coordenadas y el tamaño tipográfico de cada página para reconstruir títulos, listas y párrafos.
            </p>
          </div>
          <div className="flex gap-2.5 items-start">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              <strong className="text-zinc-900 dark:text-zinc-200">Métricas en vivo bajo el editor:</strong>{' '}
              recuento instantáneo de palabras, caracteres con y sin espacios, líneas y tiempo estimado de lectura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
