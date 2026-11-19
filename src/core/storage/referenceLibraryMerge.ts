// =====================================================================
// RedijaApp: Regras de deduplicação, busca, mesclagem e diff da
// Biblioteca Pessoal de Referências (RDJ-07 — funções puras)
// =====================================================================

import { AcademicReference, ReferenceType } from '@/types/document';

export interface SyncedLibraryReference {
  id: string;
  type: ReferenceType;
  authors: string;
  title: string;
  subtitle?: string;
  edition?: string;
  city: string;
  publisher: string;
  year: string;
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
  /** ID da pasta na biblioteca (v1: no máximo uma pasta; `null` = "Sem pasta"). */
  folderId: string | null;
  /** Tags únicas (sem diferenciar maiúsculas/minúsculas). */
  tags: string[];
  createdAt: string;
  updatedAt: string;
  /** Tombstone para sincronização não destrutiva entre dispositivos (RDJ-07.4). */
  deletedAt: string | null;
}

export interface SyncedLibraryFolder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

const VALID_REFERENCE_TYPES: ReferenceType[] = [
  'book',
  'article',
  'thesis',
  'website',
  'legislation',
];

const MAX_ID_LENGTH = 120;
const MAX_FOLDER_NAME_LENGTH = 120;
const MAX_TAG_LENGTH = 80;

function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function toOptString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Normaliza um código DOI (extrai `10.xxxx/...` em minúsculas).
 */
export function normalizeDoi(doi?: string | null): string | null {
  if (!doi || typeof doi !== 'string') return null;
  const match = doi.trim().match(/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/);
  if (!match) return null;
  return match[1].replace(/[.,;]+$/, '').toLowerCase();
}

/**
 * Normaliza um código ISBN-10 ou ISBN-13 (somente dígitos e 'X' final).
 */
export function normalizeIsbn(isbn?: string | null): string | null {
  if (!isbn || typeof isbn !== 'string') return null;
  const cleaned = isbn.replace(/[^0-9Xx]/g, '').toUpperCase();
  if (cleaned.length !== 10 && cleaned.length !== 13) return null;
  return cleaned;
}

/**
 * Normaliza o título (sem acentos, caixa e pontuação) para comparação e deduplicação (RDJ-07.1).
 */
export function normalizeTitleForDedup(title?: string | null, subtitle?: string | null): string {
  const full = subtitle?.trim() ? `${title ?? ''} ${subtitle}` : (title ?? '');
  return full
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza o ano (4 dígitos) para deduplicação.
 */
export function normalizeYearForDedup(year?: string | null): string {
  if (!year || typeof year !== 'string') return '';
  const match = year.match(/\b(1[4-9]\d{2}|20\d{2})\b/);
  return match ? match[1] : year.replace(/[^0-9]/g, '').trim();
}

/**
 * Verifica se duas referências representam a mesma obra segundo as regras de RDJ-07.1:
 * - Mesmo DOI normalizado, OU
 * - Mesmo ISBN normalizado, OU
 * - Mesmo título normalizado (sem acentos, caixa e pontuação) + mesmo ano.
 */
export function isDuplicateReference(
  a: Pick<AcademicReference, 'title' | 'subtitle' | 'year' | 'doi' | 'isbn'>,
  b: Pick<AcademicReference, 'title' | 'subtitle' | 'year' | 'doi' | 'isbn'>,
): boolean {
  const doiA = normalizeDoi(a.doi);
  const doiB = normalizeDoi(b.doi);
  if (doiA && doiB && doiA === doiB) return true;

  const isbnA = normalizeIsbn(a.isbn);
  const isbnB = normalizeIsbn(b.isbn);
  if (isbnA && isbnB && isbnA === isbnB) return true;

  // Se ambos possuem título principal normalizado idêntico (ou título + subtítulo idêntico) e mesmo ano
  const titleFullA = normalizeTitleForDedup(a.title, a.subtitle);
  const titleFullB = normalizeTitleForDedup(b.title, b.subtitle);
  const titleMainA = normalizeTitleForDedup(a.title);
  const titleMainB = normalizeTitleForDedup(b.title);

  const yearA = normalizeYearForDedup(a.year);
  const yearB = normalizeYearForDedup(b.year);

  if (!titleMainA || !titleMainB) return false;
  if (yearA !== yearB) return false;

  if (titleFullA === titleFullB) return true;
  // Quando uma fonte separa subtítulo e outra inclui tudo em title
  if (!a.subtitle || !b.subtitle) {
    return titleMainA === titleMainB || titleFullA === titleMainB || titleMainA === titleFullB;
  }
  return false;
}

/**
 * Procura na lista existente a primeira referência que seja duplicata da candidata.
 */
export function findDuplicateInList<
  T extends Pick<AcademicReference, 'title' | 'subtitle' | 'year' | 'doi' | 'isbn'> & {
    id?: string;
    deletedAt?: string | null;
  },
>(
  candidate: Pick<AcademicReference, 'title' | 'subtitle' | 'year' | 'doi' | 'isbn'>,
  list: T[],
  excludeId?: string,
): T | undefined {
  return list.find((item) => {
    if (item.deletedAt) return false;
    if (excludeId && item.id === excludeId) return false;
    return isDuplicateReference(candidate, item);
  });
}

/**
 * Deduplica uma lista de tags preservando a grafia da primeira ocorrência,
 * sem diferenciar maiúsculas e minúsculas (RDJ-07.5).
 */
export function dedupeTagsCaseInsensitive(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed) continue;
    const key = trimmed.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/**
 * Valida e normaliza uma pasta da biblioteca.
 */
export function normalizeLibraryFolder(
  value: unknown,
  fallbackDate = new Date().toISOString(),
): SyncedLibraryFolder | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || !v.id.trim() || v.id.length > MAX_ID_LENGTH) return null;
  if (typeof v.name !== 'string') return null;
  const name = v.name.trim().slice(0, MAX_FOLDER_NAME_LENGTH);
  if (!name) return null;

  const createdAt = toIsoDate(v.createdAt) ?? toIsoDate(v.updatedAt) ?? fallbackDate;
  const updatedAt = toIsoDate(v.updatedAt) ?? createdAt;
  const deletedAt = toIsoDate(v.deletedAt);

  return {
    id: v.id.trim(),
    name,
    createdAt,
    updatedAt,
    deletedAt,
  };
}

/**
 * Valida e normaliza uma referência da biblioteca.
 */
export function normalizeLibraryReference(
  value: unknown,
  fallbackDate = new Date().toISOString(),
): SyncedLibraryReference | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || !v.id.trim() || v.id.length > MAX_ID_LENGTH) return null;
  if (typeof v.title !== 'string' || !v.title.trim()) return null;

  const type: ReferenceType =
    typeof v.type === 'string' && VALID_REFERENCE_TYPES.includes(v.type as ReferenceType)
      ? (v.type as ReferenceType)
      : 'book';

  const authors =
    typeof v.authors === 'string' && v.authors.trim() ? v.authors.trim() : 'AUTOR DESCONHECIDO';
  const title = v.title.trim();
  const city = typeof v.city === 'string' && v.city.trim() ? v.city.trim() : 'São Paulo';
  const publisher =
    typeof v.publisher === 'string' && v.publisher.trim() ? v.publisher.trim() : 'Editora';
  const year =
    typeof v.year === 'string' && v.year.trim() ? v.year.trim() : String(new Date().getFullYear());

  const folderId = typeof v.folderId === 'string' && v.folderId.trim() ? v.folderId.trim() : null;
  const tags = dedupeTagsCaseInsensitive(v.tags);

  const createdAt = toIsoDate(v.createdAt) ?? toIsoDate(v.updatedAt) ?? fallbackDate;
  const updatedAt = toIsoDate(v.updatedAt) ?? createdAt;
  const deletedAt = toIsoDate(v.deletedAt);

  const normDoi = normalizeDoi(typeof v.doi === 'string' ? v.doi : undefined);
  const normIsbn = normalizeIsbn(typeof v.isbn === 'string' ? v.isbn : undefined);

  return {
    id: v.id.trim(),
    type,
    authors,
    title,
    subtitle: toOptString(v.subtitle),
    edition: toOptString(v.edition),
    city,
    publisher,
    year,
    journal: toOptString(v.journal),
    volume: toOptString(v.volume),
    issue: toOptString(v.issue),
    pages: toOptString(v.pages),
    institution: toOptString(v.institution),
    degree: toOptString(v.degree),
    url: toOptString(v.url),
    accessDate: toOptString(v.accessDate),
    doi: normDoi ?? toOptString(v.doi),
    isbn: normIsbn ?? toOptString(v.isbn),
    folderId,
    tags,
    createdAt,
    updatedAt,
    deletedAt,
  };
}

export function isSameLibraryReference(
  a: SyncedLibraryReference,
  b: SyncedLibraryReference,
): boolean {
  return (
    a.id === b.id &&
    a.type === b.type &&
    a.authors === b.authors &&
    a.title === b.title &&
    (a.subtitle ?? '') === (b.subtitle ?? '') &&
    (a.edition ?? '') === (b.edition ?? '') &&
    a.city === b.city &&
    a.publisher === b.publisher &&
    a.year === b.year &&
    (a.journal ?? '') === (b.journal ?? '') &&
    (a.volume ?? '') === (b.volume ?? '') &&
    (a.issue ?? '') === (b.issue ?? '') &&
    (a.pages ?? '') === (b.pages ?? '') &&
    (a.institution ?? '') === (b.institution ?? '') &&
    (a.degree ?? '') === (b.degree ?? '') &&
    (a.url ?? '') === (b.url ?? '') &&
    (a.accessDate ?? '') === (b.accessDate ?? '') &&
    (a.doi ?? '') === (b.doi ?? '') &&
    (a.isbn ?? '') === (b.isbn ?? '') &&
    (a.folderId ?? null) === (b.folderId ?? null) &&
    a.tags.length === b.tags.length &&
    a.tags.every((t, i) => t === b.tags[i]) &&
    a.createdAt === b.createdAt &&
    a.updatedAt === b.updatedAt &&
    (a.deletedAt ?? null) === (b.deletedAt ?? null)
  );
}

export function isSameLibraryFolder(a: SyncedLibraryFolder, b: SyncedLibraryFolder): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.createdAt === b.createdAt &&
    a.updatedAt === b.updatedAt &&
    (a.deletedAt ?? null) === (b.deletedAt ?? null)
  );
}

export function pickNewerLibraryReference(
  a: SyncedLibraryReference,
  b: SyncedLibraryReference,
): SyncedLibraryReference {
  const timeA = Date.parse(a.updatedAt);
  const timeB = Date.parse(b.updatedAt);
  if (timeA !== timeB) return timeA > timeB ? a : b;
  if (Boolean(a.deletedAt) !== Boolean(b.deletedAt)) return a.deletedAt ? a : b;
  return JSON.stringify(a) <= JSON.stringify(b) ? a : b;
}

export function pickNewerLibraryFolder(
  a: SyncedLibraryFolder,
  b: SyncedLibraryFolder,
): SyncedLibraryFolder {
  const timeA = Date.parse(a.updatedAt);
  const timeB = Date.parse(b.updatedAt);
  if (timeA !== timeB) return timeA > timeB ? a : b;
  if (Boolean(a.deletedAt) !== Boolean(b.deletedAt)) return a.deletedAt ? a : b;
  return JSON.stringify(a) <= JSON.stringify(b) ? a : b;
}

export function compareLibraryReferences(
  a: SyncedLibraryReference,
  b: SyncedLibraryReference,
): number {
  return (
    a.authors.localeCompare(b.authors, 'pt-BR', { sensitivity: 'base' }) ||
    a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' }) ||
    a.id.localeCompare(b.id)
  );
}

export function compareLibraryFolders(a: SyncedLibraryFolder, b: SyncedLibraryFolder): number {
  return (
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}

// ---------------------------------------------------------------------
// Busca e filtragem rápida local (< 200 ms para até 5.000 referências)
// ---------------------------------------------------------------------

export interface LibraryFilterOptions {
  query?: string;
  /** `'all'` = todas; `'unfiled'` = Sem pasta; outro = ID da pasta. */
  folderFilter?: 'all' | 'unfiled' | string;
  /** Filtra referências que possuem esta tag (case-insensitive). */
  tagFilter?: string | null;
  /** Filtra por tipo de obra (`'all'` ou `ReferenceType`). */
  typeFilter?: 'all' | ReferenceType;
}

function stripDiacriticsLower(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Filtra referências ativas da biblioteca por busca textual (título, autor, ano, veículo, DOI/ISBN, tags),
 * pasta e tag. Otimizada para responder em < 200 ms com 5.000+ referências.
 */
export function filterLibraryReferences(
  references: SyncedLibraryReference[],
  options: LibraryFilterOptions = {},
): SyncedLibraryReference[] {
  const folderFilter = options.folderFilter ?? 'all';
  const tagKey = options.tagFilter ? options.tagFilter.trim().toLocaleLowerCase('pt-BR') : null;
  const typeFilter = options.typeFilter && options.typeFilter !== 'all' ? options.typeFilter : null;
  const rawQuery = (options.query ?? '').trim();
  const queryTerms = rawQuery ? stripDiacriticsLower(rawQuery).split(/\s+/).filter(Boolean) : [];

  const results: SyncedLibraryReference[] = [];
  for (let i = 0; i < references.length; i++) {
    const ref = references[i];
    if (ref.deletedAt) continue;

    if (folderFilter === 'unfiled') {
      if (ref.folderId !== null) continue;
    } else if (folderFilter !== 'all') {
      if (ref.folderId !== folderFilter) continue;
    }

    if (typeFilter && ref.type !== typeFilter) continue;

    if (tagKey) {
      let hasTag = false;
      for (let t = 0; t < ref.tags.length; t++) {
        if (ref.tags[t].toLocaleLowerCase('pt-BR') === tagKey) {
          hasTag = true;
          break;
        }
      }
      if (!hasTag) continue;
    }

    if (queryTerms.length > 0) {
      const haystack = stripDiacriticsLower(
        `${ref.title} ${ref.subtitle ?? ''} ${ref.authors} ${ref.year} ${ref.journal ?? ''} ${ref.publisher} ${ref.doi ?? ''} ${ref.isbn ?? ''} ${ref.tags.join(' ')}`,
      );
      let matchesAll = true;
      for (let q = 0; q < queryTerms.length; q++) {
        if (!haystack.includes(queryTerms[q])) {
          matchesAll = false;
          break;
        }
      }
      if (!matchesAll) continue;
    }

    results.push(ref);
  }

  return results;
}

// ---------------------------------------------------------------------
// Mesclagem não destrutiva (RDJ-07.4 e RDJ-07.5)
// ---------------------------------------------------------------------

export interface LibraryStateSnapshot {
  references: SyncedLibraryReference[];
  folders: SyncedLibraryFolder[];
}

export interface LibraryMergeResult {
  merged: LibraryStateSnapshot;
  changedLocal: boolean;
  changedRemote: boolean;
}

function listDiffers<T extends { id: string }>(
  merged: T[],
  side: T[],
  isSame: (a: T, b: T) => boolean,
): boolean {
  if (merged.length !== side.length) return true;
  const byId = new Map(side.map((item) => [item.id, item]));
  return merged.some((item) => {
    const other = byId.get(item.id);
    return !other || !isSame(item, other);
  });
}

/**
 * Mescla a biblioteca local com a remota (Google Drive):
 * - Item a item por `id`, vencendo o `updatedAt` mais recente;
 * - Exclusões (`deletedAt`) são preservadas como tombstones para não reaparecerem;
 * - Pastas ativas com mesmo nome (case-insensitive) criadas concorrentemente são unificadas;
 * - Referências cuja pasta foi excluída vão automaticamente para "Sem pasta" (`folderId: null`).
 */
export function mergeReferenceLibraries(
  local: LibraryStateSnapshot,
  remote: LibraryStateSnapshot,
): LibraryMergeResult {
  // 1. Mescla pastas por ID
  const folderById = new Map<string, SyncedLibraryFolder>();
  for (const folder of [...local.folders, ...remote.folders]) {
    const current = folderById.get(folder.id);
    folderById.set(folder.id, current ? pickNewerLibraryFolder(current, folder) : folder);
  }

  // Deduplica pastas ativas com mesmo nome (case-insensitive), mantendo a mais antiga
  const keeperByFolderName = new Map<string, SyncedLibraryFolder>();
  const remappedFolderIds = new Map<string, string>();
  const sortedFoldersByCreation = [...folderById.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
  for (const folder of sortedFoldersByCreation) {
    if (folder.deletedAt) continue;
    const key = folder.name.toLocaleLowerCase('pt-BR');
    const keeper = keeperByFolderName.get(key);
    if (!keeper) {
      keeperByFolderName.set(key, folder);
    } else if (keeper.id !== folder.id) {
      remappedFolderIds.set(folder.id, keeper.id);
      folderById.set(folder.id, { ...folder, deletedAt: folder.updatedAt });
    }
  }

  const mergedFolders = [...folderById.values()].sort(compareLibraryFolders);
  const activeFolderIds = new Set(mergedFolders.filter((f) => !f.deletedAt).map((f) => f.id));

  // 2. Mescla referências por ID
  const refById = new Map<string, SyncedLibraryReference>();
  for (const ref of [...local.references, ...remote.references]) {
    const current = refById.get(ref.id);
    refById.set(ref.id, current ? pickNewerLibraryReference(current, ref) : ref);
  }

  // Normaliza folderId (se a pasta foi excluída, vai para "Sem pasta") e tags
  const mergedReferences = [...refById.values()]
    .map((ref) => {
      let nextFolderId = ref.folderId
        ? (remappedFolderIds.get(ref.folderId) ?? ref.folderId)
        : null;
      if (nextFolderId && !activeFolderIds.has(nextFolderId)) {
        nextFolderId = null;
      }
      const nextTags = dedupeTagsCaseInsensitive(ref.tags);
      if (
        nextFolderId === ref.folderId &&
        nextTags.length === ref.tags.length &&
        nextTags.every((t, i) => t === ref.tags[i])
      ) {
        return ref;
      }
      return {
        ...ref,
        folderId: nextFolderId,
        tags: nextTags,
      };
    })
    .sort(compareLibraryReferences);

  const merged: LibraryStateSnapshot = {
    references: mergedReferences,
    folders: mergedFolders,
  };

  const changedLocal =
    listDiffers(merged.references, local.references, isSameLibraryReference) ||
    listDiffers(merged.folders, local.folders, isSameLibraryFolder);

  const changedRemote =
    listDiffers(merged.references, remote.references, isSameLibraryReference) ||
    listDiffers(merged.folders, remote.folders, isSameLibraryFolder);

  return { merged, changedLocal, changedRemote };
}

// ---------------------------------------------------------------------
// Serialização do arquivo `redija-biblioteca.json` no Google Drive
// ---------------------------------------------------------------------

export const REFERENCE_LIBRARY_PAYLOAD_KIND = 'redija-reference-library';
export const REFERENCE_LIBRARY_PAYLOAD_VERSION = 1;

export interface ReferenceLibraryPayload {
  kind: typeof REFERENCE_LIBRARY_PAYLOAD_KIND;
  version: number;
  exportedAt: string;
  references: SyncedLibraryReference[];
  folders: SyncedLibraryFolder[];
}

export function serializeReferenceLibraryPayload(state: LibraryStateSnapshot): string {
  const payload: ReferenceLibraryPayload = {
    kind: REFERENCE_LIBRARY_PAYLOAD_KIND,
    version: REFERENCE_LIBRARY_PAYLOAD_VERSION,
    exportedAt: new Date().toISOString(),
    references: [...state.references].sort(compareLibraryReferences),
    folders: [...state.folders].sort(compareLibraryFolders),
  };
  return JSON.stringify(payload, null, 2);
}

export function parseReferenceLibraryPayload(value: unknown): LibraryStateSnapshot {
  let data = value;
  if (typeof data === 'string') {
    try {
      data = data.trim() ? JSON.parse(data) : null;
    } catch {
      return { references: [], folders: [] };
    }
  }
  if (!data || typeof data !== 'object') {
    return { references: [], folders: [] };
  }

  const obj = data as { references?: unknown; folders?: unknown };
  const rawRefs = Array.isArray(obj.references) ? obj.references : [];
  const rawFolders = Array.isArray(obj.folders) ? obj.folders : [];

  const folderById = new Map<string, SyncedLibraryFolder>();
  for (const raw of rawFolders) {
    const folder = normalizeLibraryFolder(raw);
    if (!folder) continue;
    const current = folderById.get(folder.id);
    folderById.set(folder.id, current ? pickNewerLibraryFolder(current, folder) : folder);
  }

  const refById = new Map<string, SyncedLibraryReference>();
  for (const raw of rawRefs) {
    const ref = normalizeLibraryReference(raw);
    if (!ref) continue;
    const current = refById.get(ref.id);
    refById.set(ref.id, current ? pickNewerLibraryReference(current, ref) : ref);
  }

  return {
    references: [...refById.values()].sort(compareLibraryReferences),
    folders: [...folderById.values()].sort(compareLibraryFolders),
  };
}

// ---------------------------------------------------------------------
// Vínculo Biblioteca ↔ Projeto e Atualização Controlada (RDJ-07.1 e RDJ-07.6)
// ---------------------------------------------------------------------

export interface ReferenceFieldDiff {
  field: keyof AcademicReference;
  label: string;
  projectValue: string;
  libraryValue: string;
}

const COMPARABLE_FIELDS: Array<{ field: keyof AcademicReference; label: string }> = [
  { field: 'type', label: 'Tipo de documento' },
  { field: 'authors', label: 'Autores' },
  { field: 'title', label: 'Título' },
  { field: 'subtitle', label: 'Subtítulo' },
  { field: 'year', label: 'Ano' },
  { field: 'edition', label: 'Edição' },
  { field: 'city', label: 'Cidade' },
  { field: 'publisher', label: 'Editora / Órgão' },
  { field: 'journal', label: 'Periódico / Revista' },
  { field: 'volume', label: 'Volume' },
  { field: 'issue', label: 'Número' },
  { field: 'pages', label: 'Páginas' },
  { field: 'institution', label: 'Instituição' },
  { field: 'degree', label: 'Grau acadêmico' },
  { field: 'doi', label: 'DOI' },
  { field: 'isbn', label: 'ISBN' },
  { field: 'url', label: 'URL' },
];

/**
 * Cria uma cópia independente para ser inserida em um projeto, mantendo o vínculo
 * `libraryRefId` e `librarySyncedAt` com o item da biblioteca (RDJ-07.1 Cenário 3 e RDJ-07.6).
 */
export function toProjectReference(
  libRef: SyncedLibraryReference,
  customProjectId?: string,
): AcademicReference {
  return {
    id: customProjectId ?? crypto.randomUUID(),
    type: libRef.type,
    authors: libRef.authors,
    title: libRef.title,
    subtitle: libRef.subtitle,
    edition: libRef.edition,
    city: libRef.city,
    publisher: libRef.publisher,
    year: libRef.year,
    journal: libRef.journal,
    volume: libRef.volume,
    issue: libRef.issue,
    pages: libRef.pages,
    institution: libRef.institution,
    degree: libRef.degree,
    url: libRef.url,
    accessDate: libRef.accessDate,
    doi: libRef.doi,
    isbn: libRef.isbn,
    libraryRefId: libRef.id,
    librarySyncedAt: libRef.updatedAt,
  };
}

/**
 * Compara campo a campo a cópia do projeto com a referência na biblioteca (RDJ-07.6 Cenário 2).
 */
export function computeReferenceDiffs(
  projectRef: AcademicReference,
  libRef: SyncedLibraryReference,
): ReferenceFieldDiff[] {
  const diffs: ReferenceFieldDiff[] = [];
  for (const { field, label } of COMPARABLE_FIELDS) {
    const projVal = String(projectRef[field] ?? '').trim();
    const libVal = String(libRef[field as keyof SyncedLibraryReference] ?? '').trim();
    if (projVal !== libVal) {
      diffs.push({
        field,
        label,
        projectValue: projVal,
        libraryValue: libVal,
      });
    }
  }
  return diffs;
}

/**
 * Verifica se a referência da biblioteca vinculada a uma referência do projeto possui
 * uma edição mais recente que difere da cópia atual do projeto (RDJ-07.6 Cenário 1).
 */
export function getNewerLibraryVersion(
  projectRef: AcademicReference,
  libraryById: Map<string, SyncedLibraryReference>,
): { libraryRef: SyncedLibraryReference; diffs: ReferenceFieldDiff[] } | null {
  if (!projectRef.libraryRefId) return null;
  const libRef = libraryById.get(projectRef.libraryRefId);
  if (!libRef || libRef.deletedAt) return null;

  const libTime = Date.parse(libRef.updatedAt);
  const syncedTime = projectRef.librarySyncedAt ? Date.parse(projectRef.librarySyncedAt) : 0;

  if (Number.isNaN(libTime) || (!Number.isNaN(syncedTime) && libTime <= syncedTime)) {
    return null;
  }

  const diffs = computeReferenceDiffs(projectRef, libRef);
  if (diffs.length === 0) return null;

  return { libraryRef: libRef, diffs };
}

/**
 * Aplica a atualização da biblioteca na cópia do projeto, preservando o `id` da referência no
 * projeto (para não quebrar citações `<cite data-cite-id="...">`) (RDJ-07.6 Cenário 2).
 */
export function applyLibraryUpdateToProjectReference(
  projectRef: AcademicReference,
  libRef: SyncedLibraryReference,
): AcademicReference {
  return toProjectReference(libRef, projectRef.id);
}

/**
 * Mantém a versão atual do projeto sem alterar seus dados e atualiza `librarySyncedAt`,
 * fazendo o indicador sumir até a próxima edição na biblioteca (RDJ-07.6 Cenário 3).
 */
export function acknowledgeLibraryVersionOnProjectReference(
  projectRef: AcademicReference,
  libRef: SyncedLibraryReference,
): AcademicReference {
  return {
    ...projectRef,
    libraryRefId: libRef.id,
    librarySyncedAt: libRef.updatedAt,
  };
}
