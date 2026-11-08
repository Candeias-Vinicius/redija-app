import React, { useState, useEffect, useRef } from 'react';
import { DocumentProject } from '@/types/document';
import {
  generateTypstFiles,
  extractBinaryAssets,
} from '@/core/transpiler/typstGenerator';
import { exportToBibtex } from '@/core/transpiler/abntLinter';
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
  PanelRightClose,
  FolderArchive,
  Code2,
  Terminal,
  Download,
} from 'lucide-react';

interface PdfPreviewProps {
  widthPx?: number;
  isFullWidth?: boolean;
  project: DocumentProject;
  showCode: boolean;
  onToggleCode?: () => void;
  onMinimize?: () => void;
  onDownloadPdf?: () => void;
  isExportingPdf?: boolean;
  onExportProjectZip?: () => void;
  isExportingProject?: boolean;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  widthPx = 500,
  isFullWidth = false,
  project,
  showCode,
  onToggleCode,
  onMinimize,
  onDownloadPdf,
  isExportingPdf = false,
  onExportProjectZip,
  isExportingProject = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [codeTab, setCodeTab] = useState<'main' | 'abnt' | 'bibtex'>('main');
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

  const typstFiles = generateTypstFiles(project);
  const bibtexCode =
    project.references.length > 0
      ? exportToBibtex(project.references)
      : '// Nenhuma referência cadastrada ainda no projeto.';

  const getCurrentCode = () => {
    if (codeTab === 'abnt') return typstFiles['abnt.typ'];
    if (codeTab === 'bibtex') return bibtexCode;
    return typstFiles['main.typ'];
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode());
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

  const basePageWidthPx = isFullWidth
    ? 680
    : Math.max(260, widthPx - 64);
  const scaledWidthPx = Math.round((basePageWidthPx * zoom) / 100);

  return (
    <aside
      style={isFullWidth ? undefined : { width: `${widthPx}px` }}
      className={`${
        isFullWidth ? 'flex-1' : 'shrink-0'
      } border-l border-neutral-200 bg-neutral-100 flex flex-col h-full overflow-hidden`}
    >
      {/* Top Bar do Preview */}
      <div className="h-10 shrink-0 border-b border-neutral-200 bg-neutral-50 px-3 flex items-center justify-between text-xs text-neutral-600">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {showCode ? (
            <div className="flex items-center gap-1.5 font-medium text-neutral-900">
              <FileCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Código Typst</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 truncate">
              <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-medium truncate">Prévia PDF</span>
              {isCompiling ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isInitialized ? 'Compilando...' : 'WASM...'}
                </span>
              ) : (
                compileTimeMs !== null && (
                  <span className="text-[11px] text-neutral-400 shrink-0 hidden sm:inline">
                    • {pages.length} pág ({compileTimeMs}ms)
                  </span>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
                title="Alternar folha A4 entre Papel Branco e Papel Noturno"
              >
                {nightPaper ? (
                  <>
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span className="hidden sm:inline">Claro</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3 h-3" />
                    <span className="hidden sm:inline">Noturno</span>
                  </>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-0.5 mr-0.5">
                <button
                  onClick={() => setZoom((z) => Math.max(70, z - 15))}
                  className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
                  title="Diminuir zoom"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="text-[11px] font-mono text-neutral-500 w-8 text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(145, z + 15))}
                  className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded"
                  title="Aumentar zoom"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </>
          )}

          {/* Botão de Alternar entre Ver PDF e Ver Código */}
          {onToggleCode && (
            <button
              type="button"
              onClick={onToggleCode}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                showCode
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
              }`}
              title={showCode ? 'Retornar para a visualização do PDF diagramado' : 'Visualizar código Typst gerado'}
            >
              {showCode ? (
                <>
                  <Eye className="w-3 h-3 text-emerald-600" />
                  <span>Ver PDF</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3 h-3 text-neutral-500" />
                  <span>Ver Typst</span>
                </>
              )}
            </button>
          )}

          {/* Botão Baixar PDF */}
          {onDownloadPdf && (
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-xs transition-colors"
              title="Compilar e baixar o PDF final nas normas ABNT"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span>Baixar PDF</span>
                </>
              )}
            </button>
          )}

          {/* Botão Baixar Projeto Completo (.zip) */}
          {onExportProjectZip && (
            <button
              type="button"
              onClick={onExportProjectZip}
              disabled={isExportingProject}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-neutral-900 hover:bg-black disabled:opacity-60 text-white shadow-xs transition-colors"
              title="Baixar projeto completo em .zip com imagens, fontes e arquivos .typ para uso no VS Code ou Typst CLI"
            >
              {isExportingProject ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-3 h-3 text-emerald-400" />
                  <span>Baixar Projeto</span>
                </>
              )}
            </button>
          )}

          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 rounded transition-colors"
              title="Minimizar painel lateral"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Painel de Diagnósticos / Erros */}
      {(diagnostics.length > 0 || runtimeError) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800 space-y-1 shrink-0">
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
      <div className="flex-1 overflow-y-auto p-6 pb-16 flex flex-col items-center gap-6">
        {showCode ? (
          <div className="w-full flex flex-col gap-3 max-w-4xl">
            {/* Banner Informativo sobre Liberdade e Portabilidade */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <Terminal className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-emerald-900">
                    Seu documento 100% aberto e sem dependência
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    O RedijaApp compila código Typst padrão. Você pode baixar o projeto completo com todas as imagens, modelo ABNT e BibTeX para editar no VS Code ou compilar via terminal.
                  </p>
                </div>
              </div>

              {onExportProjectZip && (
                <button
                  type="button"
                  onClick={onExportProjectZip}
                  disabled={isExportingProject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold text-xs shadow-xs shrink-0 transition-colors"
                >
                  {isExportingProject ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FolderArchive className="w-3.5 h-3.5" />
                  )}
                  <span>Baixar Projeto (.zip)</span>
                </button>
              )}
            </div>

            {/* Abas de Navegação entre Arquivos do Projeto */}
            <div className="flex items-center justify-between gap-2 border-b border-neutral-300 pb-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCodeTab('main')}
                  className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-colors ${
                    codeTab === 'main'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                >
                  main.typ
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('abnt')}
                  className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-colors ${
                    codeTab === 'abnt'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                >
                  abnt.typ (Modelo)
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('bibtex')}
                  className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-colors ${
                    codeTab === 'bibtex'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                >
                  referencias.bib
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded transition-colors"
                title="Copiar código do arquivo ativo"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Arquivo</span>
                  </>
                )}
              </button>
            </div>

            {/* Visualizador do Código */}
            <div className="w-full bg-neutral-900 text-neutral-100 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-xl leading-relaxed select-text border border-neutral-800">
              <pre>{getCurrentCode()}</pre>
            </div>
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
