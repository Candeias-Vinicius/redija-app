import { AcademicReference, ReferenceType } from '@/types/document';
import { CslItem, CslName } from './types';

const TYPE_MAP: Record<string, ReferenceType> = {
  book: 'book',
  chapter: 'book',
  'article-journal': 'article',
  article: 'article',
  'article-magazine': 'article',
  'article-newspaper': 'article',
  'paper-conference': 'article',
  thesis: 'thesis',
  webpage: 'website',
  'post-weblog': 'website',
  legislation: 'legislation',
  bill: 'legislation',
  legal_case: 'legislation',
};

function formatName(name: CslName): string {
  if (name.literal) return name.literal.trim().toUpperCase();
  const family = (name.family ?? '').trim().toUpperCase();
  const given = (name.given ?? '').trim();
  if (!family) return given;
  return given ? `${family}, ${given}` : family;
}

function datePart(date: CslItem['issued']): string {
  const year = date?.['date-parts']?.[0]?.[0];
  if (year !== undefined && year !== null && String(year).trim()) return String(year);
  const literalYear = date?.literal?.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  return literalYear ? literalYear[1] : '';
}

function formatAccessDate(date: CslItem['accessed']): string | undefined {
  const parts = date?.['date-parts']?.[0];
  if (!parts || parts.length === 0) return undefined;
  const [y, m, d] = parts.map((p) => String(p));
  if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  return y;
}

const toStr = (v: string | number | undefined): string | undefined =>
  v === undefined || v === null || String(v).trim() === '' ? undefined : String(v).trim();

/** Converte uma entrada CSL-JSON (vinda de um .bib) para o modelo de referência do Redija. */
export function cslToReference(item: CslItem): AcademicReference {
  const names = item.author?.length ? item.author : (item.editor ?? []);
  const authors = names.map(formatName).filter(Boolean).join('; ') || 'AUTOR DESCONHECIDO';
  const [mainTitle, ...subtitleParts] = (item.title ?? 'Sem título').split(':');
  const type = TYPE_MAP[item.type ?? ''] ?? 'book';

  return {
    id: crypto.randomUUID(),
    type,
    authors,
    title: mainTitle.trim(),
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(':').trim() : undefined,
    edition: toStr(item.edition),
    city: item['publisher-place']?.trim() || '',
    publisher: item.publisher?.trim() || '',
    year: datePart(item.issued),
    journal: type === 'article' ? item['container-title']?.trim() || undefined : undefined,
    volume: toStr(item.volume),
    issue: toStr(item.issue),
    pages: item.page?.replace(/--/g, '-').trim() || undefined,
    institution: type === 'thesis' ? item.publisher?.trim() || undefined : undefined,
    degree: type === 'thesis' ? item.genre?.trim() || undefined : undefined,
    url: item.URL?.trim() || undefined,
    accessDate: formatAccessDate(item.accessed),
    doi: item.DOI?.trim() || undefined,
  };
}
