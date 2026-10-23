import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownPreviewProps {
  markdown: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ markdown }) => {
  // Extract and format frontmatter if present for dedicated visual display
  const { frontmatter, bodyMarkdown } = useMemo(() => {
    const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n\r?\n?/;
    const match = markdown.match(fmRegex);
    if (match) {
      const rawYaml = match[1];
      const parsedYaml: Record<string, string> = {};
      rawYaml.split('\n').forEach((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
          const key = line.slice(0, colonIdx).trim();
          const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
          if (key) parsedYaml[key] = val;
        }
      });
      return {
        frontmatter: parsedYaml,
        bodyMarkdown: markdown.replace(fmRegex, ''),
      };
    }
    return { frontmatter: null, bodyMarkdown: markdown };
  }, [markdown]);

  const sanitizedHtml = useMemo(() => {
    try {
      marked.setOptions({
        gfm: true,
        breaks: true,
      });
      const rawHtml = marked.parse(bodyMarkdown) as string;
      return DOMPurify.sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['align'],
      });
    } catch (e) {
      console.error('Error rendering markdown', e);
      return '<p class="text-red-500">Error al renderizar la previsualización.</p>';
    }
  }, [bodyMarkdown]);

  const formatFrontmatterKey = (key: string): string => {
    const map: Record<string, string> = {
      title: 'Título',
      original_format: 'Formato original',
      file_size_kb: 'Tamaño del archivo',
      conversion_date: 'Fecha de conversión',
      author: 'Autor',
      date: 'Fecha',
      file_size: 'Tamaño',
    };
    if (map[key]) return map[key];
    const clean = key.replace(/_/g, ' ');
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };

  const formatFrontmatterValue = (key: string, val: string): string => {
    if (key === 'file_size_kb' && !val.toLowerCase().includes('kb')) {
      return `${val} KB`;
    }
    return val;
  };

  return (
    <div className="p-6 overflow-y-auto h-full text-zinc-900 dark:text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-900 dark:selection:text-emerald-100">
      {/* Frontmatter Metadata Summary Block if present */}
      {frontmatter && Object.keys(frontmatter).length > 0 && (
        <div className="mb-6 p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs">
          <div className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500 dark:text-zinc-400 mb-2 flex items-center justify-between">
            <span>Metadatos de frontmatter YAML</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">---</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] tabular-nums">
            {Object.entries(frontmatter).map(([k, v]) => (
              <div
                key={k}
                className="bg-white dark:bg-zinc-900 p-2 rounded-md border border-zinc-200/80 dark:border-zinc-800"
              >
                <div className="text-zinc-500 dark:text-zinc-400 text-[10px] font-sans">
                  {formatFrontmatterKey(k)}
                </div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                  {formatFrontmatterValue(k, v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rendered HTML with GFM table alignments and clean typography */}
      <div
        className="markdown-body max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
};
