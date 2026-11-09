import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import {
  ContextualGuideMode,
  TemplateCapabilities,
} from '@/core/templates/templateCapabilities';
import { DocumentLintReport, LinterWarning } from '@/core/transpiler/linters';

interface SidebarLinterSectionProps {
  capabilities: TemplateCapabilities;
  lintReport: DocumentLintReport;
  onOpenGuide?: (mode: ContextualGuideMode) => void;
}

const renderWarningCard = (w: LinterWarning) => (
  <div
    key={w.id}
    className={`p-2 rounded-md border text-[11px] space-y-0.5 ${
      w.severity === 'warning'
        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
        : 'bg-blue-50/60 border-blue-200 text-blue-900'
    }`}
  >
    <div className="font-semibold flex items-center gap-1.5">
      {w.severity === 'warning' ? (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      ) : (
        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      )}
      <span>{w.title}</span>
    </div>
    <p className="text-[10px] opacity-85 leading-snug pl-5">{w.description}</p>
  </div>
);

export const SidebarLinterSection: React.FC<SidebarLinterSectionProps> = ({
  capabilities,
  lintReport,
  onOpenGuide,
}) => {
  const [open, setOpen] = useState(true);

  const activeWarnings = lintReport.isPausedAbnt
    ? lintReport.sanityWarnings
    : lintReport.warnings;
  const hasWarningSeverity = activeWarnings.some((w) => w.severity === 'warning');

  const renderSectionTitle = () => {
    if (lintReport.isPausedAbnt) {
      return 'Verificador ABNT (Pausado)';
    }
    return `${lintReport.title} (${lintReport.warnings.length})`;
  };

  const getSuccessMessage = () => {
    switch (lintReport.kind) {
      case 'abnt':
        return 'Tudo em conformidade com as regras verificadas da ABNT!';
      case 'ieee':
        return 'Estrutura alinhada às diretrizes do padrão IEEE Conference!';
      case 'sbc':
        return 'Estrutura em conformidade com as recomendações da SBC!';
      case 'poster':
        return 'Estrutura adequada para apresentação em Pôster Científico!';
      default:
        return 'Integridade do documento verificada: nenhum alerta crítico!';
    }
  };

  const iconColorClass = lintReport.isPausedAbnt
    ? hasWarningSeverity
      ? 'text-amber-500'
      : 'text-neutral-400'
    : activeWarnings.length === 0
      ? 'text-emerald-600'
      : hasWarningSeverity
        ? 'text-amber-500'
        : 'text-blue-500';

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck className={`w-3.5 h-3.5 ${iconColorClass}`} />
          <span>{renderSectionTitle()}</span>
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 pl-2">
          {lintReport.isPausedAbnt ? (
            <>
              <div className="p-2.5 rounded-md bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Modo {capabilities.badgeLabel} ativo</span>
                </div>
                <p className="text-[10px] opacity-85 leading-snug pl-5">
                  A verificação estrita da ABNT foi pausada porque este documento utiliza formatação
                  ou campos personalizados. Checagens básicas de integridade seguem ativas abaixo.
                </p>
              </div>
              {lintReport.sanityWarnings.map(renderWarningCard)}
            </>
          ) : lintReport.warnings.length === 0 ? (
            <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{getSuccessMessage()}</span>
            </div>
          ) : (
            lintReport.warnings.map(renderWarningCard)
          )}

          {onOpenGuide && (
            <button
              type="button"
              onClick={() => onOpenGuide(capabilities.guideMode)}
              className="w-full mt-2.5 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors shadow-2xs"
              title={`Consultar ${capabilities.guideLabel}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{capabilities.guideLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
