import { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Dropzone } from './components/Dropzone.tsx';
import { SplitPane } from './components/SplitPane.tsx';
import { SampleFile } from './utils/samples.ts';
import {
  processFileConversion,
  applyFrontmatterToggle,
  FileMetadata,
} from './utils/converters.ts';
import { AlertCircle, Loader2, X } from 'lucide-react';

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [includeFrontmatter, setIncludeFrontmatter] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  // Conversion output state
  const [markdown, setMarkdown] = useState<string>('');
  const [rawConverted, setRawConverted] = useState<string>('');
  const [baselineMarkdown, setBaselineMarkdown] = useState<string>('');
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);

  // Sync dark mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleToggleFrontmatter = (val: boolean) => {
    setIncludeFrontmatter(val);
    if (metadata && rawConverted) {
      const updated = applyFrontmatterToggle(markdown, rawConverted, val, metadata);
      setMarkdown(updated);
      const updatedBaseline = applyFrontmatterToggle(rawConverted, rawConverted, val, metadata);
      setBaselineMarkdown(updatedBaseline);
    }
  };

  const handleFileProcess = async (
    file: File | { name: string; size: number; content: string | ArrayBuffer; type?: string }
  ) => {
    setErrorAlert(null);
    setIsProcessing(true);
    setProgressPercent(10);
    setProgressStage(`Preparando ${file.name}...`);

    try {
      // Allow UI to paint initial progress bar smoothly
      await new Promise((resolve) => setTimeout(resolve, 120));

      const result = await processFileConversion(file, {
        includeFrontmatter,
        onProgress: (percent, stage) => {
          setProgressPercent(percent);
          setProgressStage(stage);
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      setMarkdown(result.markdown);
      setRawConverted(result.rawConverted);
      setBaselineMarkdown(result.markdown);
      setMetadata(result.metadata);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el archivo';
      setErrorAlert(msg);
    } finally {
      setIsProcessing(false);
      setProgressPercent(0);
      setProgressStage('');
    }
  };

  const handleSampleSelect = async (sample: SampleFile) => {
    let content: string | ArrayBuffer = '';
    let size = 0;

    if (sample.getContent) {
      try {
        setIsProcessing(true);
        setProgressPercent(10);
        setProgressStage(`Generando archivo de muestra ${sample.name}...`);
        const buffer = await sample.getContent();
        content = buffer;
        size = buffer.byteLength;
      } catch (e) {
        console.error('Error generating sample buffer', e);
        setIsProcessing(false);
        return;
      }
    } else {
      content = sample.content || '';
      size = new Blob([content]).size;
    }

    const virtualFile = {
      name: sample.name,
      size,
      content,
      type:
        sample.format === 'epub'
          ? 'application/epub+zip'
          : sample.format === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : sample.format === 'html'
              ? 'text/html'
              : sample.format === 'json'
                ? 'application/json'
                : sample.format === 'csv'
                  ? 'text/csv'
                  : 'text/plain',
    };
    handleFileProcess(virtualFile);
  };

  const handleResetToOriginal = () => {
    if (metadata && rawConverted) {
      const original = applyFrontmatterToggle(rawConverted, rawConverted, includeFrontmatter, metadata);
      setMarkdown(original);
      setBaselineMarkdown(original);
    }
  };

  const handleNewFile = () => {
    setMarkdown('');
    setRawConverted('');
    setBaselineMarkdown('');
    setMetadata(null);
    setErrorAlert(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        includeFrontmatter={includeFrontmatter}
        onToggleFrontmatter={handleToggleFrontmatter}
        hasActiveFile={Boolean(metadata)}
        onNewConversion={handleNewFile}
      />

      {/* Accessible Global Notification Banner for Errors / Incompatible Formats */}
      {errorAlert && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4 w-full" role="alert" aria-live="assertive">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold">Error en la conversión del archivo</h2>
                <p className="text-xs sm:text-sm mt-0.5">{errorAlert}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorAlert(null)}
              aria-label="Cerrar alerta de error"
              className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detailed Progress Modal Overlay */}
      {isProcessing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          aria-live="polite"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center max-w-md w-full text-center">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 animate-spin">
              <Loader2 className="w-5 h-5" />
            </div>
            <h2 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Convirtiendo documento en Markdown
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {progressStage || 'Analizando estructura y formateando sintaxis...'}
            </p>

            {/* Progress Bar */}
            <div className="w-full mt-4">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mb-1.5">
                <span>Progreso</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {progressPercent} %
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Barra de progreso de conversión"
                className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-200"
                  style={{ width: `${Math.max(8, progressPercent)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area: Dropzone (Empty State) or SplitPane (Active Editor) */}
      <main className="flex-1 flex flex-col">
        {!metadata ? (
          <Dropzone
            onFileSelect={handleFileProcess}
            onSampleSelect={handleSampleSelect}
            includeFrontmatter={includeFrontmatter}
            onToggleFrontmatter={handleToggleFrontmatter}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            progressStage={progressStage}
          />
        ) : (
          <SplitPane
            markdown={markdown}
            originalMarkdown={baselineMarkdown}
            onMarkdownChange={setMarkdown}
            metadata={metadata}
            includeFrontmatter={includeFrontmatter}
            onToggleFrontmatter={handleToggleFrontmatter}
            onReset={handleResetToOriginal}
            onNewFile={handleNewFile}
          />
        )}
      </main>

      {/* Subtle footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 py-3 text-center text-xs text-zinc-500 dark:text-zinc-500">
        MarkMorph · Procesamiento 100 % en el navegador · Compatible con CommonMark y GitHub Flavored Markdown
      </footer>
    </div>
  );
}
