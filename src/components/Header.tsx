import React from 'react';
import { FileText, Download, Code2, Sparkles, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  projectName: string;
  onExportTypst: () => void;
  onCopyTypst: () => void;
  showCode: boolean;
  setShowCode: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  onExportTypst,
  onCopyTypst,
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

        <span className="text-sm font-medium text-neutral-600 max-w-xs truncate">
          {projectName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 mr-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Salvo localmente</span>
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
          onClick={onCopyTypst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Copiar Código</span>
        </button>

        <button
          onClick={onExportTypst}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar .typ</span>
        </button>
      </div>
    </header>
  );
};
