import React, { useEffect, useReducer, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import {
  dismissToast,
  getToasts,
  MODAL_CHANGE_EVENT,
  subscribeToasts,
  type ToastKind,
} from './toastStore';

const KIND_STYLES: Record<ToastKind, string> = {
  error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
  success:
    'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100',
  info: 'border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
};

const KIND_ICONS: Record<ToastKind, React.ReactNode> = {
  error: <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />,
  success: <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-brand-700 dark:text-brand-400" />,
  info: <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-500 dark:text-slate-400" />,
};

/**
 * Exibe as notificações do toastStore. Quando há um modal (<dialog>) aberto, as
 * notificações são renderizadas dentro dele: o resto da página fica inerte e
 * invisível para leitores de tela enquanto o modal está aberto.
 */
export const Toaster: React.FC = () => {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  // Re-renderiza quando um modal abre/fecha, para não deixar notificações presas
  // dentro de um diálogo que acabou de ser fechado.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    window.addEventListener(MODAL_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(MODAL_CHANGE_EVENT, refresh);
  }, []);
  if (typeof document === 'undefined') return null;

  const openDialogs = document.querySelectorAll('dialog[open]');
  const container = (openDialogs[openDialogs.length - 1] as HTMLElement | undefined) ?? document.body;

  return createPortal(
    <div
      role="region"
      aria-label="Notificações"
      className="fixed z-[60] bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 flex flex-col items-stretch sm:items-end gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto w-full sm:w-96 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${KIND_STYLES[t.kind]}`}
        >
          {KIND_ICONS[t.kind]}
          <p className="flex-1 leading-relaxed whitespace-pre-line select-text">{t.message}</p>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action?.onClick();
                dismissToast(t.id);
              }}
              className="touch-target -my-1 px-2 py-1 rounded-md text-sm font-semibold text-brand-800 dark:text-brand-300 hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="touch-target -m-1 p-1 rounded-md opacity-70 hover:opacity-100 flex items-center justify-center"
            aria-label="Fechar notificação"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>,
    container,
  );
};
