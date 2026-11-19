// =====================================================================
// RedijaApp: Acervo Pessoal de Referências ("Minha Biblioteca" — RDJ-07)
// Persistência local (IndexedDB via Dexie) + cache síncrono + BroadcastChannel
// =====================================================================

import { AcademicReference, ReferenceType } from '@/types/document';
import { db, type StoredLibraryFolder, type StoredLibraryReference } from './db';
import {
  compareLibraryFolders,
  compareLibraryReferences,
  dedupeTagsCaseInsensitive,
  findDuplicateInList,
  isSameLibraryFolder,
  isSameLibraryReference,
  normalizeDoi,
  normalizeIsbn,
  normalizeLibraryFolder,
  normalizeLibraryReference,
  pickNewerLibraryFolder,
  pickNewerLibraryReference,
  type LibraryStateSnapshot,
  type SyncedLibraryFolder,
  type SyncedLibraryReference,
} from './referenceLibraryMerge';

export type LibraryReference = SyncedLibraryReference;
export type LibraryFolder = SyncedLibraryFolder;

export const LOCAL_LIBRARY_OWNER = 'local';

/** Só contas Google sincronizam com o Drive; o perfil local fica apenas neste navegador. */
export function isSyncableLibraryOwner(owner: string | null | undefined): owner is string {
  return typeof owner === 'string' && owner !== LOCAL_LIBRARY_OWNER && owner.includes('@');
}

const EMPTY_REFS: LibraryReference[] = [];
const EMPTY_FOLDERS: LibraryFolder[] = [];
const CHANNEL_NAME = 'redija:referenceLibrary';

/** Todos os registros (inclusive tombstones `deletedAt`), por dono e por id. */
const refRecords = new Map<string, Map<string, LibraryReference>>();
const folderRecords = new Map<string, Map<string, LibraryFolder>>();

/** Listas visíveis (sem `deletedAt`) estabilizadas para `useSyncExternalStore`. */
const visibleRefsCache = new Map<string, LibraryReference[]>();
const visibleFoldersCache = new Map<string, LibraryFolder[]>();

const listeners = new Set<() => void>();
const mutationListeners = new Set<(owner: string) => void>();

let hydration: Promise<void> | null = null;
let persistQueue: Promise<void> = Promise.resolve();
let channel: BroadcastChannel | null = null;

function newId(prefix = 'lib'): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nextTimestamp(previous?: string): string {
  const now = Date.now();
  const prev = previous ? Date.parse(previous) : NaN;
  return new Date(Number.isNaN(prev) || now > prev ? now : prev + 1).toISOString();
}

function ownerRefs(owner: string): Map<string, LibraryReference> {
  let map = refRecords.get(owner);
  if (!map) {
    map = new Map();
    refRecords.set(owner, map);
  }
  return map;
}

function ownerFolders(owner: string): Map<string, LibraryFolder> {
  let map = folderRecords.get(owner);
  if (!map) {
    map = new Map();
    folderRecords.set(owner, map);
  }
  return map;
}

function notify() {
  for (const listener of listeners) listener();
}

function toStoredRef(owner: string, ref: LibraryReference): StoredLibraryReference {
  return { ...ref, ownerEmail: owner };
}

function toStoredFolder(owner: string, folder: LibraryFolder): StoredLibraryFolder {
  return { ...folder, ownerEmail: owner };
}

function fromStoredRef(
  row: StoredLibraryReference,
): { owner: string; ref: LibraryReference } | null {
  if (!row || typeof row.ownerEmail !== 'string' || !row.ownerEmail) return null;
  const ref = normalizeLibraryReference(row);
  return ref ? { owner: row.ownerEmail, ref } : null;
}

function fromStoredFolder(
  row: StoredLibraryFolder,
): { owner: string; folder: LibraryFolder } | null {
  if (!row || typeof row.ownerEmail !== 'string' || !row.ownerEmail) return null;
  const folder = normalizeLibraryFolder(row);
  return folder ? { owner: row.ownerEmail, folder } : null;
}

function absorbRefs(owner: string, incoming: LibraryReference[]): LibraryReference[] {
  const map = ownerRefs(owner);
  const changed: LibraryReference[] = [];
  for (const item of incoming) {
    const current = map.get(item.id);
    const winner = current ? pickNewerLibraryReference(current, item) : item;
    if (!current || !isSameLibraryReference(current, winner)) {
      map.set(item.id, winner);
      changed.push(winner);
    }
  }
  if (changed.length > 0) visibleRefsCache.delete(owner);
  return changed;
}

function absorbFolders(owner: string, incoming: LibraryFolder[]): LibraryFolder[] {
  const map = ownerFolders(owner);
  const changed: LibraryFolder[] = [];
  for (const item of incoming) {
    const current = map.get(item.id);
    const winner = current ? pickNewerLibraryFolder(current, item) : item;
    if (!current || !isSameLibraryFolder(current, winner)) {
      map.set(item.id, winner);
      changed.push(winner);
    }
  }
  if (changed.length > 0) visibleFoldersCache.delete(owner);
  return changed;
}

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

function persist(
  owner: string,
  changedRefs: LibraryReference[],
  changedFolders: LibraryFolder[],
): Promise<void> {
  if (changedRefs.length === 0 && changedFolders.length === 0) return persistQueue;
  persistQueue = persistQueue
    .then(() => loadReferenceLibrary())
    .then(() =>
      db.transaction('rw', db.library, db.libraryFolders, async () => {
        for (const item of changedFolders) {
          const existing = await db.libraryFolders.get(item.id);
          const parsed = existing ? fromStoredFolder(existing) : null;
          if (parsed && parsed.owner !== owner) continue;
          const winner = parsed ? pickNewerLibraryFolder(parsed.folder, item) : item;
          if (!parsed || !isSameLibraryFolder(parsed.folder, winner)) {
            await db.libraryFolders.put(toStoredFolder(owner, winner));
          }
        }
        for (const item of changedRefs) {
          const existing = await db.library.get(item.id);
          const parsed = existing ? fromStoredRef(existing) : null;
          if (parsed && parsed.owner !== owner) continue;
          const winner = parsed ? pickNewerLibraryReference(parsed.ref, item) : item;
          if (!parsed || !isSameLibraryReference(parsed.ref, winner)) {
            await db.library.put(toStoredRef(owner, winner));
          }
        }
      }),
    )
    .then(() => {
      getChannel()?.postMessage({ owner });
    })
    .catch((err) => {
      console.warn('Não foi possível salvar a biblioteca de referências neste navegador:', err);
    });
  return persistQueue;
}

async function reloadOwnerFromDb(owner: string): Promise<void> {
  try {
    const [refRows, folderRows] = await Promise.all([
      db.library.where('ownerEmail').equals(owner).toArray(),
      db.libraryFolders.where('ownerEmail').equals(owner).toArray(),
    ]);
    const incomingRefs = refRows.map(fromStoredRef).flatMap((r) => (r ? [r.ref] : []));
    const incomingFolders = folderRows.map(fromStoredFolder).flatMap((f) => (f ? [f.folder] : []));
    const rChanged = absorbRefs(owner, incomingRefs);
    const fChanged = absorbFolders(owner, incomingFolders);
    if (rChanged.length > 0 || fChanged.length > 0) notify();
  } catch (err) {
    console.warn('Não foi possível recarregar a biblioteca de referências:', err);
  }
}

async function hydrate(): Promise<void> {
  try {
    const [refRows, folderRows] = await Promise.all([
      db.library.toArray(),
      db.libraryFolders.toArray(),
    ]);

    const foldersByOwner = new Map<string, LibraryFolder[]>();
    for (const row of folderRows) {
      const parsed = fromStoredFolder(row);
      if (!parsed) continue;
      const list = foldersByOwner.get(parsed.owner) ?? [];
      list.push(parsed.folder);
      foldersByOwner.set(parsed.owner, list);
    }
    for (const [owner, list] of foldersByOwner) absorbFolders(owner, list);

    const refsByOwner = new Map<string, LibraryReference[]>();
    for (const row of refRows) {
      const parsed = fromStoredRef(row);
      if (!parsed) continue;
      const list = refsByOwner.get(parsed.owner) ?? [];
      list.push(parsed.ref);
      refsByOwner.set(parsed.owner, list);
    }
    for (const [owner, list] of refsByOwner) absorbRefs(owner, list);
  } catch (err) {
    console.warn('Não foi possível carregar a biblioteca de referências do IndexedDB:', err);
  }
  getChannel();
  notify();
}

/** Carrega a biblioteca do IndexedDB (idempotente). */
export function loadReferenceLibrary(): Promise<void> {
  if (!hydration) hydration = hydrate();
  return hydration;
}

/** Aguarda gravações pendentes no IndexedDB (útil em testes e antes de sincronizar). */
export function flushReferenceLibrary(): Promise<void> {
  return persistQueue;
}

export function subscribeReferenceLibrary(listener: () => void): () => void {
  listeners.add(listener);
  void loadReferenceLibrary();
  return () => listeners.delete(listener);
}

export function subscribeReferenceLibraryMutations(listener: (owner: string) => void): () => void {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
}

/** Lista estável de referências ativas do dono, própria para `useSyncExternalStore`. */
export function getLibraryReferences(owner: string): LibraryReference[] {
  const cached = visibleRefsCache.get(owner);
  if (cached) return cached;
  const map = refRecords.get(owner);
  const list = map
    ? [...map.values()].filter((r) => !r.deletedAt).sort(compareLibraryReferences)
    : EMPTY_REFS;
  const stable = list.length === 0 ? EMPTY_REFS : list;
  visibleRefsCache.set(owner, stable);
  return stable;
}

/** Lista estável de pastas ativas do dono, própria para `useSyncExternalStore`. */
export function getLibraryFolders(owner: string): LibraryFolder[] {
  const cached = visibleFoldersCache.get(owner);
  if (cached) return cached;
  const map = folderRecords.get(owner);
  const list = map
    ? [...map.values()].filter((f) => !f.deletedAt).sort(compareLibraryFolders)
    : EMPTY_FOLDERS;
  const stable = list.length === 0 ? EMPTY_FOLDERS : list;
  visibleFoldersCache.set(owner, stable);
  return stable;
}

/** Todos os registros (inclusive tombstones `deletedAt`), para sincronização com o Drive. */
export function getLibraryStateSnapshot(owner: string): LibraryStateSnapshot {
  const refs = refRecords.get(owner);
  const folders = folderRecords.get(owner);
  return {
    references: refs ? [...refs.values()].sort(compareLibraryReferences) : [],
    folders: folders ? [...folders.values()].sort(compareLibraryFolders) : [],
  };
}

function commitMutation(
  owner: string,
  changedRefs: LibraryReference[],
  changedFolders: LibraryFolder[] = [],
) {
  if (changedRefs.length > 0) {
    const rMap = ownerRefs(owner);
    for (const item of changedRefs) rMap.set(item.id, item);
    visibleRefsCache.delete(owner);
  }
  if (changedFolders.length > 0) {
    const fMap = ownerFolders(owner);
    for (const item of changedFolders) fMap.set(item.id, item);
    visibleFoldersCache.delete(owner);
  }
  void persist(owner, changedRefs, changedFolders);
  notify();
  for (const listener of mutationListeners) listener(owner);
}

export interface AddLibraryReferenceInput {
  type?: ReferenceType;
  authors: string;
  title: string;
  subtitle?: string;
  edition?: string;
  city?: string;
  publisher?: string;
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  institution?: string;
  degree?: string;
  url?: string;
  accessDate?: string;
  doi?: string;
  isbn?: string;
  folderId?: string | null;
  tags?: string[];
}

export interface AddLibraryReferenceResult {
  reference: LibraryReference;
  isDuplicate: boolean;
}

/**
 * Adiciona uma referência à biblioteca do perfil (aplicando deduplicação por DOI, ISBN ou título+ano).
 * Se a referência já existir ativa na biblioteca, retorna `{ reference: existing, isDuplicate: true }`.
 */
export function addLibraryReference(
  owner: string,
  input: AddLibraryReferenceInput,
): AddLibraryReferenceResult {
  const activeList = getLibraryReferences(owner);
  const candidate = {
    title: input.title,
    subtitle: input.subtitle,
    year: input.year || String(new Date().getFullYear()),
    doi: input.doi,
    isbn: input.isbn,
  };
  const existingDuplicate = findDuplicateInList(candidate, activeList);
  if (existingDuplicate) {
    return { reference: existingDuplicate, isDuplicate: true };
  }

  // Reaproveita tombstone se a mesma obra havia sido removida antes
  const allRecords = [...ownerRefs(owner).values()];
  const removedMatch = allRecords.find(
    (r) =>
      Boolean(r.deletedAt) && Boolean(findDuplicateInList(candidate, [{ ...r, deletedAt: null }])),
  );

  const now = new Date().toISOString();
  const updatedAt = removedMatch ? nextTimestamp(removedMatch.updatedAt) : now;
  const activeFolders = getLibraryFolders(owner);
  const validFolderId =
    input.folderId && activeFolders.some((f) => f.id === input.folderId) ? input.folderId : null;

  const newRef: LibraryReference = {
    id: removedMatch ? removedMatch.id : newId('libref'),
    type: input.type || 'book',
    authors: input.authors.trim() || 'AUTOR DESCONHECIDO',
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || undefined,
    edition: input.edition?.trim() || undefined,
    city: input.city?.trim() || 'São Paulo',
    publisher: input.publisher?.trim() || 'Editora',
    year: input.year?.trim() || String(new Date().getFullYear()),
    journal: input.journal?.trim() || undefined,
    volume: input.volume?.trim() || undefined,
    issue: input.issue?.trim() || undefined,
    pages: input.pages?.trim() || undefined,
    institution: input.institution?.trim() || undefined,
    degree: input.degree?.trim() || undefined,
    url: input.url?.trim() || undefined,
    accessDate: input.accessDate?.trim() || undefined,
    doi: normalizeDoi(input.doi) ?? (input.doi?.trim() || undefined),
    isbn: normalizeIsbn(input.isbn) ?? (input.isbn?.trim() || undefined),
    folderId: validFolderId,
    tags: dedupeTagsCaseInsensitive(input.tags ?? []),
    createdAt: removedMatch ? removedMatch.createdAt : now,
    updatedAt,
    deletedAt: null,
  };

  commitMutation(owner, [newRef]);
  return { reference: newRef, isDuplicate: false };
}

/**
 * Atualiza uma referência existente na biblioteca (RDJ-07.1, RDJ-07.5, RDJ-07.6).
 */
export function updateLibraryReference(
  owner: string,
  id: string,
  patch: Partial<Omit<LibraryReference, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>,
): LibraryReference | undefined {
  const current = ownerRefs(owner).get(id);
  if (!current || current.deletedAt) return undefined;

  const updatedAt = nextTimestamp(current.updatedAt);
  const nextTags = patch.tags !== undefined ? dedupeTagsCaseInsensitive(patch.tags) : current.tags;
  const activeFolders = getLibraryFolders(owner);
  const nextFolderId =
    patch.folderId !== undefined
      ? patch.folderId && activeFolders.some((f) => f.id === patch.folderId)
        ? patch.folderId
        : null
      : current.folderId;

  const updated: LibraryReference = {
    ...current,
    ...patch,
    authors: (patch.authors ?? current.authors).trim() || 'AUTOR DESCONHECIDO',
    title: (patch.title ?? current.title).trim() || current.title,
    city: (patch.city ?? current.city).trim() || 'São Paulo',
    publisher: (patch.publisher ?? current.publisher).trim() || 'Editora',
    year: (patch.year ?? current.year).trim() || current.year,
    doi:
      patch.doi !== undefined
        ? (normalizeDoi(patch.doi) ?? (patch.doi?.trim() || undefined))
        : current.doi,
    isbn:
      patch.isbn !== undefined
        ? (normalizeIsbn(patch.isbn) ?? (patch.isbn?.trim() || undefined))
        : current.isbn,
    folderId: nextFolderId,
    tags: nextTags,
    updatedAt,
  };

  commitMutation(owner, [updated]);
  return updated;
}

/**
 * Exclui uma referência da biblioteca registrando tombstone `deletedAt` (RDJ-07.1 Cenário 5 e RDJ-07.4 Cenário 4).
 */
export function removeLibraryReference(owner: string, id: string): LibraryReference | undefined {
  const current = ownerRefs(owner).get(id);
  if (!current || current.deletedAt) return undefined;
  const updatedAt = nextTimestamp(current.updatedAt);
  commitMutation(owner, [{ ...current, deletedAt: updatedAt, updatedAt }]);
  return current;
}

/**
 * Restaura uma referência recém-excluída da biblioteca (Desfazer).
 */
export function restoreLibraryReference(owner: string, reference: LibraryReference): void {
  const current = ownerRefs(owner).get(reference.id);
  if (current && !current.deletedAt) return;
  const base = current ?? normalizeLibraryReference(reference);
  if (!base) return;
  const updatedAt = nextTimestamp(current?.updatedAt ?? base.updatedAt);
  commitMutation(owner, [{ ...base, deletedAt: null, updatedAt }]);
}

/**
 * Move uma ou mais referências para uma pasta (ou `null` para "Sem pasta", RDJ-07.5 Cenário 1).
 */
export function moveLibraryReferencesToFolder(
  owner: string,
  referenceIds: string[],
  folderId: string | null,
): void {
  const activeFolders = getLibraryFolders(owner);
  const validFolderId = folderId && activeFolders.some((f) => f.id === folderId) ? folderId : null;
  const map = ownerRefs(owner);
  const changed: LibraryReference[] = [];

  for (const id of referenceIds) {
    const current = map.get(id);
    if (!current || current.deletedAt || current.folderId === validFolderId) continue;
    const updatedAt = nextTimestamp(current.updatedAt);
    changed.push({ ...current, folderId: validFolderId, updatedAt });
  }

  if (changed.length > 0) {
    commitMutation(owner, changed);
  }
}

/**
 * Cria uma pasta na biblioteca (RDJ-07.5 Cenário 1).
 * Nomes são únicos sem diferenciar maiúsculas e minúsculas.
 */
export function createLibraryFolder(
  owner: string,
  rawName: string,
): { folder: LibraryFolder; alreadyExists: boolean } {
  const name = rawName.trim();
  if (!name) {
    throw new Error('Informe um nome para a pasta.');
  }
  const key = name.toLocaleLowerCase('pt-BR');
  const existing = getLibraryFolders(owner).find((f) => f.name.toLocaleLowerCase('pt-BR') === key);
  if (existing) {
    return { folder: existing, alreadyExists: true };
  }

  const removed = [...ownerFolders(owner).values()].find(
    (f) => f.deletedAt && f.name.toLocaleLowerCase('pt-BR') === key,
  );
  const now = new Date().toISOString();
  const folder: LibraryFolder = removed
    ? {
        ...removed,
        name,
        updatedAt: nextTimestamp(removed.updatedAt),
        deletedAt: null,
      }
    : {
        id: newId('libfolder'),
        name,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };

  commitMutation(owner, [], [folder]);
  return { folder, alreadyExists: false };
}

/**
 * Renomeia uma pasta existente mantendo unicidade case-insensitive.
 */
export function renameLibraryFolder(
  owner: string,
  folderId: string,
  rawNewName: string,
): LibraryFolder | undefined {
  const name = rawNewName.trim();
  if (!name) return undefined;
  const current = ownerFolders(owner).get(folderId);
  if (!current || current.deletedAt) return undefined;

  const key = name.toLocaleLowerCase('pt-BR');
  const duplicate = getLibraryFolders(owner).find(
    (f) => f.id !== folderId && f.name.toLocaleLowerCase('pt-BR') === key,
  );
  if (duplicate) {
    throw new Error(`Já existe uma pasta chamada "${duplicate.name}".`);
  }

  const updatedAt = nextTimestamp(current.updatedAt);
  const updated: LibraryFolder = { ...current, name, updatedAt };
  commitMutation(owner, [], [updated]);
  return updated;
}

/**
 * Exclui uma pasta da biblioteca. As referências que estavam nela não são excluídas
 * e vão automaticamente para "Sem pasta" (`folderId: null`) (RDJ-07.5 Cenário 4).
 */
export function deleteLibraryFolder(owner: string, folderId: string): LibraryFolder | undefined {
  const current = ownerFolders(owner).get(folderId);
  if (!current || current.deletedAt) return undefined;

  const folderUpdatedAt = nextTimestamp(current.updatedAt);
  const deletedFolder: LibraryFolder = {
    ...current,
    deletedAt: folderUpdatedAt,
    updatedAt: folderUpdatedAt,
  };

  const unfiledRefs: LibraryReference[] = [];
  for (const ref of ownerRefs(owner).values()) {
    if (!ref.deletedAt && ref.folderId === folderId) {
      unfiledRefs.push({
        ...ref,
        folderId: null,
        updatedAt: nextTimestamp(ref.updatedAt),
      });
    }
  }

  commitMutation(owner, unfiledRefs, [deletedFolder]);
  return current;
}

// ---------------------------------------------------------------------
// Sincronização com Google Drive e limpeza de conta
// ---------------------------------------------------------------------

export async function applySyncedReferenceLibrary(
  owner: string,
  state: LibraryStateSnapshot,
): Promise<boolean> {
  await loadReferenceLibrary();
  const changedFolders = absorbFolders(owner, state.folders);
  const changedRefs = absorbRefs(owner, state.references);
  if (changedFolders.length === 0 && changedRefs.length === 0) return false;
  notify();
  await persist(owner, changedRefs, changedFolders);
  return true;
}

export async function refreshReferenceLibraryFromDb(owner: string): Promise<void> {
  await loadReferenceLibrary();
  await persistQueue;
  await reloadOwnerFromDb(owner);
}

export async function purgeReferenceLibraryForOwner(owner: string): Promise<void> {
  await loadReferenceLibrary();
  await persistQueue;
  refRecords.delete(owner);
  folderRecords.delete(owner);
  visibleRefsCache.delete(owner);
  visibleFoldersCache.delete(owner);
  notify();
  try {
    await Promise.all([
      db.library.where('ownerEmail').equals(owner).delete(),
      db.libraryFolders.where('ownerEmail').equals(owner).delete(),
    ]);
  } catch (err) {
    console.warn('Não foi possível apagar a biblioteca de referências deste navegador:', err);
  }
}

/** Zera o estado em memória (somente para testes). */
export function resetReferenceLibraryForTests(): void {
  refRecords.clear();
  folderRecords.clear();
  visibleRefsCache.clear();
  visibleFoldersCache.clear();
  listeners.clear();
  mutationListeners.clear();
  hydration = null;
  persistQueue = Promise.resolve();
  channel?.close();
  channel = null;
}

/**
 * Converte uma `AcademicReference` de projeto para `AddLibraryReferenceInput`.
 */
export function projectRefToLibraryInput(
  ref: AcademicReference,
  extra?: { folderId?: string | null; tags?: string[] },
): AddLibraryReferenceInput {
  return {
    type: ref.type,
    authors: ref.authors,
    title: ref.title,
    subtitle: ref.subtitle,
    edition: ref.edition,
    city: ref.city,
    publisher: ref.publisher,
    year: ref.year,
    journal: ref.journal,
    volume: ref.volume,
    issue: ref.issue,
    pages: ref.pages,
    institution: ref.institution,
    degree: ref.degree,
    url: ref.url,
    accessDate: ref.accessDate,
    doi: ref.doi,
    isbn: ref.isbn,
    folderId: extra?.folderId ?? null,
    tags: extra?.tags ?? [],
  };
}
