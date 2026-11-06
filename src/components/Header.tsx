import React from 'react';
import {
  Download,
  Code2,
  FileDown,
  CheckCircle2,
  Loader2,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';

interface HeaderProps {
  projectName: string;
  projectsCount: number;
  saveStatus: 'saved' | 'saving';
  onOpenProjectsModal: () => void;
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
  onOpenProjectsModal,
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
