import React, { useState, useEffect, useRef } from 'react';
import { DocumentProject } from '@/types/document';
import {
  generateTypstFiles,
  generateStandaloneTypst,
  extractBinaryAssets,
} from '@/core/transpiler/typstGenerator';
import {
  compileToVector,
  getVectorPagesInfo,
  renderVectorToCanvases,
  type PageDimension,
} from '@/core/typst/typstClient';
import type { FriendlyDiagnostic } from '@/core/typst/diagnostics';
import {
  Eye,
  FileCode,
  Check,
  Copy,
  Loader2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  FileText,
  Moon,
  Sun,
} from 'lucide-react';

interface PdfPreviewProps {
  widthPx?: number;
  project: DocumentProject;
  showCode: boolean;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  widthPx = 500,
  project,
  showCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCompiling, setIsCompiling] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [compileTimeMs, setCompileTimeMs] = useState<number | null>(null);
  const [pages, setPages] = useState<PageDimension[]>([]);
  const [diagnostics, setDiagnostics] = useState<FriendlyDiagnostic[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(100);
  const [nightPaper, setNightPaper] = useState<boolean>(false);

  const artifactRef = useRef<Uint8Array | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const latestCompileId = useRef(0);

  const typstCode = generateStandaloneTypst(project);

  const handleCopy = () => {
    navigator.clipboard.writeText(typstCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Debounce da compilação quando o projeto muda
  useEffect(() => {
    const currentId = ++latestCompileId.current;
    const timer = setTimeout(async () => {
      setIsCompiling(true);
      setRuntimeError(null);

      try {
        const files = generateTypstFiles(project);
        const binaryFiles = extractBinaryAssets(project);
        const result = await compileToVector(files, binaryFiles);

        if (currentId !== latestCompileId.current) return;

        setDiagnostics(result.diagnostics);
        setCompileTimeMs(result.compileTimeMs);

        if (result.error) {
          setRuntimeError(result.error);
          setIsCompiling(false);
          return;
        }

        if (result.artifact) {
          artifactRef.current = result.artifact;
          const pageInfos = await getVectorPagesInfo(result.artifact);
          if (currentId !== latestCompileId.current) return;
          setPages(pageInfos);
          setIsInitialized(true);
        }
      } catch (err) {
        if (currentId !== latestCompileId.current) return;
        setRuntimeError(err instanceof Error ? err.message : String(err));
      } finally {
        if (currentId === latestCompileId.current) {
          setIsCompiling(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [project]);

  // Renderiza os canvases sempre que o artefato ou a lista de páginas mudar
  useEffect(() => {
    const artifact = artifactRef.current;
    if (!artifact || pages.length === 0 || showCode) return;

    let cancelled = false;
    renderVectorToCanvases(
      artifact,
      (pageIndex) => {
        if (cancelled) return null;
        return canvasRefs.current.get(pageIndex) ?? null;
      },
      2.5,
    ).catch((err) => {
      if (!cancelled) {
        setRuntimeError(err instanceof Error ? err.message : String(err));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pages, showCode, compileTimeMs]);

  const basePageWidthPx = Math.max(260, widthPx - 64);
  const scaledWidthPx = Math.round((basePageWidthPx * zoom) / 100);

  return (
    <aside
      style={{ width: `${widthPx}px` }}
      className="shrink-0 border-l border-neutral-200 bg-neutral-100 flex flex-col h-[calc(100vh-3.5rem)]"
    >
      {/* Top Bar do Preview */}
      <div className="h-10 border-b border-neutral-200 bg-neutral-50 px-4 flex items-center justify-between text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          {showCode ? (
            <>
              <FileCode className="w-3.5 h-3.5 text-neutral-500" />
              <span className="font-medium">Código Typst Gerado</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-medium">Prévia PDF Real (Typst WASM)</span>
              {isCompiling ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isInitialized ? 'Compilando...' : 'Iniciando WASM...'}
                </span>
              ) : (
                compileTimeMs !== null && (
                  <span className="text-[11px] text-neutral-400">
                    • {pages.length} {pages.length === 1 ? 'página' : 'páginas'} ({compileTimeMs} ms)
                  </span>
                )
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!showCode && (
            <>
              <button
                type="button"
                onClick={() => setNightPaper(!nightPaper)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  nightPaper
                    ? 'bg-slate-800 text-amber-300 border-slate-700'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                }`}
                title="Alternar folha A4 entre Papel Branco e Papel Noturno (não afeta o PDF baixado)"
              >
                {nightPaper ? (
                  <>
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Papel Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3 h-3" />
                    <span>Papel Noturno</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-1 mr-1">
                <button
                  onClick={() => setZoom((z) => Math.max(70, z - 15))}
                  className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono text-neutral-500 w-9 text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(145, z + 15))}
                  className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-600">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copiar .typ</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Painel de Diagnósticos / Erros */}
      {(diagnostics.length > 0 || runtimeError) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800 space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-red-900">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Atenção na compilação do documento</span>
          </div>
          {runtimeError && <p className="text-[11px] text-red-700">{runtimeError}</p>}
          {diagnostics.map((d, idx) => (
            <div key={idx} className="text-[11px] text-red-700">
              <span className="font-medium">{d.location}:</span> {d.message}
            </div>
          ))}
        </div>
      )}

      {/* Conteúdo: Código ou Páginas A4 Reais Renderizadas pelo Typst */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6">
        {showCode ? (
          <div className="w-full bg-neutral-900 text-neutral-100 p-4 rounded-lg font-mono text-xs overflow-x-auto shadow-inner leading-relaxed select-text">
            <pre>{typstCode}</pre>
          </div>
        ) : !isInitialized && isCompiling ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-500">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-neutral-700">
              Carregando motor tipográfico Typst WASM...
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">
              Preparando fontes ABNT e diagramação A4 diretamente no seu navegador.
            </p>
          </div>
        ) : (
          pages.map((page, index) => {
            const aspectRatio = page.height / page.width;
            const pageHeightPx = Math.round(scaledWidthPx * aspectRatio);

            return (
              <div key={index} className="flex flex-col items-center gap-1.5">
                <div
                  className={`bg-white rounded-sm shadow-md border border-neutral-200 overflow-hidden transition-all ${
                    nightPaper ? 'pdf-paper-night' : ''
                  }`}
                  style={{
                    width: `${scaledWidthPx}px`,
                    height: `${pageHeightPx}px`,
                  }}
                >
                  <canvas
                    ref={(el) => {
                      if (el) {
                        canvasRefs.current.set(index, el);
                      } else {
                        canvasRefs.current.delete(index);
                      }
                    }}
                    className="w-full h-full block"
                  />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <FileText className="w-3 h-3" />
                  <span>
                    Página {index + 1} de {pages.length}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
