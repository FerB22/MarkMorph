import React from 'react';
import { Sun, Moon, ShieldCheck, FileCode2 } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  includeFrontmatter: boolean;
  onToggleFrontmatter: (val: boolean) => void;
  hasActiveFile: boolean;
  batchCount?: number;
  onNewConversion?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  includeFrontmatter,
  onToggleFrontmatter,
  hasActiveFile,
  batchCount = 0,
  onNewConversion,
}) => {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        {/* Brand & Breadcrumb Hierarchy */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm sm:text-base">
              <span className="font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                MarkMorph
              </span>
              <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">
                /
              </span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                Conversor universal y por lotes en Markdown
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden md:block">
              PDF · DOCX · EPUB · HTML · CSV · JSON · TXT — Procesamiento individual o en lote (.zip)
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Privacy indicator as clean typographic status */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mr-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Procesamiento 100 % en el navegador</span>
          </div>

          {/* Frontmatter Checkbox Option */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-colors whitespace-nowrap">
            <input
              type="checkbox"
              checked={includeFrontmatter}
              onChange={(e) => onToggleFrontmatter(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 dark:focus:ring-emerald-400 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
            />
            <span>Incluir frontmatter YAML</span>
          </label>

          {/* New file / Reset batch action when editor is active */}
          {hasActiveFile && onNewConversion && (
            <button
              onClick={onNewConversion}
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-emerald-600 dark:hover:text-emerald-400 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-colors whitespace-nowrap"
            >
              {batchCount > 1 ? 'Nuevo lote' : 'Nuevo archivo'}
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors"
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
