/**
 * Modelos personalizados do usuário (pacotes do Typst Universe que ele adicionou com um
 * nome próprio). Ficam salvos neste navegador, separados por perfil (conta Google ou
 * perfil local), e aparecem em "Mais modelos" na Home.
 *
 * Hoje a persistência é local (localStorage). Para acompanhar o usuário entre
 * dispositivos, o mesmo formato pode ser sincronizado com o Google Drive.
 */
export interface CustomTemplate {
  id: string;
  /** Nome escolhido pelo usuário (ex.: "Artigo da revista X"). */
  name: string;
  /** Identificador completo do pacote (ex.: "@preview/charged-ieee:0.1.4"). */
  packageId: string;
  createdAt: string;
}

const KEY_PREFIX = 'redija:customTemplates:';
const cache = new Map<string, CustomTemplate[]>();
const listeners = new Set<() => void>();
const EMPTY: CustomTemplate[] = [];

function storageKey(owner: string): string {
  return `${KEY_PREFIX}${owner}`;
}

function isCustomTemplate(value: unknown): value is CustomTemplate {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.name === 'string' && typeof v.packageId === 'string';
}

function read(owner: string): CustomTemplate[] {
  const cached = cache.get(owner);
  if (cached) return cached;
  let list: CustomTemplate[] = EMPTY;
  try {
    const raw = localStorage.getItem(storageKey(owner));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) list = parsed.filter(isCustomTemplate);
  } catch {
    list = EMPTY;
  }
  cache.set(owner, list);
  return list;
}

function write(owner: string, list: CustomTemplate[]) {
  cache.set(owner, list);
  try {
    localStorage.setItem(storageKey(owner), JSON.stringify(list));
  } catch {
    // localStorage indisponível: o modelo vale só para esta sessão
  }
  for (const listener of listeners) listener();
}

export function subscribeCustomTemplates(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Lista estável (mesma referência até a próxima alteração), própria para useSyncExternalStore. */
export function getCustomTemplates(owner: string): CustomTemplate[] {
  return read(owner);
}

export function findCustomTemplateByPackage(owner: string, packageId: string): CustomTemplate | undefined {
  const target = packageId.toLowerCase();
  return read(owner).find((t) => t.packageId.toLowerCase() === target);
}

export function addCustomTemplate(owner: string, input: { name: string; packageId: string }): CustomTemplate {
  const template: CustomTemplate = {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `tpl-${Date.now()}`,
    name: input.name.trim(),
    packageId: input.packageId,
    createdAt: new Date().toISOString(),
  };
  write(owner, [...read(owner), template]);
  return template;
}

export function removeCustomTemplate(owner: string, id: string): CustomTemplate | undefined {
  const list = read(owner);
  const removed = list.find((t) => t.id === id);
  if (removed) write(owner, list.filter((t) => t.id !== id));
  return removed;
}

/** Desfaz uma remoção, devolvendo o modelo à mesma posição relativa (por data de criação). */
export function restoreCustomTemplate(owner: string, template: CustomTemplate) {
  const list = read(owner).filter((t) => t.id !== template.id);
  write(
    owner,
    [...list, template].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );
}
