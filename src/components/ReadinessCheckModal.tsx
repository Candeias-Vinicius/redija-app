import React, { useEffect, useRef } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Info,
  Loader2,
  PauseCircle,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ChecklistItem,
  ChecklistNavigationTarget,
  ReadinessReport,
} from '@/core/transpiler/readiness';

interface ReadinessCheckModalProps {
  isOpen: boolean;
  projectName: string;
  report: ReadinessReport;
  isExportingPdf?: boolean;
  onClose: () => void;
  onDownloadPdf: () => void;
  onNavigateToTarget: (target: ChecklistNavigationTarget) => void;
}

/**
 * Tela cheia "Verificar antes de entregar" (RDJ-05.4):
 * - Exibe a nota (0–100) com ícone, cor e rótulo acessível;
 * - Agrupa todos os itens em Estrutura, Conteúdo, Citações e referências, e Formatação;
 * - Clicar em uma pendência fecha a tela e rola até o bloco/campo relacionado destacando-o;
 * - Navegável inteiramente por teclado (`Esc` fecha e restaura o foco);
 * - Orientativa: nunca bloqueia a exportação do PDF.
 */
export const ReadinessCheckModal: React.FC<ReadinessCheckModalProps> = ({
  isOpen,
  projectName,
  report,
  isExportingPdf = false,
  onClose,
  onDownloadPdf,
  onNavigateToTarget,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { scoreResult, groups, pendingCount, isReadyToDeliver } = report;

  const scoreTone = scoreResult.isPaused
    ? {
        panel: 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100',
        pill: 'bg-slate-600 text-white',
        icon: <PauseCircle className="w-6 h-6 text-slate-500 shrink-0" aria-hidden="true" />,
      }
    : scoreResult.band === 'ready'
      ? {
          panel: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100',
          pill: 'bg-emerald-700 text-white',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />,
        }
      : scoreResult.band === 'attention'
        ? {
            panel: 'border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100',
            pill: 'bg-amber-600 text-white',
            icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />,
          }
        : {
            panel: 'border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-950/40 text-red-950 dark:text-red-100',
            pill: 'bg-red-700 text-white',
            icon: <AlertCircle className="w-6 h-6 text-red-700 dark:text-red-400 shrink-0" aria-hidden="true" />,
          };

  const handleItemClick = (item: ChecklistItem) => {
    if (!item.target) return;
    onClose();
    onNavigateToTarget(item.target);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="readiness-modal-title"
      className="fixed inset-0 z-50 flex flex-col bg-surface-muted text-fg animate-in fade-in duration-150"
    >
      {/* Cabeçalho fixo */}
      <header className="shrink-0 border-b border-line bg-surface px-4 sm:px-6 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400 shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 id="readiness-modal-title" className="text-base sm:text-lg font-bold text-fg truncate">
                Verificar antes de entregar
              </h1>
              <p className="text-xs text-fg-muted truncate">{projectName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownloadPdf}
              disabled={isExportingPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 disabled:opacity-60 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Baixar PDF</span>
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Fechar verificação"
              className="touch-target inline-flex items-center justify-center rounded-lg border border-line bg-surface p-2 text-slate-600 dark:text-slate-300 hover:bg-surface-sunken"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo rolável */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Resumo da nota */}
          <section className={`rounded-2xl border p-5 sm:p-6 ${scoreTone.panel}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                {scoreTone.icon}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">
                      {scoreResult.isPaused ? 'Verificação pausada' : scoreResult.label}
                    </h2>
                    {!scoreResult.isPaused && scoreResult.score !== null && (
                      <span className={`rounded-lg px-2.5 py-0.5 font-mono text-sm font-bold ${scoreTone.pill}`}>
                        {scoreResult.score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-sm opacity-90">
                    {scoreResult.isPaused
                      ? 'A verificação estrita da ABNT está pausada porque o modelo foi personalizado. Você ainda pode revisar a integridade abaixo e exportar normalmente.'
                      : isReadyToDeliver
                        ? 'Parabéns! Nenhuma pendência encontrada. Seu trabalho está pronto para entregar.'
                        : `${pendingCount} ${pendingCount === 1 ? 'pendência encontrada' : 'pendências encontradas'}. Clique em qualquer item para ir direto ao ponto de correção.`}
                  </p>
                </div>
              </div>

              {isReadyToDeliver && (
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  disabled={isExportingPdf}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Baixar PDF agora</span>
                </button>
              )}
            </div>

            {!scoreResult.isPaused && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs opacity-90">
                <span>
                  Estruturais ausentes: <strong>{scoreResult.counts.missingStructural}</strong> (−15 pts cada)
                </span>
                <span>·</span>
                <span>
                  Avisos: <strong>{scoreResult.counts.warnings}</strong> (−5 pts cada)
                </span>
                <span>·</span>
                <span>
                  Informações: <strong>{scoreResult.counts.infos}</strong> (−1 pt cada)
                </span>
              </div>
            )}
          </section>

          {/* 4 grupos com contadores */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {groups.map((group) => (
              <section
                key={group.id}
                aria-labelledby={`readiness-group-${group.id}`}
                className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
                  <h2 id={`readiness-group-${group.id}`} className="text-sm font-bold text-fg">
                    {group.label}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs">
                    {group.pendingCount > 0 ? (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 font-semibold text-amber-900 dark:text-amber-300">
                        {group.pendingCount} {group.pendingCount === 1 ? 'pendência' : 'pendências'}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 font-semibold text-emerald-800 dark:text-emerald-300">
                        Tudo ok ({group.okCount})
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-2">
                  {group.items.map((item) => {
                    const isClickable = item.status === 'pending' && Boolean(item.target);
                    const icon =
                      item.status === 'ok' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : item.status === 'reminder' ? (
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : item.impact === 'structural' ? (
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : item.impact === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
                      );

                    const cardClasses =
                      item.status === 'ok'
                        ? 'border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : item.status === 'reminder'
                          ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20'
                          : item.impact === 'structural'
                            ? 'border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 hover:border-red-400'
                            : item.impact === 'warning'
                              ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400'
                              : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-400';

                    const content = (
                      <div className="flex items-start gap-2.5 w-full text-left">
                        {icon}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-semibold text-fg">
                              {item.title}
                            </span>
                            {item.status === 'pending' && item.impact !== 'none' && (
                              <span className="font-mono text-[11px] font-semibold text-fg-muted">
                                {item.impact === 'structural'
                                  ? '−15 pts'
                                  : item.impact === 'warning'
                                    ? '−5 pts'
                                    : '−1 pt'}
                              </span>
                            )}
                            {item.status === 'reminder' && (
                              <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                                Lembrete
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-fg-muted leading-snug">{item.description}</p>
                          {item.externalUrl && (
                            <a
                              href={item.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-brand-700 dark:text-brand-400 hover:underline"
                            >
                              Abrir gerador da biblioteca
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        {isClickable && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-400 shrink-0 self-center">
                            <span>Corrigir</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    );

                    return (
                      <li key={item.id}>
                        {isClickable ? (
                          <button
                            type="button"
                            onClick={() => handleItemClick(item)}
                            className={`w-full rounded-xl border p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${cardClasses}`}
                          >
                            {content}
                          </button>
                        ) : (
                          <div className={`rounded-xl border p-3 ${cardClasses}`}>{content}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <p className="text-center text-xs text-fg-muted">
            Esta verificação é orientativa e nunca bloqueia a exportação do seu trabalho. Pressione{' '}
            <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px]">
              Esc
            </kbd>{' '}
            para voltar ao editor.
          </p>
        </div>
      </div>
    </div>
  );
};
