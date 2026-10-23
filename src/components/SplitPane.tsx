import React, { useState, useId, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  RotateCcw,
  Columns,
  Eye,
  Code,
  FileText,
  FileCheck2,
  FolderArchive,
  Plus,
  X,
  BarChart3,
} from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview.tsx';
import {
  BatchConversionItem,
  FileMetadata,
  formatBytes,
  formatNumberRAE,
} from '../utils/converters.ts';

interface SplitPaneProps {
  markdown: string;
  originalMarkdown: string;
  onMarkdownChange: (newContent: string) => void;
  metadata: FileMetadata;
  includeFrontmatter: boolean;
  onToggleFrontmatter: (val: boolean) => void;
  onReset: () => void;
  onNewFile: () => void;
  batchItems: BatchConversionItem[];
  activeItemId: string;
  onSelectBatchItem: (id: string) => void;
  onRemoveBatchItem: (id: string) => void;
  onAddFilesToBatch: (files: File[]) => void;
  onDownloadBatchZip: () => void;
  isDownloadingZip?: boolean;
}

export const SplitPane: React.FC<SplitPaneProps> = ({
  markdown,
  originalMarkdown,
  onMarkdownChange,
  metadata,
  includeFrontmatter,
  onToggleFrontmatter,
  onReset,
  onNewFile,
  batchItems,
  activeItemId,
  onSelectBatchItem,
  onRemoveBatchItem,
  onAddFilesToBatch,
  onDownloadBatchZip,
  isDownloadingZip = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const editorTextareaId = useId();
  const addFilesInputRef = useRef<HTMLInputElement>(null);

  // Calculate comprehensive live statistics of the resulting Markdown
  const linesCount = markdown ? markdown.split('\n').length : 0;
  const trimmedMd = markdown.trim();
  const wordsCount = trimmedMd ? trimmedMd.split(/\s+/).length : 0;
  const charsCount = markdown.length;
  const charsNoSpacesCount = markdown.replace(/\s/g, '').length;
  const paragraphsCount = trimmedMd ? trimmedMd.split(/\n\s*\n/).filter(Boolean).length : 0;
  const readingTimeMin = wordsCount === 0 ? 0 : Math.max(1, Math.ceil(wordsCount / 200));
  const hasChanges = markdown !== originalMarkdown;

  const handleCopy = async () => {
    let success = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(markdown);
        success = true;
      }
    } catch {
      // Fallback below
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = markdown;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const rawName = metadata.fileName.replace(/\.[^/.]+$/, '');
    const downloadName = `${rawName || 'documento'}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddFilesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFilesToBatch(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-3 sm:px-6 py-4">
      <input
        ref={addFilesInputRef}
        type="file"
        multiple
        accept=".pdf,.epub,.docx,.txt,.html,.htm,.xhtml,.csv,.tsv,.json,.md"
        onChange={handleAddFilesInput}
        className="hidden"
      />

      {/* Batch Queue & File Switcher Bar */}
      <div className="mb-2.5 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-2 shrink-0 tabular-nums">
            Lote ({formatNumberRAE(batchItems.length)}{' '}
            {batchItems.length === 1 ? 'archivo' : 'archivos'})
          </span>

          {batchItems.map((item) => {
            const isActive = item.id === activeItemId;
            const isModified = item.markdown !== item.baselineMarkdown;
            return (
              <div
                key={item.id}
                className={`group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                    : 'bg-zinc-50 dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <button
                  onClick={() => onSelectBatchItem(item.id)}
                  className="flex items-center gap-1.5 text-left truncate max-w-[160px] sm:max-w-[200px]"
                >
                  <span className="truncate font-semibold">{item.fileName}</span>
                  <span className="font-mono text-[10px] uppercase opacity-75">
                    {item.metadata.originalFormat}
                  </span>
                  {isModified && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
                      title="Editado manualmente"
                    />
                  )}
                </button>
                {batchItems.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveBatchItem(item.id);
                    }}
                    aria-label={`Quitar ${item.fileName} del lote`}
                    title="Quitar del lote"
                    className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => addFilesInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-dashed border-emerald-300 dark:border-emerald-800 transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Añadir archivos</span>
          </button>
        </div>

        {/* Batch ZIP Download Button */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            onClick={onDownloadBatchZip}
            disabled={isDownloadingZip || batchItems.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors disabled:opacity-50"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>
              {isDownloadingZip
                ? 'Empaquetando .zip...'
                : `Descargar lote (${formatNumberRAE(batchItems.length)}) en .zip`}
            </span>
          </button>
        </div>
      </div>

      {/* Action and Info Toolbar for Active File */}
      <div className="mb-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        {/* File Metadata Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-xs">
                {metadata.fileName}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">
                {metadata.originalFormat}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              <span>{formatBytes(metadata.sizeBytes)}</span>
              {metadata.pages !== undefined && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {formatNumberRAE(metadata.pages)}{' '}
                    {metadata.pages === 1 ? 'página' : 'páginas'}
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>{formatNumberRAE(wordsCount)} palabras</span>
              <span aria-hidden="true">·</span>
              <span>{formatNumberRAE(charsCount)} caracteres</span>
              {hasChanges && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Editado manualmente
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setViewMode('editor')}
            aria-label="Solo editor"
            title="Solo editor"
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editor</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            aria-label="Vista dividida"
            title="Vista dividida"
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'split'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dividida</span>
          </button>
          <button
            onClick={() => setViewMode('preview')}
            aria-label="Solo previsualización"
            title="Solo previsualización"
            className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vista previa</span>
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {hasChanges && (
            <button
              onClick={onReset}
              title="Restaurar a la conversión original"
              aria-label="Restaurar a la conversión original"
              className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onNewFile}
            className="text-xs font-medium px-3 py-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors whitespace-nowrap"
          >
            Vaciar área
          </button>

          {/* Copy Markdown Button with visual confirmation */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap border ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-750'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                <span>Copiar Markdown</span>
              </>
            )}
          </button>

          {/* Download .md Button */}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Descargar .md</span>
          </button>
        </div>
      </div>

      {/* Split-pane Workspace with Independent Vertical Scroll Containers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-15rem)] min-h-[480px]">
        {/* Left Pane: Code Editor (Independent Scroll + Dedicated Statistics Footer) */}
        <div
          className={`flex flex-col bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 h-full ${
            viewMode === 'preview' ? 'hidden' : viewMode === 'editor' ? 'col-span-full' : ''
          }`}
        >
          {/* Editor Header */}
          <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
            <label htmlFor={editorTextareaId} className="flex items-center gap-2 cursor-pointer">
              <Code className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Editor de código Markdown (editable)</span>
            </label>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              <label className="flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={includeFrontmatter}
                  onChange={(e) => onToggleFrontmatter(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-emerald-600 border-zinc-300 dark:border-zinc-700"
                />
                <span>Frontmatter YAML</span>
              </label>
            </div>
          </div>

          {/* Textarea Editor with isolated vertical scrolling */}
          <div className="flex-1 relative overflow-hidden">
            <textarea
              id={editorTextareaId}
              value={markdown}
              onChange={(e) => onMarkdownChange(e.target.value)}
              placeholder="# Escribe o edita tu código Markdown aquí..."
              spellCheck={false}
              className="w-full h-full p-4 font-mono text-xs sm:text-[13px] bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none leading-relaxed overflow-y-auto selection:bg-emerald-500/20"
            />
          </div>

          {/* Dedicated Word & Character Counter Bar Under the Editor */}
          <div
            aria-label="Estadísticas del documento Markdown resultante"
            className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums shrink-0"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1 font-sans font-semibold text-zinc-800 dark:text-zinc-200">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Estadísticas:</span>
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {formatNumberRAE(wordsCount)}
                </strong>{' '}
                {wordsCount === 1 ? 'palabra' : 'palabras'}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {formatNumberRAE(charsCount)}
                </strong>{' '}
                caracteres
              </span>
              <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {formatNumberRAE(charsNoSpacesCount)}
                </strong>{' '}
                sin espacios
              </span>
              <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                ·
              </span>
              <span>
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {formatNumberRAE(linesCount)}
                </strong>{' '}
                {linesCount === 1 ? 'línea' : 'líneas'}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline" aria-hidden="true">
                ·
              </span>
              <span className="hidden sm:inline">
                <strong className="text-zinc-900 dark:text-zinc-100">
                  {formatNumberRAE(paragraphsCount)}
                </strong>{' '}
                {paragraphsCount === 1 ? 'párrafo' : 'párrafos'}
              </span>
            </div>

            <div className="text-zinc-500 dark:text-zinc-400 shrink-0">
              <span>~{readingTimeMin} min de lectura</span>
            </div>
          </div>
        </div>

        {/* Right Pane: Markdown Rendered Preview (Independent Scroll) */}
        <div
          className={`flex flex-col bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 h-full ${
            viewMode === 'editor' ? 'hidden' : viewMode === 'preview' ? 'col-span-full' : ''
          }`}
        >
          {/* Preview Header */}
          <div className="px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Previsualización renderizada</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>GFM · Desplazamiento independiente</span>
            </div>
          </div>

          {/* Rendered View Component with isolated vertical scrolling */}
          <div className="flex-1 overflow-hidden">
            <MarkdownPreview markdown={markdown} />
          </div>
        </div>
      </div>
    </div>
  );
};
