import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { DocumentProject } from '@/types/document';
import {
  generateTypstFiles,
  extractBinaryAssets,
  getTemplateFileName,
} from '@/core/transpiler/typstGenerator';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import { resolveProjectUniverseAssets } from '@/core/universe/universeResolver';
import { exportToBibtex, getOrderedReferences } from '@/core/transpiler/abntLinter';
import {
  compileToVector,
  getVectorPagesInfo,
  renderVectorToCanvases,
  type PageDimension,
} from '@/core/typst/typstClient';
import type { FriendlyDiagnostic } from '@/core/typst/diagnostics';
import { PaneWindowControls } from '@/components/ui/PaneWindowControls';
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
  isCompact?: boolean;
  project: DocumentProject;
  showCode: boolean;
  onToggleCode?: () => void;
  onMinimize?: () => void;
  /** Deixa só este painel visível (desktop). */
  onMaximize?: () => void;
  /** Volta a exibir todos os painéis (quando este está maximizado). */
  onRestoreLayout?: () => void;
  /** Este é o único painel visível. */
  isMaximized?: boolean;
  onDownloadPdf?: () => void;
  isExportingPdf?: boolean;
  onDownloadDocx?: () => void;
  isExportingDocx?: boolean;
  onExportProjectZip?: () => void;
  onExportTypst?: () => void;
  isExportingProject?: boolean;
  onCompiledPagesChange?: (pageCount: number) => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  widthPx = 500,
  isFullWidth = false,
  isCompact = false,
  project,
  showCode,
  onToggleCode,
  onMinimize,
  onMaximize,
  onRestoreLayout,
  isMaximized = false,
  onDownloadPdf,
  isExportingPdf = false,
  onDownloadDocx,
  isExportingDocx = false,
  onExportProjectZip,
  onExportTypst,
  isExportingProject = false,
  onCompiledPagesChange,
}) => {
  const onCompiledPagesChangeRef = useRef(onCompiledPagesChange);
  useEffect(() => {
    onCompiledPagesChangeRef.current = onCompiledPagesChange;
  }, [onCompiledPagesChange]);
  const [copied, setCopied] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuId = useId();
  const hasExtraExports = Boolean(onDownloadDocx || onExportProjectZip || onExportTypst);

  // Fecha o menu de exportação ao clicar fora ou com Esc
  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExportMenuOpen]);
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

  const capabilities = useMemo(() => getTemplateCapabilities(project), [project]);
  const templateFileName = useMemo(
    () => getTemplateFileName(capabilities.effectiveType),
    [capabilities.effectiveType],
  );

  // Computa typstFiles e bibtexCode somente quando a aba de código estiver ativa
  const typstFilesForCode = useMemo(() => {
    if (!showCode) return null;
    return generateTypstFiles(project);
  }, [showCode, project]);

  const bibtexCode = useMemo(() => {
    if (!showCode) return '';
    if (project.references.length === 0) {
      return '// Nenhuma referência cadastrada ainda no projeto.';
    }
    const ordered = getOrderedReferences(
      project.references,
      project.templateConfig?.referenceOrdering ?? 'alphabetical',
      project.blocks,
    );
    return exportToBibtex(ordered);
  }, [showCode, project.references, project.templateConfig?.referenceOrdering, project.blocks]);

  const getCurrentCode = () => {
    if (codeTab === 'bibtex') return bibtexCode;
    if (!typstFilesForCode) return '';
    if (codeTab === 'abnt') return typstFilesForCode[templateFileName] || typstFilesForCode['abnt.typ'];
    return typstFilesForCode['main.typ'];
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
        let extraFiles: Record<string, string> | undefined = undefined;
        let packageArchives: Record<string, Uint8Array> | undefined = undefined;
        if (capabilities.effectiveType === 'universe_custom') {
          const pkgAssets = await resolveProjectUniverseAssets(
            project.templateConfig?.universePackage || '@preview/charged-ieee:0.1.4',
          );
          extraFiles = pkgAssets.extraFiles;
          packageArchives = pkgAssets.packageArchives;
        }

        const files = generateTypstFiles(project, extraFiles);
        const binaryFiles = extractBinaryAssets(project);
        const result = await compileToVector(
          files,
          binaryFiles,
          {
            fontFamily: project.templateConfig?.fontFamily ?? 'serif',
            customFontFamily: project.templateConfig?.customFontFamily,
          },
          packageArchives,
        );

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
          const pageInfos = result.pages || (await getVectorPagesInfo(result.artifact));
          if (currentId !== latestCompileId.current) return;
          setPages(pageInfos);
          onCompiledPagesChangeRef.current?.(pageInfos.length);
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
  }, [project, capabilities.effectiveType]);

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

  const basePageWidthPx = isFullWidth || isCompact
    ? Math.min(680, typeof window !== 'undefined' ? Math.max(260, window.innerWidth - 48) : 680)
    : Math.max(260, widthPx - 64);
  const scaledWidthPx = Math.round((basePageWidthPx * zoom) / 100);

  return (
    <aside
      aria-label="Prévia do PDF"
      style={isFullWidth || isCompact ? undefined : { width: `${widthPx}px` }}
      className={`@container ${
        isFullWidth || isCompact ? 'flex-1 w-full min-w-0' : 'shrink-0'
      } border-l border-slate-200 bg-slate-100 flex flex-col h-full overflow-hidden`}
    >
      {/* Top Bar do Preview: quebra em duas linhas em vez de cortar botões */}
      <div className="min-h-10 shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
          {showCode ? (
            <div className="flex items-center gap-1.5 font-medium text-slate-900">
              <FileCode className="w-3.5 h-3.5 text-brand-700 shrink-0" />
              <span>Código Typst</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 truncate">
              <Eye className="w-3.5 h-3.5 text-brand-700 shrink-0" />
              <span className="font-medium truncate">Prévia PDF</span>
              {isCompiling ? (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {isInitialized ? 'Compilando...' : 'WASM...'}
                </span>
              ) : (
                compileTimeMs !== null && (
                  <span className="text-xs text-slate-500 shrink-0 hidden sm:inline">
                    • {pages.length} pág ({compileTimeMs}ms)
                  </span>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1 min-w-0">
          {!showCode && (
            <>
              <button
                type="button"
                onClick={() => setNightPaper(!nightPaper)}
                aria-pressed={nightPaper}
                aria-label="Papel noturno"
                className={`touch-target flex items-center justify-center p-1.5 rounded-md border transition-colors ${
                  nightPaper
                    ? 'bg-slate-800 text-amber-300 border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={nightPaper ? 'Voltar para o papel claro' : 'Papel noturno (folha escura para ler à noite)'}
              >
                {nightPaper ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5" />
                )}
              </button>

              <div className="flex items-center gap-0.5" role="group" aria-label="Zoom da prévia">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(70, z - 15))}
                  disabled={zoom <= 70}
                  className="touch-target flex items-center justify-center p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded disabled:opacity-40"
                  title="Diminuir zoom"
                  aria-label="Diminuir zoom"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-slate-600 w-9 text-center" aria-live="polite">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(145, z + 15))}
                  disabled={zoom >= 145}
                  className="touch-target flex items-center justify-center p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded disabled:opacity-40"
                  title="Aumentar zoom"
                  aria-label="Aumentar zoom"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Botão de Alternar entre Ver PDF e Ver Código */}
          {onToggleCode && (
            <button
              type="button"
              onClick={onToggleCode}
              aria-label={showCode ? 'Ver PDF' : 'Ver Typst (código gerado)'}
              className={`touch-target flex items-center justify-center gap-1 rounded-md text-xs font-medium border transition-colors ${
                showCode
                  ? 'px-2 py-1 bg-brand-50 border-brand-300 text-brand-800 font-semibold'
                  : 'p-1.5 bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title={showCode ? 'Retornar para a visualização do PDF diagramado' : 'Ver o código Typst gerado'}
            >
              {showCode ? (
                <Eye className="w-3.5 h-3.5 text-brand-700" />
              ) : (
                <Code2 className="w-3.5 h-3.5 text-slate-500" />
              )}
              {/* No código, "Ver PDF" fica escrito: é o caminho de volta */}
              {showCode && <span>Ver PDF</span>}
            </button>
          )}

          {/* Baixar: só o ícone (ação principal da barra, em destaque). Com outros formatos,
              abre o menu com PDF, projeto completo e código Typst; sem eles, baixa o PDF direto. */}
          {onDownloadPdf && (
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={hasExtraExports ? () => setIsExportMenuOpen((open) => !open) : onDownloadPdf}
                disabled={!hasExtraExports && isExportingPdf}
                aria-label={hasExtraExports ? 'Baixar trabalho' : 'Baixar PDF'}
                aria-expanded={hasExtraExports ? isExportMenuOpen : undefined}
                aria-controls={hasExtraExports ? exportMenuId : undefined}
                title={hasExtraExports ? 'Baixar: PDF, Word (.docx), projeto completo ou código Typst' : 'Baixar o PDF'}
                className="touch-target flex items-center justify-center p-1.5 rounded-md border border-transparent bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white shadow-xs transition-colors"
              >
                {isExportingPdf || isExportingDocx || isExportingProject ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </button>

              {isExportMenuOpen && (
                <div
                  id={exportMenuId}
                  className="absolute right-0 top-full mt-1.5 w-64 z-40 rounded-xl border border-slate-200 bg-white shadow-xl py-1.5 text-sm animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsExportMenuOpen(false);
                      onDownloadPdf();
                    }}
                    disabled={isExportingPdf}
                    className="touch-target w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-brand-700" />
                    ) : (
                      <FileText className="w-4 h-4 mt-0.5 text-brand-700" />
                    )}
                    <span>
                      <span className="block font-medium text-slate-800">PDF (.pdf)</span>
                      <span className="block text-xs text-slate-500">Documento final nas normas, pronto para entregar</span>
                    </span>
                  </button>
                  {onDownloadDocx && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        onDownloadDocx();
                      }}
                      disabled={isExportingDocx}
                      className="touch-target w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60"
                    >
                      {isExportingDocx ? (
                        <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-brand-700" />
                      ) : (
                        <FileText className="w-4 h-4 mt-0.5 text-blue-700" />
                      )}
                      <span>
                        <span className="block font-medium text-slate-800">Baixar .docx (Word)</span>
                        <span className="block text-xs text-slate-500">
                          Documento editável nas medidas da norma para Word e LibreOffice
                        </span>
                      </span>
                    </button>
                  )}
                  {onExportProjectZip && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        onExportProjectZip();
                      }}
                      disabled={isExportingProject}
                      className="touch-target w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60"
                    >
                      {isExportingProject ? (
                        <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-brand-700" />
                      ) : (
                        <FolderArchive className="w-4 h-4 mt-0.5 text-brand-700" />
                      )}
                      <span>
                        <span className="block font-medium text-slate-800">Projeto completo (.zip)</span>
                        <span className="block text-xs text-slate-500">
                          Imagens, fontes e arquivos .typ para VS Code ou Typst CLI
                        </span>
                      </span>
                    </button>
                  )}
                  {onExportTypst && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsExportMenuOpen(false);
                        onExportTypst();
                      }}
                      className="touch-target w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <FileCode className="w-4 h-4 mt-0.5 text-slate-500" />
                      <span>
                        <span className="block font-medium text-slate-800">Código Typst (.typ)</span>
                        <span className="block text-xs text-slate-500">Arquivo único gerado pelo editor</span>
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <PaneWindowControls
            label="PDF"
            isMaximized={isMaximized}
            onMaximize={onMaximize}
            onRestore={onRestoreLayout}
            onMinimize={onMinimize}
            minimizeIcon={<PanelRightClose className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Painel de Diagnósticos / Erros */}
      {(diagnostics.length > 0 || runtimeError) && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800 space-y-1 shrink-0">
          <div className="flex items-center gap-1.5 font-semibold text-red-900">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>Atenção na compilação do documento</span>
          </div>
          {runtimeError && <p className="text-xs text-red-700">{runtimeError}</p>}
          {diagnostics.map((d, idx) => (
            <div key={idx} className="text-xs text-red-700">
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
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 text-xs text-brand-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <Terminal className="w-4 h-4 text-brand-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-brand-900">
                    Seu documento 100% aberto e sem dependência
                  </p>
                  <p className="text-xs text-brand-800 leading-snug">
                    O RedijaApp compila código Typst padrão. Você pode baixar o projeto completo com todas as imagens, modelo ABNT e BibTeX para editar no VS Code ou compilar via terminal.
                  </p>
                </div>
              </div>

              {onExportProjectZip && (
                <button
                  type="button"
                  onClick={onExportProjectZip}
                  disabled={isExportingProject}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-semibold text-xs shadow-xs shrink-0 transition-colors"
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
            <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCodeTab('main')}
                  className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-colors ${
                    codeTab === 'main'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  main.typ
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('abnt')}
                  className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-colors ${
                    codeTab === 'abnt'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {templateFileName} (Modelo)
                </button>
                <button
                  type="button"
                  onClick={() => setCodeTab('bibtex')}
                  className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-colors ${
                    codeTab === 'bibtex'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  referencias.bib
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                title="Copiar código do arquivo ativo"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-brand-700" />
                    <span className="text-brand-700 font-semibold">Copiado</span>
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
            <div className="w-full bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto shadow-xl leading-relaxed select-text border border-slate-800">
              <pre>{getCurrentCode()}</pre>
            </div>
          </div>
        ) : !isInitialized && isCompiling ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <Loader2 className="w-8 h-8 text-brand-700 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-700">
              Carregando motor tipográfico Typst WASM...
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
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
                  className={`bg-white rounded-sm shadow-md border border-slate-200 overflow-hidden transition-all ${
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
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <FileText className="w-3 h-3" aria-hidden="true" />
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
