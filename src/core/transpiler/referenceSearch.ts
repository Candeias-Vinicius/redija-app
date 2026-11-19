// =====================================================================
// RedijaApp: Busca de referências por título ou autor (RDJ-07.2)
// Consulta simultaneamente OpenAlex e Crossref direto do navegador (CORS),
// sem chave de API e sem enviar nenhum dado pessoal do usuário.
// =====================================================================

import { AcademicReference, ReferenceType } from '@/types/document';
import {
  isDuplicateReference,
  normalizeDoi,
  normalizeIsbn,
} from '@/core/storage/referenceLibraryMerge';

/** Debounce mínimo exigido por RDJ-07.2 (400 ms sem digitação). */
export const REFERENCE_SEARCH_DEBOUNCE_MS = 400;

/**
 * E-mail institucional do projeto para a "Polite Pool" da OpenAlex e da Crossref.
 * Nunca utiliza o e-mail pessoal do usuário logado (RDJ-07.2).
 */
export const PROJECT_API_CONTACT_EMAIL = 'contato.redija@gmail.com';

export interface ReferenceSearchResult {
  id: string;
  source: 'openalex' | 'crossref' | 'merged';
  type: ReferenceType;
  authors: string;
  title: string;
  subtitle?: string;
  year: string;
  /** Veículo de publicação (periódico, conferência ou editora) para exibição na lista de resultados. */
  venue?: string;
  journal?: string;
  publisher?: string;
  city?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  institution?: string;
  degree?: string;
  doi?: string;
  isbn?: string;
  url?: string;
}

function formatAuthorNameToAbnt(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  if (trimmed.includes(',')) {
    const [last, ...rest] = trimmed.split(',');
    const given = rest.join(',').trim();
    return given ? `${last.trim().toUpperCase()}, ${given}` : last.trim().toUpperCase();
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed.toUpperCase();
  const last = parts.pop()!.toUpperCase();
  return `${last}, ${parts.join(' ')}`;
}

function mapOpenAlexType(rawType?: string): ReferenceType {
  switch ((rawType ?? '').toLowerCase()) {
    case 'article':
    case 'journal-article':
    case 'proceedings-article':
    case 'preprint':
    case 'review':
      return 'article';
    case 'dissertation':
    case 'thesis':
      return 'thesis';
    case 'standard':
      return 'legislation';
    case 'book':
    case 'book-chapter':
    case 'monograph':
    case 'edited-book':
      return 'book';
    default:
      return 'article';
  }
}

function mapCrossrefType(rawType?: string, hasContainer?: boolean): ReferenceType {
  switch ((rawType ?? '').toLowerCase()) {
    case 'journal-article':
    case 'proceedings-article':
    case 'posted-content':
      return 'article';
    case 'dissertation':
      return 'thesis';
    case 'standard':
      return 'legislation';
    case 'book':
    case 'book-chapter':
    case 'monograph':
    case 'edited-book':
    case 'reference-book':
      return 'book';
    default:
      return hasContainer ? 'article' : 'book';
  }
}

interface OpenAlexWork {
  id?: string;
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  type?: string | null;
  authorships?: Array<{
    author?: { display_name?: string | null };
  }>;
  primary_location?: {
    landing_page_url?: string | null;
    source?: {
      display_name?: string | null;
      host_organization_name?: string | null;
      type?: string | null;
    } | null;
  } | null;
  biblio?: {
    volume?: string | null;
    issue?: string | null;
    first_page?: string | null;
    last_page?: string | null;
  } | null;
  ids?: {
    doi?: string | null;
    isbn?: string | string[] | null;
  } | null;
}

export function parseOpenAlexWork(work: OpenAlexWork, index = 0): ReferenceSearchResult | null {
  const rawTitle = (work.display_name || work.title || '').trim();
  if (!rawTitle) return null;

  const [mainTitle, ...subParts] = rawTitle.split(':');
  const title = mainTitle.trim() || rawTitle;
  const subtitle = subParts.length > 0 ? subParts.join(':').trim() : undefined;

  const authorsList = (work.authorships ?? [])
    .map((a) => formatAuthorNameToAbnt(a.author?.display_name ?? ''))
    .filter(Boolean);
  const authors = authorsList.join('; ') || 'AUTOR DESCONHECIDO';

  const year = work.publication_year
    ? String(work.publication_year)
    : String(new Date().getFullYear());

  const type = mapOpenAlexType(work.type ?? undefined);
  const sourceName = work.primary_location?.source?.display_name?.trim() || undefined;
  const hostOrg = work.primary_location?.source?.host_organization_name?.trim() || undefined;

  const firstPage = work.biblio?.first_page?.trim();
  const lastPage = work.biblio?.last_page?.trim();
  const pages =
    firstPage && lastPage && firstPage !== lastPage
      ? `${firstPage}-${lastPage}`
      : firstPage || undefined;

  const rawDoi = work.doi || work.ids?.doi || undefined;
  const doi = normalizeDoi(rawDoi) ?? undefined;

  const rawIsbn = Array.isArray(work.ids?.isbn) ? work.ids?.isbn[0] : work.ids?.isbn;
  const isbn = normalizeIsbn(rawIsbn) ?? undefined;

  const url =
    work.primary_location?.landing_page_url?.trim() || (doi ? `https://doi.org/${doi}` : undefined);

  const venue = sourceName || hostOrg;

  return {
    id: work.id || `openalex-${index}-${doi ?? title}`,
    source: 'openalex',
    type,
    authors,
    title,
    subtitle,
    year,
    venue,
    journal: type === 'article' ? sourceName : undefined,
    publisher: hostOrg || (type === 'book' ? sourceName : undefined),
    volume: work.biblio?.volume?.trim() || undefined,
    issue: work.biblio?.issue?.trim() || undefined,
    pages,
    institution: type === 'thesis' ? sourceName || hostOrg : undefined,
    doi,
    isbn,
    url,
  };
}

interface CrossrefWork {
  DOI?: string;
  URL?: string;
  type?: string;
  title?: string[];
  subtitle?: string[];
  author?: Array<{ family?: string; given?: string; name?: string }>;
  issued?: { 'date-parts'?: Array<Array<number | string>> };
  published?: { 'date-parts'?: Array<Array<number | string>> };
  'container-title'?: string[];
  publisher?: string;
  'publisher-location'?: string;
  volume?: string;
  issue?: string;
  page?: string;
  ISBN?: string[];
  institution?: Array<{ name?: string }> | { name?: string };
}

export function parseCrossrefWork(item: CrossrefWork, index = 0): ReferenceSearchResult | null {
  const rawTitle = (Array.isArray(item.title) ? item.title[0] : '')?.trim() || '';
  if (!rawTitle) return null;

  const rawSubtitle = (Array.isArray(item.subtitle) ? item.subtitle[0] : '')?.trim() || '';
  let title = rawTitle;
  let subtitle: string | undefined = rawSubtitle || undefined;

  if (!subtitle && rawTitle.includes(':')) {
    const [main, ...rest] = rawTitle.split(':');
    title = main.trim() || rawTitle;
    subtitle = rest.join(':').trim() || undefined;
  }

  const authorsList = (item.author ?? [])
    .map((a) => {
      if (a.family) {
        const family = a.family.trim().toUpperCase();
        const given = (a.given ?? '').trim();
        return given ? `${family}, ${given}` : family;
      }
      if (a.name) return a.name.trim().toUpperCase();
      return '';
    })
    .filter(Boolean);
  const authors = authorsList.join('; ') || 'AUTOR DESCONHECIDO';

  const yearRaw =
    item.issued?.['date-parts']?.[0]?.[0] ??
    item.published?.['date-parts']?.[0]?.[0] ??
    new Date().getFullYear();
  const year = String(yearRaw);

  const containerTitle = (
    Array.isArray(item['container-title']) ? item['container-title'][0] : ''
  )?.trim();
  const type = mapCrossrefType(item.type, Boolean(containerTitle));
  const publisher = item.publisher?.trim() || undefined;
  const city = item['publisher-location']?.trim() || undefined;
  const doi = normalizeDoi(item.DOI) ?? undefined;
  const isbn =
    Array.isArray(item.ISBN) && item.ISBN.length > 0
      ? (normalizeIsbn(item.ISBN[0]) ?? undefined)
      : undefined;
  const institutionName = Array.isArray(item.institution)
    ? item.institution[0]?.name?.trim()
    : item.institution?.name?.trim();

  const venue = containerTitle || publisher || institutionName;

  return {
    id: `crossref-${index}-${doi ?? title}`,
    source: 'crossref',
    type,
    authors,
    title,
    subtitle,
    year,
    venue,
    journal: type === 'article' ? containerTitle || undefined : undefined,
    publisher,
    city,
    volume: item.volume?.trim() || undefined,
    issue: item.issue?.trim() || undefined,
    pages: item.page?.replace(/--/g, '-').trim() || undefined,
    institution: type === 'thesis' ? institutionName || publisher : undefined,
    doi,
    isbn,
    url: item.URL?.trim() || (doi ? `https://doi.org/${doi}` : undefined),
  };
}

/**
 * Mescla dois resultados equivalentes (ex.: mesma obra no OpenAlex e no Crossref),
 * preenchendo campos ausentes sem duplicar a entrada na lista (RDJ-07.2 Cenário 3).
 */
export function mergeSearchResults(
  primary: ReferenceSearchResult,
  secondary: ReferenceSearchResult,
): ReferenceSearchResult {
  return {
    id: primary.id,
    source: primary.source === secondary.source ? primary.source : 'merged',
    type: primary.type || secondary.type,
    authors:
      primary.authors && primary.authors !== 'AUTOR DESCONHECIDO'
        ? primary.authors
        : secondary.authors,
    title: primary.title || secondary.title,
    subtitle: primary.subtitle || secondary.subtitle,
    year: primary.year || secondary.year,
    venue: primary.venue || secondary.venue,
    journal: primary.journal || secondary.journal,
    publisher: primary.publisher || secondary.publisher,
    city: primary.city || secondary.city,
    volume: primary.volume || secondary.volume,
    issue: primary.issue || secondary.issue,
    pages: primary.pages || secondary.pages,
    institution: primary.institution || secondary.institution,
    degree: primary.degree || secondary.degree,
    doi: primary.doi || secondary.doi,
    isbn: primary.isbn || secondary.isbn,
    url: primary.url || secondary.url,
  };
}

/**
 * Deduplica resultados vindos de múltiplas bases acadêmicas usando as mesmas regras de RDJ-07.1
 * (DOI, ISBN ou título normalizado + ano).
 */
export function deduplicateSearchResults(items: ReferenceSearchResult[]): ReferenceSearchResult[] {
  const unique: ReferenceSearchResult[] = [];
  for (const item of items) {
    const existingIdx = unique.findIndex((u) => isDuplicateReference(u, item));
    if (existingIdx === -1) {
      unique.push(item);
    } else {
      unique[existingIdx] = mergeSearchResults(unique[existingIdx], item);
    }
  }
  return unique;
}

async function fetchOpenAlex(
  query: string,
  signal?: AbortSignal,
): Promise<ReferenceSearchResult[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=10&mailto=${encodeURIComponent(PROJECT_API_CONTACT_EMAIL)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`OpenAlex HTTP ${res.status}`);
  }
  const data = (await res.json()) as { results?: OpenAlexWork[] };
  return (data.results ?? [])
    .map((w, idx) => parseOpenAlexWork(w, idx))
    .filter((r): r is ReferenceSearchResult => r !== null);
}

async function fetchCrossref(
  query: string,
  signal?: AbortSignal,
): Promise<ReferenceSearchResult[]> {
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(query)}&rows=10&mailto=${encodeURIComponent(PROJECT_API_CONTACT_EMAIL)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`Crossref HTTP ${res.status}`);
  }
  const data = (await res.json()) as { message?: { items?: CrossrefWork[] } };
  return (data.message?.items ?? [])
    .map((w, idx) => parseCrossrefWork(w, idx))
    .filter((r): r is ReferenceSearchResult => r !== null);
}

/**
 * Busca referências por título ou autor consultando OpenAlex e Crossref em paralelo.
 * - Desduplica obras presentes nas duas bases (RDJ-07.2 Cenário 3).
 * - Se uma base falhar e a outra responder, retorna os resultados da base ativa.
 * - Se o navegador estiver offline ou ambas as bases falharem, lança erro claro em português (RDJ-07.2 Cenário 5).
 */
export async function searchReferencesByTitleOrAuthor(
  query: string,
  options: { signal?: AbortSignal } = {},
): Promise<ReferenceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(
      'Você está sem conexão com a internet. Conecte-se para buscar obras online ou preencha os campos manualmente.',
    );
  }

  const [openAlexOutcome, crossrefOutcome] = await Promise.allSettled([
    fetchOpenAlex(trimmed, options.signal),
    fetchCrossref(trimmed, options.signal),
  ]);

  if (options.signal?.aborted) {
    throw new DOMException('Busca cancelada', 'AbortError');
  }

  const openAlexSucceeded = openAlexOutcome.status === 'fulfilled';
  const crossrefSucceeded = crossrefOutcome.status === 'fulfilled';

  if (!openAlexSucceeded && !crossrefSucceeded) {
    throw new Error(
      'Não foi possível consultar as bases acadêmicas (OpenAlex e Crossref) no momento. Verifique sua conexão ou cadastre a referência manualmente.',
    );
  }

  const combined: ReferenceSearchResult[] = [
    ...(openAlexSucceeded ? openAlexOutcome.value : []),
    ...(crossrefSucceeded ? crossrefOutcome.value : []),
  ];

  return deduplicateSearchResults(combined);
}

/**
 * Converte um resultado da busca para `Partial<AcademicReference>` pronto para preencher o formulário.
 */
export function searchResultToReferenceFields(
  result: ReferenceSearchResult,
): Partial<AcademicReference> {
  return {
    type: result.type,
    authors: result.authors,
    title: result.title,
    subtitle: result.subtitle || '',
    year: result.year,
    journal: result.journal || (result.type === 'article' ? result.venue || '' : ''),
    publisher:
      result.publisher || (result.type !== 'article' ? result.venue || 'Editora' : 'Editora'),
    city: result.city || 'São Paulo',
    volume: result.volume || '',
    issue: result.issue || '',
    pages: result.pages || '',
    institution: result.institution || '',
    degree: result.degree || '',
    doi: result.doi || '',
    isbn: result.isbn || '',
    url: result.url || '',
  };
}
