import React from 'react';
import {
  Download,
  Code2,
  FileDown,
  CheckCircle2,
  Loader2,
  FolderOpen,
  ChevronDown,
  HelpCircle,
  Sliders,
  Moon,
  Sun,
  Undo2,
  Redo2,
  Bug,
  PanelLeft,
  FileEdit,
  Eye,
} from 'lucide-react';

interface HeaderProps {
  projectName: string;
  projectsCount: number;
  saveStatus: 'saved' | 'saving';
  darkMode: boolean;
  onToggleDarkMode: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showSidebar: boolean;
  showEditor: boolean;
  showPreview: boolean;
  onToggleSidebar: () => void;
  onToggleEditor: () => void;
  onTogglePreview: () => void;
  onOpenProjectsModal: () => void;
  onOpenTemplateCustomizer: () => void;
  onOpenBugReportModal: () => void;
  onOpenWelcomeModal: () => void;
  onDownloadPdf: () => void;
  isExportingPdf: boolean;
  onExportTypst: () => void;
  showCode: boolean;
  setShowCode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  projectsCount,
  saveStatus,
  darkMode,
  onToggleDarkMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showSidebar,
  showEditor,
  showPreview,
  onToggleSidebar,
  onToggleEditor,
  onTogglePreview,
  onOpenProjectsModal,
  onOpenTemplateCustomizer,
  onOpenBugReportModal,
  onOpenWelcomeModal,
  onDownloadPdf,
  isExportingPdf,
  onExportTypst,
  showCode,
  setShowCode,
}) => {
  return (
    <header className="h-14 border-b border-neutral-200 bg-white px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            R
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-900 tracking-tight">Redija</span>
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded uppercase tracking-wide">
                ABNT
              </span>
            </div>
          </div>
        </div>

        <span className="text-neutral-300">/</span>

        <button
          onClick={onOpenProjectsModal}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-neutral-100 text-sm font-medium text-neutral-700 transition-colors"
          title="Alternar ou criar trabalho acadêmico"
        >
          <FolderOpen className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="max-w-xs truncate">{projectName}</span>
          <span className="text-[10px] bg-neutral-200/80 text-neutral-600 px-1.5 py-0.2 rounded-full">
            {projectsCount}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
        </button>

        {/* Botões Desfazer / Refazer (Ctrl+Z / Ctrl+Y) */}
        <div className="flex items-center gap-0.5 ml-1 pl-2 border-l border-neutral-200">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Desfazer alteração no documento (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Refazer alteração no documento (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Alternadores de Abas Visíveis (Minimizar / Restaurar qualquer aba) */}
        <div className="hidden lg:flex items-center gap-1 ml-1 pl-2 border-l border-neutral-200">
          <button
            type="button"
            onClick={onToggleSidebar}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showSidebar
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700'
            }`}
            title={showSidebar ? 'Minimizar aba Estrutura & Referências' : 'Mostrar aba Estrutura & Referências'}
          >
            <PanelLeft className="w-3.5 h-3.5" />
            <span>Estrutura</span>
          </button>

          <button
            type="button"
            onClick={onToggleEditor}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showEditor
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700'
            }`}
            title={showEditor ? 'Minimizar aba Texto' : 'Mostrar aba Texto'}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span>Texto</span>
          </button>

          <button
            type="button"
            onClick={onTogglePreview}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              showPreview
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                : 'bg-white border-neutral-200 text-neutral-400 hover:text-neutral-700'
            }`}
            title={showPreview ? 'Minimizar aba PDF' : 'Mostrar aba PDF'}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 mr-2">
          {saveStatus === 'saving' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Salvo no navegador</span>
            </>
          )}
        </div>

        <button
          onClick={onToggleDarkMode}
          className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
          title={
            darkMode
              ? 'Alternar para Modo Claro (Diurno)'
              : 'Alternar para Modo Escuro Ergonômico (Noturno)'
          }
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={onOpenWelcomeModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
          title="Documentação das Normas ABNT atendidas e guia rápido"
        >
          <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden xl:inline">Normas ABNT</span>
        </button>

        <button
          onClick={onOpenBugReportModal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800 transition-colors"
          title="Relatar um problema técnico, erro de formatação ou enviar sugestão"
        >
          <Bug className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden md:inline">Relatar Problema</span>
        </button>

        <button
          onClick={onOpenTemplateCustomizer}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/70 transition-colors"
          title="Personalizar norma (ABNT, APA, Artigo 2 colunas), fonte, margens e brasão da universidade"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-600" />
          <span>Norma & Layout</span>
        </button>

        <button
          onClick={() => setShowCode(!showCode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
            showCode
              ? 'bg-neutral-900 text-white border-neutral-900'
              : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
          }`}
          title="Ver o código Typst gerado por baixo dos panos"
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{showCode ? 'Ocultar Typst' : 'Ver Typst'}</span>
        </button>

        <button
          onClick={onExportTypst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
          title="Baixar arquivo-fonte .typ"
        >
          <FileDown className="w-3.5 h-3.5 text-neutral-500" />
          <span>Exportar .typ</span>
        </button>

        <button
          onClick={onDownloadPdf}
          disabled={isExportingPdf}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-sm transition-colors"
          title="Compilar e baixar o PDF final nas normas da ABNT"
        >
          {isExportingPdf ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Gerando PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Baixar PDF</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
