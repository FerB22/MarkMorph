import { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Dropzone } from './components/Dropzone.tsx';
import { SplitPane } from './components/SplitPane.tsx';
import { SAMPLE_FILES, SampleFile } from './utils/samples.ts';
import {
  processFileConversion,
  applyFrontmatterToggle,
  createBatchZipBuffer,
  BatchConversionItem,
} from './utils/converters.ts';
import { AlertCircle, Loader2, X } from 'lucide-react';

type VirtualOrRealFile =
  | File
  | { name: string; size: number; content: string | ArrayBuffer; type?: string };

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [includeFrontmatter, setIncludeFrontmatter] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);

  // Batch items state (supports 1 or many files)
  const [batchItems, setBatchItems] = useState<BatchConversionItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string>('');

  const activeItem =
    batchItems.find((item) => item.id === activeItemId) || batchItems[0] || null;

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
    setBatchItems((prev) =>
      prev.map((item) => {
        const updatedMd = applyFrontmatterToggle(
          item.markdown,
          item.rawConverted,
          val,
          item.metadata
        );
        const updatedBaseline = applyFrontmatterToggle(
          item.rawConverted,
          item.rawConverted,
          val,
          item.metadata
        );
        return {
          ...item,
          markdown: updatedMd,
          baselineMarkdown: updatedBaseline,
        };
      })
    );
  };

  const handleFilesProcess = async (
    files: VirtualOrRealFile[],
    appendToBatch = false
  ) => {
    if (files.length === 0) return;

    setErrorAlert(null);
    setIsProcessing(true);
    setProgressPercent(5);
    setProgressStage(
      files.length === 1
        ? `Preparando ${files[0].name}...`
        : `Iniciando lote de ${files.length} archivos...`
    );

    const convertedItems: BatchConversionItem[] = [];
    const errors: string[] = [];

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileBaseProgress = Math.round((i / files.length) * 100);
        const fileSpan = 100 / files.length;

        try {
          const result = await processFileConversion(file, {
            includeFrontmatter,
            onProgress: (subPercent, stage) => {
              const combinedPercent = Math.min(
                99,
                Math.round(fileBaseProgress + (subPercent / 100) * fileSpan)
              );
              setProgressPercent(combinedPercent);
              const prefix =
                files.length > 1 ? `[${i + 1}/${files.length}] ${file.name} — ` : '';
              setProgressStage(`${prefix}${stage}`);
            },
          });

          const id = `${Date.now()}-${i}-${file.name}`;
          convertedItems.push({
            id,
            fileName: file.name,
            markdown: result.markdown,
            rawConverted: result.rawConverted,
            baselineMarkdown: result.markdown,
            metadata: result.metadata,
            status: 'completed',
          });
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : `Error al procesar ${file.name}`;
          errors.push(msg);
        }
      }

      setProgressPercent(100);
      setProgressStage('Conversión completada');
      await new Promise((resolve) => setTimeout(resolve, 90));

      if (convertedItems.length > 0) {
        setBatchItems((prev) =>
          appendToBatch ? [...prev, ...convertedItems] : convertedItems
        );
        setActiveItemId(convertedItems[0].id);
      }

      if (errors.length > 0) {
        setErrorAlert(errors.join(' · '));
      }
    } finally {
      setIsProcessing(false);
      setProgressPercent(0);
      setProgressStage('');
    }
  };

  const sampleToVirtualFile = async (sample: SampleFile): Promise<VirtualOrRealFile> => {
    let content: string | ArrayBuffer = '';
    let size = 0;

    if (sample.getContent) {
      const buffer = await sample.getContent();
      content = buffer;
      size = buffer.byteLength;
    } else {
      content = sample.content || '';
      size = new Blob([content]).size;
    }

    return {
      name: sample.name,
      size,
      content,
      type:
        sample.format === 'pdf'
          ? 'application/pdf'
          : sample.format === 'epub'
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
  };

  const handleSampleSelect = async (sample: SampleFile) => {
    try {
      setIsProcessing(true);
      setProgressPercent(5);
      setProgressStage(`Generando muestra ${sample.name}...`);
      const vFile = await sampleToVirtualFile(sample);
      await handleFilesProcess([vFile], false);
    } catch (e) {
      console.error('Error generating sample', e);
      setIsProcessing(false);
    }
  };

  const handleBatchSampleSelect = async () => {
    try {
      setIsProcessing(true);
      setProgressPercent(5);
      setProgressStage('Preparando lote de demostración con 5 archivos de distintos formatos...');
      const batchSamples = SAMPLE_FILES.slice(0, 5);
      const virtualFiles: VirtualOrRealFile[] = [];
      for (const s of batchSamples) {
        virtualFiles.push(await sampleToVirtualFile(s));
      }
      await handleFilesProcess(virtualFiles, false);
    } catch (e) {
      console.error('Error generating batch samples', e);
      setIsProcessing(false);
    }
  };

  const handleMarkdownChange = (newContent: string) => {
    if (!activeItem) return;
    setBatchItems((prev) =>
      prev.map((item) =>
        item.id === activeItem.id ? { ...item, markdown: newContent } : item
      )
    );
  };

  const handleResetToOriginal = () => {
    if (!activeItem) return;
    setBatchItems((prev) =>
      prev.map((item) => {
        if (item.id !== activeItem.id) return item;
        const original = applyFrontmatterToggle(
          item.rawConverted,
          item.rawConverted,
          includeFrontmatter,
          item.metadata
        );
        return {
          ...item,
          markdown: original,
          baselineMarkdown: original,
        };
      })
    );
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activeItemId === id && filtered.length > 0) {
        setActiveItemId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleDownloadBatchZip = async () => {
    if (batchItems.length === 0) return;
    setIsDownloadingZip(true);
    try {
      const zipUint8 = await createBatchZipBuffer(
        batchItems.map((item) => ({
          fileName: item.fileName,
          markdown: item.markdown,
        }))
      );
      const blob = new Blob([zipUint8], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        batchItems.length === 1
          ? `${batchItems[0].fileName.replace(/\.[^/.]+$/, '')}_markdown.zip`
          : `markmorph_lote_${batchItems.length}_archivos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error creating batch zip', err);
      setErrorAlert('No se pudo generar el archivo comprimido .zip del lote.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleNewFile = () => {
    setBatchItems([]);
    setActiveItemId('');
    setErrorAlert(null);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={handleToggleDarkMode}
        includeFrontmatter={includeFrontmatter}
        onToggleFrontmatter={handleToggleFrontmatter}
        hasActiveFile={Boolean(activeItem)}
        batchCount={batchItems.length}
        onNewConversion={handleNewFile}
      />

      {/* Accessible Global Notification Banner for Errors / Incompatible Formats */}
      {errorAlert && (
        <div
          className="max-w-5xl mx-auto px-4 sm:px-6 mt-4 w-full"
          role="alert"
          aria-live="assertive"
        >
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-bold">Error en la conversión</h2>
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
              Convirtiendo en Markdown
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

      {/* Main Content Area: Dropzone (Empty State) or SplitPane (Active Batch / Editor) */}
      <main className="flex-1 flex flex-col">
        {!activeItem ? (
          <Dropzone
            onFilesSelect={(files) => handleFilesProcess(files, false)}
            onSampleSelect={handleSampleSelect}
            onBatchSampleSelect={handleBatchSampleSelect}
            includeFrontmatter={includeFrontmatter}
            onToggleFrontmatter={handleToggleFrontmatter}
            isProcessing={isProcessing}
            progressPercent={progressPercent}
            progressStage={progressStage}
          />
        ) : (
          <SplitPane
            markdown={activeItem.markdown}
            originalMarkdown={activeItem.baselineMarkdown}
            onMarkdownChange={handleMarkdownChange}
            metadata={activeItem.metadata}
            includeFrontmatter={includeFrontmatter}
            onToggleFrontmatter={handleToggleFrontmatter}
            onReset={handleResetToOriginal}
            onNewFile={handleNewFile}
            batchItems={batchItems}
            activeItemId={activeItem.id}
            onSelectBatchItem={setActiveItemId}
            onRemoveBatchItem={handleRemoveBatchItem}
            onAddFilesToBatch={(files) => handleFilesProcess(files, true)}
            onDownloadBatchZip={handleDownloadBatchZip}
            isDownloadingZip={isDownloadingZip}
          />
        )}
      </main>

      {/* Subtle footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 py-3 text-center text-xs text-zinc-500 dark:text-zinc-500">
        MarkMorph · Procesamiento individual y por lotes (.zip) 100 % en el navegador · Compatible con CommonMark y GitHub Flavored Markdown
      </footer>
    </div>
  );
}
