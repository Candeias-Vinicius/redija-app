export type ToastKind = 'error' | 'success' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const DEFAULT_DURATION_MS: Record<ToastKind, number> = {
  error: 9000,
  success: 4000,
  info: 5000,
};

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

function pushToast(kind: ToastKind, message: string, durationMs?: number): number {
  const id = nextId++;
  // Evita empilhar a mesma mensagem repetida
  toasts = [...toasts.filter((t) => t.message !== message), { id, kind, message }].slice(-4);
  timers.set(
    id,
    setTimeout(() => dismissToast(id), durationMs ?? DEFAULT_DURATION_MS[kind]),
  );
  emit();
  return id;
}

/**
 * Notificações não bloqueantes (substituem alert()). Podem ser chamadas fora
 * de componentes React, por exemplo em hooks e serviços.
 */
export const toast = {
  error: (message: string, durationMs?: number) => pushToast('error', message, durationMs),
  success: (message: string, durationMs?: number) => pushToast('success', message, durationMs),
  info: (message: string, durationMs?: number) => pushToast('info', message, durationMs),
};
