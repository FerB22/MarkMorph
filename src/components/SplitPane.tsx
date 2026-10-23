import React, { useState, useId } from 'react';
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
} from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview.tsx';
import { FileMetadata, formatBytes, formatNumberRAE } from '../utils/converters.ts';

interface SplitPaneProps {
  markdown: string;
  originalMarkdown: string;
  onMarkdownChange: (newContent: string) => void;
  metadata: FileMetadata;
  includeFrontmatter: boolean;
  onToggleFrontmatter: (val: boolean) => void;
  onReset: () => void;
  onNewFile: () => void;
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
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  const editorTextareaId = useId();

  // Calculate statistics with tabular precision
  const linesCount = markdown.split('\n').length;
  const wordsCount = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const charsCount = markdown.length;
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

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-3 sm:px-6 py-4">
      {/* Action and Info Toolbar */}
      <div className="mb-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        {/* File Metadata Info (clean text separated by middle dots) */}
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
              <span aria-hidden="true">·</span>
              <span>{formatNumberRAE(linesCount)} líneas</span>
              <span aria-hidden="true">·</span>
              <span>{formatNumberRAE(wordsCount)} palabras</span>
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
            Cargar otro
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[calc(100vh-12rem)] min-h-[480px]">
        {/* Left Pane: Code Editor (Independent Scroll) */}
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
            <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
              <span>{formatNumberRAE(charsCount)} caracteres</span>
              <span aria-hidden="true">·</span>
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
