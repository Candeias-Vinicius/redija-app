/**
 * Modelos personalizados do usuário (pacotes do Typst Universe que ele adicionou com um
 * nome próprio). Aparecem em "Mais modelos" na Home, separados por perfil: conta Google
 * (`owner` = e-mail) ou perfil local (`owner` = `'local'`).
 *
 * Persistência: tabela `customTemplates` do IndexedDB (Dexie), com um cache em memória para a
 * leitura síncrona exigida pelo `useSyncExternalStore`. Remoções viram marca de exclusão
 * (`deletedAt`) para a sincronização com o Google Drive não "ressuscitar" o modelo em outro
 * aparelho (veja `customTemplatesSync.ts`). O perfil local nunca sai deste navegador.
 */
import { db, type StoredCustomTemplate } from './db';
import {
  compareCustomTemplates,
  isSameCustomTemplate,
  normalizeCustomTemplate,
  pickNewerCustomTemplate,
  type SyncedCustomTemplate,
} from './customTemplatesMerge';

export type CustomTemplate = SyncedCustomTemplate;

export const LOCAL_TEMPLATES_OWNER = 'local';

/** Só contas Google sincronizam com o Drive; o perfil local fica neste navegador. */
export function isSyncableTemplatesOwner(owner: string | null | undefined): owner is string {
  return typeof owner === 'string' && owner !== LOCAL_TEMPLATES_OWNER && owner.includes('@');
}

/** Prefixo das chaves antigas no localStorage (`redija:customTemplates:<owner>`). */
export const LEGACY_STORAGE_PREFIX = 'redija:customTemplates:';

const EMPTY: CustomTemplate[] = [];
const CHANNEL_NAME = 'redija:customTemplates';

/** Todos os registros (inclusive removidos), por dono e por id. */
const records = new Map<string, Map<string, CustomTemplate>>();
/** Lista visível por dono: mesma referência até a próxima alteração daquele dono. */
const visibleCache = new Map<string, CustomTemplate[]>();
const listeners = new Set<() => void>();
const mutationListeners = new Set<(owner: string) => void>();

let hydration: Promise<void> | null = null;
let persistQueue: Promise<void> = Promise.resolve();
let channel: BroadcastChannel | null = null;

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Garante um `updatedAt` estritamente maior que o anterior, mesmo com o relógio parado. */
function nextTimestamp(previous?: string): string {
  const now = Date.now();
  const prev = previous ? Date.parse(previous) : NaN;
  return new Date(Number.isNaN(prev) || now > prev ? now : prev + 1).toISOString();
}

function ownerRecords(owner: string): Map<string, CustomTemplate> {
  let map = records.get(owner);
  if (!map) {
    map = new Map();
    records.set(owner, map);
  }
  return map;
}

function notify() {
  for (const listener of listeners) listener();
}

function toStored(owner: string, template: CustomTemplate): StoredCustomTemplate {
  return { ...template, ownerEmail: owner };
}

function fromStored(row: StoredCustomTemplate): { owner: string; template: CustomTemplate } | null {
  if (!row || typeof row.ownerEmail !== 'string' || !row.ownerEmail) return null;
  const template = normalizeCustomTemplate(row);
  return template ? { owner: row.ownerEmail, template } : null;
}

/**
 * Aplica registros vindos de fora da memória (IndexedDB, outra aba ou Drive) sem desfazer
 * alterações mais novas feitas aqui. Retorna os registros que realmente mudaram.
 */
function absorb(owner: string, incoming: CustomTemplate[]): CustomTemplate[] {
  const map = ownerRecords(owner);
  const changed: CustomTemplate[] = [];
  for (const item of incoming) {
    const current = map.get(item.id);
    const winner = current ? pickNewerCustomTemplate(current, item) : item;
    if (!current || !isSameCustomTemplate(current, winner)) {
      map.set(item.id, winner);
      changed.push(winner);
    }
  }
  if (changed.length > 0) visibleCache.delete(owner);
  return changed;
}

// ---------------------------------------------------------------------
// Persistência (IndexedDB) e avisos entre abas
// ---------------------------------------------------------------------

function getChannel(): BroadcastChannel | null {
  if (channel || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return channel;
  }
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<{ owner?: unknown }>) => {
      const owner = event.data?.owner;
      if (typeof owner === 'string') void reloadOwnerFromDb(owner);
    };
  } catch {
    channel = null;
  }
  return channel;
}

/**
 * Grava no IndexedDB sem sobrescrever uma versão mais nova (gravada, por exemplo, por outra aba).
 * Falhas não interrompem o app: o modelo continua valendo nesta sessão.
 */
function persist(owner: string, changed: CustomTemplate[]): Promise<void> {
  if (changed.length === 0) return persistQueue;
  persistQueue = persistQueue
    .then(() => loadCustomTemplates())
    .then(() =>
      db.transaction('rw', db.customTemplates, async () => {
        for (const item of changed) {
          const existing = await db.customTemplates.get(item.id);
          const parsed = existing ? fromStored(existing) : null;
          if (parsed && parsed.owner !== owner) continue; // id de outro perfil: nunca mistura
          const winner = parsed ? pickNewerCustomTemplate(parsed.template, item) : item;
          if (!parsed || !isSameCustomTemplate(parsed.template, winner)) {
            await db.customTemplates.put(toStored(owner, winner));
          }
        }
      }),
    )
    .then(() => {
      getChannel()?.postMessage({ owner });
    })
    .catch((err) => {
      console.warn('Não foi possível salvar os modelos personalizados neste navegador:', err);
    });
  return persistQueue;
}

async function reloadOwnerFromDb(owner: string): Promise<void> {
  try {
    const rows = await db.customTemplates.where('ownerEmail').equals(owner).toArray();
    const incoming = rows.map(fromStored).flatMap((r) => (r ? [r.template] : []));
    if (absorb(owner, incoming).length > 0) notify();
  } catch (err) {
    console.warn('Não foi possível recarregar os modelos personalizados:', err);
  }
}

// ---------------------------------------------------------------------
// Migração do formato antigo (localStorage) e hidratação
// ---------------------------------------------------------------------

interface LegacyEntry {
  key: string;
  owner: string;
  items: CustomTemplate[];
}

function readLegacyEntries(): LegacyEntry[] {
  const entries: LegacyEntry[] = [];
  try {
    if (typeof localStorage === 'undefined') return entries;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LEGACY_STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) {
      const owner = key.slice(LEGACY_STORAGE_PREFIX.length);
      if (!owner) continue;
      let parsed: unknown = [];
      try {
        parsed = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {
        parsed = [];
      }
      const items = Array.isArray(parsed)
        ? parsed.flatMap((raw) => {
            const item = normalizeCustomTemplate(raw);
            return item ? [item] : [];
          })
        : [];
      entries.push({ key, owner, items });
    }
  } catch {
    // localStorage indisponível: não há o que migrar
  }
  return entries;
}

/**
 * Move os modelos salvos no `localStorage` (formato anterior) para o IndexedDB e apaga as
 * chaves antigas. Só apaga depois de gravar; se a gravação falhar, tenta de novo na próxima
 * abertura do app. Retorna quantos modelos foram migrados.
 */
export async function migrateLegacyCustomTemplates(): Promise<number> {
  const entries = readLegacyEntries();
  if (entries.length === 0) return 0;

  let migrated = 0;
  await db.transaction('rw', db.customTemplates, async () => {
    for (const entry of entries) {
      for (const item of entry.items) {
        const existing = await db.customTemplates.get(item.id);
        const parsed = existing ? fromStored(existing) : null;
        if (parsed && parsed.owner !== entry.owner) continue;
        if (!parsed || pickNewerCustomTemplate(parsed.template, item) === item) {
          await db.customTemplates.put(toStored(entry.owner, item));
        }
        migrated++;
      }
    }
  });

  for (const entry of entries) {
    try {
      localStorage.removeItem(entry.key);
    } catch {
      // Sem acesso ao localStorage: a migração é idempotente e roda de novo depois
    }
  }
  return migrated;
}

async function hydrate(): Promise<void> {
  try {
    await migrateLegacyCustomTemplates();
  } catch (err) {
    console.warn('Não foi possível migrar os modelos personalizados antigos:', err);
  }
  try {
    const rows = await db.customTemplates.toArray();
    const byOwner = new Map<string, CustomTemplate[]>();
    for (const row of rows) {
      const parsed = fromStored(row);
      if (!parsed) continue;
      const list = byOwner.get(parsed.owner) ?? [];
      list.push(parsed.template);
      byOwner.set(parsed.owner, list);
    }
    for (const [owner, list] of byOwner) absorb(owner, list);
  } catch (err) {
    // IndexedDB indisponível (ex.: navegação privada restrita): os modelos valem só nesta sessão
    console.warn('Não foi possível carregar os modelos personalizados:', err);
  }
  getChannel();
  notify();
}

/** Carrega os modelos do IndexedDB (migrando o formato antigo uma única vez). Idempotente. */
export function loadCustomTemplates(): Promise<void> {
  if (!hydration) hydration = hydrate();
  return hydration;
}

/** Aguarda as gravações pendentes no IndexedDB (útil em testes e antes de sincronizar). */
export function flushCustomTemplates(): Promise<void> {
  return persistQueue;
}

// ---------------------------------------------------------------------
// API usada pela interface (mesmas assinaturas da versão em localStorage)
// ---------------------------------------------------------------------

export function subscribeCustomTemplates(listener: () => void): () => void {
  listeners.add(listener);
  void loadCustomTemplates();
  return () => listeners.delete(listener);
}

/**
 * Avisa quando o usuário altera os modelos de um perfil (adicionar, remover, desfazer).
 * Não dispara para mudanças vindas da sincronização, para não criar um ciclo de envios.
 */
export function subscribeCustomTemplateMutations(listener: (owner: string) => void): () => void {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
}

/** Lista estável (mesma referência até a próxima alteração), própria para useSyncExternalStore. */
export function getCustomTemplates(owner: string): CustomTemplate[] {
  const cached = visibleCache.get(owner);
  if (cached) return cached;
  const map = records.get(owner);
  const list = map
    ? [...map.values()].filter((t) => !t.deletedAt).sort(compareCustomTemplates)
    : EMPTY;
  const stable = list.length === 0 ? EMPTY : list;
  visibleCache.set(owner, stable);
  return stable;
}

/** Todos os registros do perfil, inclusive os removidos (para a sincronização). */
export function getCustomTemplateRecords(owner: string): CustomTemplate[] {
  const map = records.get(owner);
  return map ? [...map.values()].sort(compareCustomTemplates) : [];
}

export function findCustomTemplateByPackage(owner: string, packageId: string): CustomTemplate | undefined {
  const target = packageId.toLowerCase();
  return getCustomTemplates(owner).find((t) => t.packageId.toLowerCase() === target);
}

function commitMutation(owner: string, items: CustomTemplate[]) {
  const map = ownerRecords(owner);
  for (const item of items) map.set(item.id, item);
  visibleCache.delete(owner);
  void persist(owner, items);
  notify();
  for (const listener of mutationListeners) listener(owner);
}

export function addCustomTemplate(owner: string, input: { name: string; packageId: string }): CustomTemplate {
  const now = new Date().toISOString();
  const name = input.name.trim();
  const target = input.packageId.toLowerCase();
  // Reaproveita a marca de exclusão do mesmo pacote: a lista não cresce a cada remover/adicionar
  const removed = [...ownerRecords(owner).values()].find(
    (t) => t.deletedAt && t.packageId.toLowerCase() === target,
  );
  const template: CustomTemplate = removed
    ? {
        ...removed,
        name,
        packageId: input.packageId,
        createdAt: now,
        updatedAt: nextTimestamp(removed.updatedAt),
        deletedAt: null,
      }
    : { id: newId(), name, packageId: input.packageId, createdAt: now, updatedAt: now, deletedAt: null };
  commitMutation(owner, [template]);
  return template;
}

export function removeCustomTemplate(owner: string, id: string): CustomTemplate | undefined {
  const current = records.get(owner)?.get(id);
  if (!current || current.deletedAt) return undefined;
  const updatedAt = nextTimestamp(current.updatedAt);
  commitMutation(owner, [{ ...current, deletedAt: updatedAt, updatedAt }]);
  return current;
}

/** Desfaz uma remoção: limpa a marca de exclusão e atualiza o `updatedAt`. */
export function restoreCustomTemplate(owner: string, template: CustomTemplate) {
  const current = records.get(owner)?.get(template.id);
  if (current && !current.deletedAt) return;
  const base = current ?? normalizeCustomTemplate(template);
  if (!base) return;
  commitMutation(owner, [
    { ...base, deletedAt: null, updatedAt: nextTimestamp(current?.updatedAt ?? base.updatedAt) },
  ]);
}

// ---------------------------------------------------------------------
// Usado pela sincronização e pela exclusão de conta
// ---------------------------------------------------------------------

/**
 * Aplica o resultado de uma sincronização. Registros alterados localmente durante a
 * sincronização são preservados (vence sempre o `updatedAt` mais recente).
 * Retorna `true` se algo mudou neste aparelho.
 */
export async function applySyncedCustomTemplates(
  owner: string,
  templates: CustomTemplate[],
): Promise<boolean> {
  await loadCustomTemplates();
  const changed = absorb(owner, templates);
  if (changed.length === 0) return false;
  notify();
  await persist(owner, changed);
  return true;
}

/** Recarrega do IndexedDB os registros de um perfil (pega alterações de outras abas). */
export async function refreshCustomTemplatesFromDb(owner: string): Promise<void> {
  await loadCustomTemplates();
  await persistQueue;
  await reloadOwnerFromDb(owner);
}

/** Apaga de vez os modelos de um perfil neste navegador (exclusão de conta). */
export async function purgeCustomTemplatesForOwner(owner: string): Promise<void> {
  await loadCustomTemplates();
  await persistQueue;
  records.delete(owner);
  visibleCache.delete(owner);
  notify();
  try {
    await db.customTemplates.where('ownerEmail').equals(owner).delete();
  } catch (err) {
    console.warn('Não foi possível apagar os modelos personalizados deste navegador:', err);
  }
}

/** Zera o estado em memória (somente para testes). */
export function resetCustomTemplatesForTests(): void {
  records.clear();
  visibleCache.clear();
  listeners.clear();
  mutationListeners.clear();
  hydration = null;
  persistQueue = Promise.resolve();
  channel?.close();
  channel = null;
}
