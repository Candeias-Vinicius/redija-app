import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Info,
  PauseCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  ContextualGuideMode,
  TemplateCapabilities,
} from '@/core/templates/templateCapabilities';
import { DocumentLintReport, LinterWarning } from '@/core/transpiler/linters';
import { ComplianceScoreResult, ReadinessReport } from '@/core/transpiler/readiness';

interface SidebarLinterSectionProps {
  capabilities: TemplateCapabilities;
  lintReport: DocumentLintReport;
  readinessReport?: ReadinessReport;
  onOpenGuide?: (mode: ContextualGuideMode) => void;
  onOpenReadinessCheck?: () => void;
}

const renderWarningCard = (w: LinterWarning) => (
  <div
    key={w.id}
    className={`p-2 rounded-md border text-xs space-y-0.5 ${
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
    <p className="text-xs opacity-85 leading-snug pl-5">{w.description}</p>
  </div>
);

function renderScoreBanner(scoreResult: ComplianceScoreResult) {
  if (scoreResult.isPaused || scoreResult.score === null) {
    return (
      <div
        role="status"
        className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700"
      >
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <PauseCircle className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
          <span>{scoreResult.label}</span>
        </span>
      </div>
    );
  }

  const styles =
    scoreResult.band === 'ready'
      ? {
          box: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
          badge: 'bg-emerald-700 text-white',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />,
        }
      : scoreResult.band === 'attention'
        ? {
            box: 'border-amber-200 bg-amber-50/80 text-amber-950',
            badge: 'bg-amber-600 text-white',
            icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />,
          }
        : {
            box: 'border-red-200 bg-red-50/80 text-red-950',
            badge: 'bg-red-700 text-white',
            icon: <AlertCircle className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />,
          };

  return (
    <div
      role="status"
      aria-label={`Nota de conformidade ${scoreResult.score} de 100 — ${scoreResult.label}`}
      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs ${styles.box}`}
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        {styles.icon}
        <span>{scoreResult.label}</span>
      </span>
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs font-bold ${styles.badge}`}>
        {scoreResult.score}/100
      </span>
    </div>
  );
}

export const SidebarLinterSection: React.FC<SidebarLinterSectionProps> = ({
  capabilities,
  lintReport,
  readinessReport,
  onOpenGuide,
  onOpenReadinessCheck,
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
      : 'text-slate-500'
    : activeWarnings.length === 0
      ? 'text-brand-700'
      : hasWarningSeverity
        ? 'text-amber-500'
        : 'text-blue-500';

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 py-1.5 hover:text-slate-900"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${iconColorClass}`} />
          <span className="truncate">{renderSectionTitle()}</span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {readinessReport && !readinessReport.scoreResult.isPaused && readinessReport.scoreResult.score !== null && (
            <span className="font-mono text-[11px] font-bold text-slate-600">
              {readinessReport.scoreResult.score}
            </span>
          )}
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 pl-2">
          {readinessReport && renderScoreBanner(readinessReport.scoreResult)}

          {onOpenReadinessCheck && (
            <button
              type="button"
              onClick={onOpenReadinessCheck}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-700 hover:bg-brand-800 text-white transition-colors shadow-2xs"
            >
              <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Verificar antes de entregar</span>
            </button>
          )}

          {lintReport.isPausedAbnt ? (
            <>
              <div className="p-2.5 rounded-md bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Modo {capabilities.badgeLabel} ativo</span>
                </div>
                <p className="text-xs opacity-85 leading-snug pl-5">
                  A verificação estrita da ABNT foi pausada porque este documento utiliza formatação
                  ou campos personalizados. Checagens básicas de integridade seguem ativas abaixo.
                </p>
              </div>
              {lintReport.sanityWarnings.map(renderWarningCard)}
            </>
          ) : lintReport.warnings.length === 0 ? (
            <div className="p-2.5 rounded-md bg-brand-50 border border-brand-200 text-xs text-brand-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-700 shrink-0" />
              <span>{getSuccessMessage()}</span>
            </div>
          ) : (
            lintReport.warnings.map(renderWarningCard)
          )}

          {onOpenGuide && (
            <button
              type="button"
              onClick={() => onOpenGuide(capabilities.guideMode)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-brand-800 dark:hover:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              title={`Consultar ${capabilities.guideLabel}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-brand-700 dark:text-brand-400 shrink-0" />
              <span>{capabilities.guideLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
