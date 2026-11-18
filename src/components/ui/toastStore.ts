export type ToastKind = 'error' | 'success' | 'info';

/** Disparado quando um modal abre ou fecha: o Toaster reposiciona as notificações. */
export const MODAL_CHANGE_EVENT = 'redija:modalchange';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}

export interface ToastOptions {
  durationMs?: number;
  /** Botão de ação na notificação (ex.: "Desfazer"). */
  action?: ToastAction;
}

const DEFAULT_DURATION_MS: Record<ToastKind, number> = {
  error: 9000,
  success: 4000,
  info: 5000,
};

/** Notificações com ação ficam mais tempo na tela para dar chance de reagir. */
const ACTION_DURATION_MS = 8000;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): ToastItem[] {
  return toasts;
}

export function dismissToast(id: number) {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function pushToast(kind: ToastKind, message: string, options?: number | ToastOptions): number {
  const opts: ToastOptions = typeof options === 'number' ? { durationMs: options } : (options ?? {});
  const id = nextId++;
  // Evita empilhar a mesma mensagem repetida
  toasts = [
    ...toasts.filter((t) => t.message !== message),
    { id, kind, message, action: opts.action },
  ].slice(-4);
  const duration =
    opts.durationMs ?? (opts.action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS[kind]);
  timers.set(
    id,
    setTimeout(() => dismissToast(id), duration),
  );
  emit();
  return id;
}

/**
 * Notificações não bloqueantes (substituem alert()). Podem ser chamadas fora
 * de componentes React, por exemplo em hooks e serviços.
 */
export const toast = {
  error: (message: string, options?: number | ToastOptions) => pushToast('error', message, options),
  success: (message: string, options?: number | ToastOptions) =>
    pushToast('success', message, options),
  info: (message: string, options?: number | ToastOptions) => pushToast('info', message, options),
};
