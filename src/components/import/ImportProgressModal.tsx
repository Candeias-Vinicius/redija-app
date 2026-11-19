import React from 'react';
import { FileUp } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { describeImportProgress, type ImportState } from './importProgress';

const PANEL =
  'w-full max-w-md rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden';
const SECONDARY =
  'touch-target inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-line text-slate-700 dark:text-slate-200 hover:bg-surface-sunken disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium transition-colors';

interface ImportProgressModalProps {
  state: ImportState;
  onCancel: () => void;
}

/**
 * Tela de carregamento de qualquer importação (.zip, .docx, .tex, .typ, .md, .redija, .json).
 * Bloqueia a página enquanto o arquivo é processado (o <dialog> modal deixa o resto inerte),
 * mostra a etapa atual com porcentagem quando houver e permite cancelar. Esc também cancela.
 * Renderize só enquanto houver importação em andamento.
 */
export const ImportProgressModal: React.FC<ImportProgressModalProps> = ({ state, onCancel }) => {
  const view = describeImportProgress(state.progress);
  const cancelIfAllowed = () => {
    if (view.cancellable) onCancel();
  };

  return (
    <Modal onClose={cancelIfAllowed} labelledBy="import-progress-title">
      <div className={PANEL} aria-busy="true">
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <span
              className="shrink-0 rounded-full bg-brand-50 dark:bg-brand-950 p-2"
              aria-hidden="true"
            >
              <FileUp className="w-5 h-5 text-brand-700 dark:text-brand-400" />
            </span>
            <div className="min-w-0">
              <h2 id="import-progress-title" className="text-base font-semibold text-fg">
                Importando arquivo
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted truncate" title={state.fileName}>
                {state.fileName}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              {/* Só a etapa é anunciada: anunciar cada 1% seria ruído para leitores de tela */}
              <span role="status" className="font-medium text-fg">
                {view.label}
              </span>
              {view.percent !== null && (
                <span className="tabular-nums text-fg-muted" aria-hidden="true">
                  {view.percent}%
                </span>
              )}
            </div>
            <div
              role="progressbar"
              aria-label={view.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={view.percent ?? undefined}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
            >
              {view.percent !== null ? (
                <div
                  className="h-full rounded-full bg-brand-700 transition-[width] duration-300 ease-out"
                  style={{ width: `${view.percent}%` }}
                />
              ) : (
                <div className="h-full w-2/5 rounded-full bg-brand-700 animate-indeterminate" />
              )}
            </div>
            {view.detail && (
              <p className="mt-1.5 text-xs tabular-nums text-fg-muted">{view.detail}</p>
            )}
          </div>

          {view.hint && <p className="mt-4 text-xs leading-relaxed text-fg-muted">{view.hint}</p>}
        </div>

        <div className="flex justify-end border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={!view.cancellable}
            className={SECONDARY}
          >
            Cancelar importação
          </button>
        </div>
      </div>
    </Modal>
  );
};
