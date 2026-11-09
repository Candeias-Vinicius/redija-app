// =====================================================================
// RedijaApp — Busca Automática de Referências por DOI / ISBN e Linter ABNT
// =====================================================================

import {
  AcademicReference,
  Block,
  DocumentProject,
  ReferenceOrdering,
} from '@/types/document';
import { stripHtmlTags } from './escape';
import {
  getPrimarySurname,
  parseCitationAuthors,
  resolveCitationFormat,
  toUnicodeSuperscript,
} from './citationFormatter';

export {
  formatGroupedParentheticalCitations,
  formatNarrativeCitation,
  formatParentheticalCitationBody,
  formatParentheticalGroupSegment,
  formatShortCitation,
  getPrimarySurname,
  isGroupableParentheticalFormat,
  parseCitationAuthors,
  resolveCitationDisplay,
  resolveCitationFormat,
  resolveGroupedParentheticalDisplay,
  splitAuthorEntries,
  toUnicodeSuperscript,
  type CitationCallMode,
  type ParentheticalGroupRole,
  type ShortCitationOptions,
} from './citationFormatter';

export interface AbntWarning {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  description: string;
}

const SUPERSCRIPT_REVERSE: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
};

const CITE_TAG_REGEX =
  /<cite\b([^>]*)>([\s\S]*?)<\/cite>|<span\b([^>]*data-cite-id=[^>]*)>([\s\S]*?)<\/span>/gi;

function extractAttr(attrs: string, name: string): string | undefined {
  const regex = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = attrs.match(regex);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : undefined;
}

/**
 * Ordena a lista de referências em ordem alfabética (ABNT NBR 6023 / APA),
 * servindo também como fallback para referências ainda não citadas.
 */
export function getSortedReferences(references: AcademicReference[]): AcademicReference[] {
  return [...references].sort((a, b) =>
    a.authors.localeCompare(b.authors, 'pt-BR', { sensitivity: 'base' }),
  );
}

function findReferenceIdByAuthor(
  references: AcademicReference[],
  rawAuthor: string,
  year?: string,
): string | undefined {
  const { surnames } = parseCitationAuthors(rawAuthor);
  const target = surnames[0] || getPrimarySurname(rawAuthor);
  if (!target) return undefined;
  const cleanYear = year?.trim().replace(/[^0-9]/g, '');
  const withYear = cleanYear
    ? references.find(
        (r) =>
          getPrimarySurname(r.authors) === target &&
          r.year?.trim().replace(/[^0-9]/g, '') === cleanYear,
      )
    : undefined;
  return (withYear ?? references.find((r) => getPrimarySurname(r.authors) === target))?.id;
}

/**
 * Ordena a bibliografia conforme o critério escolhido:
 * - `alphabetical` (padrão): ordem alfabética pelo primeiro autor.
 * - `citation_order`: ordem de primeira aparição no texto (IEEE / Vancouver),
 *   mantendo eventuais obras não citadas ao final em ordem alfabética.
 */
export function getOrderedReferences(
  references: AcademicReference[],
  ordering: ReferenceOrdering = 'alphabetical',
  blocks?: Block[],
): AcademicReference[] {
  const alphabetical = getSortedReferences(references);
  if (ordering !== 'citation_order' || !blocks || blocks.length === 0) {
    return alphabetical;
  }

  const refById = new Map(references.map((r) => [r.id, r]));
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  const addId = (id?: string) => {
    if (id && refById.has(id) && !seen.has(id)) {
      seen.add(id);
      orderedIds.push(id);
    }
  };

  const abntCiteRegex =
    /\(([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç\s;.&-]+?(?:\s+et\s+al\.?)?),\s*([12]\d{3}[a-z]?(?:,\s*p\.\s*\d+(?:-\d+)?)?)\)/g;
  const authorYearRegex =
    /\(([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç.-]*(?:\s+(?:&|e|et\s+al\.?)\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç.-]*|\s+et\s+al\.?)?)\s+([12]\d{3}[a-z]?(?:,\s*p\.\s*\d+(?:-\d+)?)?)\)/g;
  const numericRegex =
    /(?:^|[\s([{"'“])\[(\d{1,3}(?:\s*,\s*\d{1,3})*)(?:,\s*p\.\s*\d+(?:-\d+)?)?\](?=[\s.,;:!?)\]}"'”]|$)/g;

  for (const b of blocks) {
    if (b.type === 'code' || b.type === 'equation' || b.type === 'raw_typst') continue;

    const hits: Array<{ pos: number; id: string }> = [];

    // 1. Tokens estruturados <cite data-cite-id="...">
    const citeRegex = new RegExp(CITE_TAG_REGEX.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = citeRegex.exec(b.content)) !== null) {
      const attrs = m[1] ?? m[3] ?? '';
      const id = extractAttr(attrs, 'data-cite-id')?.trim();
      if (id && refById.has(id)) {
        hits.push({ pos: m.index, id });
      }
    }

    // 2. Citações legadas no texto limpo (fora de <cite>)
    const textForLegacy = stripHtmlTags(
      b.content
        .replace(CITE_TAG_REGEX, ' ')
        .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, ' ')
        .replace(/<span\b[^>]*data-inline-math=[^>]*>[\s\S]*?<\/span>/gi, ' '),
    );

    const r1 = new RegExp(abntCiteRegex.source, 'g');
    while ((m = r1.exec(textForLegacy)) !== null) {
      const id = findReferenceIdByAuthor(alphabetical, m[1].replace(/\s*&\s*/g, '; '), m[2]);
      if (id) hits.push({ pos: m.index, id });
    }

    const r2 = new RegExp(authorYearRegex.source, 'g');
    while ((m = r2.exec(textForLegacy)) !== null) {
      const id = findReferenceIdByAuthor(alphabetical, m[1].replace(/\s*&\s*/g, '; '), m[2]);
      if (id) hits.push({ pos: m.index, id });
    }

    const r3 = new RegExp(numericRegex.source, 'g');
    while ((m = r3.exec(textForLegacy)) !== null) {
      for (const n of parseNumericTokenList(m[1])) {
        const ref = alphabetical[n - 1];
        if (ref) hits.push({ pos: m.index, id: ref.id });
      }
    }

    hits.sort((a, c) => a.pos - c.pos);
    for (const hit of hits) {
      addId(hit.id);
    }

    // 3. Citação direta longa com autoria nos metadados
    if (b.type === 'quote_long' && b.meta?.author?.trim()) {
      addId(findReferenceIdByAuthor(alphabetical, b.meta.author, b.meta.year));
    }
  }

  const ordered: AcademicReference[] = orderedIds
    .map((id) => refById.get(id))
    .filter((r): r is AcademicReference => Boolean(r));

  for (const ref of alphabetical) {
    if (!seen.has(ref.id)) {
      ordered.push(ref);
    }
  }

  return ordered;
}

/**
 * Retorna um mapa `refId -> índice 1-based` após ordenação da bibliografia.
 */
export function getReferenceIndexMap(
  references: AcademicReference[],
  ordering: ReferenceOrdering = 'alphabetical',
  blocks?: Block[],
): Map<string, number> {
  const ordered = getOrderedReferences(references, ordering, blocks);
  const map = new Map<string, number>();
  ordered.forEach((ref, idx) => {
    map.set(ref.id, idx + 1);
  });
  return map;
}

/** Gera chave BibTeX / Typst label determinística e segura para uma referência. */
export function getReferenceBibKey(ref: AcademicReference, idx: number): string {
  const surname =
    getPrimarySurname(ref.authors)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '') || 'ref';
  const yearToken = (ref.year ?? '').replace(/[^a-zA-Z0-9]/g, '') || String(idx + 1);
  return `${surname}${yearToken}_${idx + 1}`;
}

/** Gera o mapa `refId -> bibKey` coerente com o arquivo `.bib` gerado em `exportToBibtex`. */
export function buildBibKeyMap(references: AcademicReference[]): Map<string, string> {
  const map = new Map<string, string>();
  references.forEach((ref, idx) => {
    map.set(ref.id, getReferenceBibKey(ref, idx));
  });
  return map;
}

/**
 * Conta a quantidade de palavras em um texto (ignorando tags HTML).
 */
export function countWords(text: string): number {
  const clean = stripHtmlTags(text).trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(Boolean).length;
}

/**
 * Busca metadados bibliográficos pelo DOI (CrossRef API) ou ISBN (Open Library API).
 */
export async function lookupByDoiOrIsbn(query: string): Promise<Partial<AcademicReference>> {
  const raw = query.trim();
  if (!raw) {
    throw new Error('Informe um código DOI ou ISBN para buscar.');
  }

  // Verifica se parece um DOI (contém "10." ou barra)
  const doiMatch = raw.match(/(10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+)/);
  if (doiMatch) {
    const doi = doiMatch[1];
    const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (!response.ok) {
      throw new Error('DOI não encontrado na base CrossRef.');
    }
    const data = await response.json();
    const msg = data?.message;
    if (!msg) {
      throw new Error('Resposta inválida da base CrossRef.');
    }

    const authorsList: string[] = Array.isArray(msg.author)
      ? msg.author.map((a: { family?: string; given?: string }) => {
          const family = (a.family || '').toUpperCase();
          const given = a.given || '';
          return family && given ? `${family}, ${given}` : family || given;
        })
      : [];

    const year =
      msg.issued?.['date-parts']?.[0]?.[0] ||
      msg.published?.['date-parts']?.[0]?.[0] ||
      new Date().getFullYear();

    const containerTitle = Array.isArray(msg['container-title'])
      ? msg['container-title'][0]
      : msg['container-title'];

    const isJournal = msg.type === 'journal-article' || Boolean(containerTitle);

    return {
      type: isJournal ? 'article' : 'book',
      authors: authorsList.join('; ') || 'AUTOR DESCONHECIDO',
      title: Array.isArray(msg.title) ? msg.title[0] || '' : msg.title || '',
      subtitle: Array.isArray(msg.subtitle) ? msg.subtitle[0] || '' : msg.subtitle || '',
      journal: containerTitle || '',
      volume: msg.volume || '',
      issue: msg.issue || '',
      pages: msg.page || '',
      publisher: msg.publisher || 'Editora',
      city: msg['publisher-location'] || 'Local',
      year: String(year),
      doi,
      url: msg.URL || `https://doi.org/${doi}`,
    };
  }

  // Caso contrário, trata como ISBN (remove traços e espaços)
  const isbn = raw.replace(/[^0-9Xx]/g, '');
  if (isbn.length !== 10 && isbn.length !== 13) {
    throw new Error('Informe um DOI válido (ex: 10.1000/xyz) ou ISBN de 10 ou 13 dígitos.');
  }

  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
  );
  if (!response.ok) {
    throw new Error('Falha ao consultar a base Open Library.');
  }

  const data = await response.json();
  const book = data[`ISBN:${isbn}`];
  if (!book) {
    throw new Error('ISBN não encontrado na base Open Library.');
  }

  const authorsList: string[] = Array.isArray(book.authors)
    ? book.authors.map((a: { name?: string }) => {
        const parts = (a.name || '').trim().split(/\s+/);
        if (parts.length <= 1) return (a.name || '').toUpperCase();
        const last = parts.pop()!.toUpperCase();
        return `${last}, ${parts.join(' ')}`;
      })
    : [];

  const yearMatch = String(book.publish_date || '').match(/\b(19\d{2}|20\d{2})\b/);

  return {
    type: 'book',
    authors: authorsList.join('; ') || 'AUTOR DESCONHECIDO',
    title: book.title || '',
    subtitle: book.subtitle || '',
    city: book.publish_places?.[0]?.name || 'São Paulo',
    publisher: book.publishers?.[0]?.name || 'Editora',
    year: yearMatch ? yearMatch[1] : String(new Date().getFullYear()),
  };
}

/**
 * Converte um arquivo ou texto BibTeX (.bib) em uma lista de AcademicReference (NBR 6023).
 */
export function parseBibtex(bibContent: string): AcademicReference[] {
  const results: AcademicReference[] = [];
  // Encontra entradas @article{..., @book{..., @phdthesis{..., @misc{...
  const entryRegex = /@([a-zA-Z]+)\s*\{\s*([^,]+),([\s\S]*?)\n\s*\}/g;

  const extractField = (body: string, fieldName: string): string => {
    const regex = new RegExp(
      `\\b${fieldName}\\s*=\\s*(?:\\{([\\s\\S]*?)\\}|"([\\s\\S]*?)"|(\\d+))(?=\\s*,|\\s*$)`,
      'i',
    );
    const match = body.match(regex);
    const raw = (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();
    return raw.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
  };

  const formatBibAuthors = (rawAuthor: string): string => {
    if (!rawAuthor) return 'AUTOR DESCONHECIDO';
    const parts = rawAuthor.split(/\s+and\s+/i);
    return parts
      .map((part) => {
        const trimmed = part.trim();
        if (trimmed.includes(',')) {
          const [last, ...rest] = trimmed.split(',');
          return `${last.trim().toUpperCase()}, ${rest.join(',').trim()}`;
        }
        const words = trimmed.split(/\s+/);
        if (words.length <= 1) return trimmed.toUpperCase();
        const last = words.pop()!.toUpperCase();
        return `${last}, ${words.join(' ')}`;
      })
      .join('; ');
  };

  let match: RegExpExecArray | null;
  while ((match = entryRegex.exec(bibContent)) !== null) {
    const rawType = match[1].toLowerCase();
    const body = match[3];

    let type: AcademicReference['type'] = 'book';
    if (rawType === 'article' || rawType === 'inproceedings' || rawType === 'conference') {
      type = 'article';
    } else if (rawType === 'phdthesis' || rawType === 'mastersthesis' || rawType === 'thesis') {
      type = 'thesis';
    } else if (rawType === 'misc' || rawType === 'online' || rawType === 'electronic') {
      type = 'website';
    }

    const titleFull = extractField(body, 'title');
    if (!titleFull) continue;

    const [mainTitle, ...subParts] = titleFull.split(':');
    const authors = formatBibAuthors(extractField(body, 'author') || extractField(body, 'editor'));
    const year = extractField(body, 'year') || String(new Date().getFullYear());
    const journal = extractField(body, 'journal') || extractField(body, 'booktitle');
    const publisher =
      extractField(body, 'publisher') ||
      extractField(body, 'organization') ||
      extractField(body, 'school') ||
      'Editora';
    const city = extractField(body, 'address') || extractField(body, 'location') || 'São Paulo';
    const volume = extractField(body, 'volume');
    const issue = extractField(body, 'number') || extractField(body, 'issue');
    const pages = extractField(body, 'pages').replace(/--/g, '-');
    const edition = extractField(body, 'edition');
    const doi = extractField(body, 'doi');
    const url = extractField(body, 'url');
    const school = extractField(body, 'school') || extractField(body, 'institution');

    results.push({
      id: crypto.randomUUID(),
      type,
      authors,
      title: mainTitle.trim(),
      subtitle: subParts.length > 0 ? subParts.join(':').trim() : undefined,
      edition: edition || undefined,
      city,
      publisher,
      year,
      journal: journal || undefined,
      volume: volume || undefined,
      issue: issue || undefined,
      pages: pages || undefined,
      institution: school || undefined,
      degree:
        rawType === 'phdthesis'
          ? 'Tese (Doutorado)'
          : rawType === 'mastersthesis'
            ? 'Dissertação (Mestrado)'
            : undefined,
      doi: doi || undefined,
      url: url || undefined,
    });
  }

  return results;
}

/**
 * Exporta a lista de referências do projeto para o formato BibTeX (.bib).
 */
export function exportToBibtex(references: AcademicReference[]): string {
  return references
    .map((ref, idx) => {
      const key = getReferenceBibKey(ref, idx);
      const bibType =
        ref.type === 'article'
          ? 'article'
          : ref.type === 'thesis'
            ? 'phdthesis'
            : ref.type === 'website'
              ? 'misc'
              : 'book';

      const fields: string[] = [
        `  author = {${ref.authors.replace(/;\s*/g, ' and ')}}`,
        `  title = {${ref.subtitle ? `${ref.title}: ${ref.subtitle}` : ref.title}}`,
        `  year = {${ref.year}}`,
      ];
      if (ref.journal) fields.push(`  journal = {${ref.journal}}`);
      if (ref.publisher) fields.push(`  publisher = {${ref.publisher}}`);
      if (ref.city) fields.push(`  address = {${ref.city}}`);
      if (ref.volume) fields.push(`  volume = {${ref.volume}}`);
      if (ref.issue) fields.push(`  number = {${ref.issue}}`);
      if (ref.pages) fields.push(`  pages = {${ref.pages}}`);
      if (ref.edition) fields.push(`  edition = {${ref.edition}}`);
      if (ref.doi) fields.push(`  doi = {${ref.doi}}`);
      if (ref.url) fields.push(`  url = {${ref.url}}`);

      return `@${bibType}{${key},\n${fields.join(',\n')}\n}`;
    })
    .join('\n\n');
}

export interface CitationAuditOptions {
  checkUncited?: boolean;
  uncitedDescription?: string;
}

function parseNumericTokenList(rawList: string): number[] {
  return rawList
    .split(',')
    .map((n) => Number.parseInt(n.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

function decodeUnicodeSuperscript(token: string): number | null {
  const normalized = token
    .split('')
    .map((ch) => SUPERSCRIPT_REVERSE[ch] ?? '')
    .join('');
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function stripNonLegacyHtmlRegions(html: string): string {
  return html
    .replace(CITE_TAG_REGEX, ' ')
    .replace(/<span\b[^>]*data-inline-math=[^>]*>[\s\S]*?<\/span>/gi, ' ')
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, ' ');
}

/**
 * Audita cruzamento entre citações no texto (tokens `<cite>`, autor-data, numérico `[1]`, sobrescrito)
 * e referências bibliográficas cadastradas no projeto.
 */
export function auditCitationsAndReferences(
  project: DocumentProject,
  options: CitationAuditOptions = {},
): AbntWarning[] {
  const warnings: AbntWarning[] = [];
  const checkUncited = options.checkUncited ?? true;
  const uncitedDescription =
    options.uncitedDescription ||
    'Pela NBR 6023, todas as obras listadas nas Referências devem ser citadas ao menos uma vez no texto.';

  const citationFormat = resolveCitationFormat(project.templateConfig);
  const ordering = project.templateConfig?.referenceOrdering ?? 'alphabetical';
  const orderedRefs = getOrderedReferences(project.references || [], ordering, project.blocks);
  const refCount = orderedRefs.length;
  const validRefIds = new Set(orderedRefs.map((r) => r.id));

  const citedNumbers = new Set<number>();
  const citedRefIds = new Set<string>();
  const reportedMissingTokens = new Set<string>();
  const numericCitationRegex = /(?:^|[\s([{"'“])\[(\d{1,3}(?:\s*,\s*\d{1,3})*)(?:,\s*p\.\s*\d+(?:-\d+)?)?\](?=[\s.,;:!?)\]}"'”]|$)/g;
  const htmlSupRegex = /<sup[^>]*>(\d{1,3}(?:\s*,\s*\d{1,3})*)<\/sup>/gi;
  const unicodeSupRegex = /([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g;

  const bodyChunks: string[] = [];

  for (const b of project.blocks) {
    if (b.type === 'code' || b.type === 'equation' || b.type === 'raw_typst') continue;

    // 1. Varre tokens estruturados <cite data-cite-id="...">
    const citeRegex = new RegExp(CITE_TAG_REGEX.source, 'gi');
    let citeMatch: RegExpExecArray | null;
    while ((citeMatch = citeRegex.exec(b.content)) !== null) {
      const attrs = citeMatch[1] ?? citeMatch[3] ?? '';
      const inner = citeMatch[2] ?? citeMatch[4] ?? '';
      const citeId = extractAttr(attrs, 'data-cite-id')?.trim();
      if (!citeId) continue;
      if (validRefIds.has(citeId)) {
        citedRefIds.add(citeId);
      } else if (!reportedMissingTokens.has(citeId)) {
        reportedMissingTokens.add(citeId);
        const label = stripHtmlTags(inner) || citeId;
        warnings.push({
          id: `missing-ref-token-${citeId}`,
          severity: 'warning',
          title: `Citação vinculada a referência removida: ${label}`,
          description:
            'Esta citação aponta para uma referência que foi excluída. Remova a chamada ou vincule-a novamente.',
        });
      }
    }

    const legacyHtml = stripNonLegacyHtmlRegions(b.content);
    const baseText = stripHtmlTags(legacyHtml);
    if (b.type === 'quote_long' && b.meta?.author) {
      bodyChunks.push(`${baseText} (${b.meta.author.toUpperCase()}, ${b.meta.year || ''})`);
    } else {
      bodyChunks.push(baseText);
    }

    const numRe = new RegExp(numericCitationRegex.source, 'g');
    let numMatch: RegExpExecArray | null;
    while ((numMatch = numRe.exec(baseText)) !== null) {
      for (const n of parseNumericTokenList(numMatch[1])) {
        citedNumbers.add(n);
      }
    }

    if (citationFormat === 'superscript') {
      const supRe = new RegExp(htmlSupRegex.source, 'gi');
      let supMatch: RegExpExecArray | null;
      while ((supMatch = supRe.exec(legacyHtml)) !== null) {
        for (const n of parseNumericTokenList(supMatch[1])) {
          citedNumbers.add(n);
        }
      }
      const uniRe = new RegExp(unicodeSupRegex.source, 'g');
      let uniMatch: RegExpExecArray | null;
      while ((uniMatch = uniRe.exec(baseText)) !== null) {
        const parsed = decodeUnicodeSuperscript(uniMatch[1]);
        if (parsed !== null) citedNumbers.add(parsed);
      }
    }
  }

  const fullBodyText = bodyChunks.join(' ').toUpperCase();

  if (checkUncited) {
    orderedRefs.forEach((ref, idx) => {
      const refNum = idx + 1;
      const surname = getPrimarySurname(ref.authors);
      const isCitedByToken = citedRefIds.has(ref.id);
      const isCitedByAuthor = Boolean(surname && fullBodyText.includes(surname));
      const isCitedByNumber = citedNumbers.has(refNum);
      if (!isCitedByToken && !isCitedByAuthor && !isCitedByNumber) {
        warnings.push({
          id: `uncited-ref-${ref.id}`,
          severity: 'info',
          title: `Referência não citada no texto: ${surname || `[${refNum}]`} (${ref.year})`,
          description: uncitedDescription,
        });
      }
    });
  }

  // Verifica citações legadas cujos autores ou índices numéricos não constam na lista de referências
  const registeredSurnames = new Set(
    orderedRefs.map((r) => getPrimarySurname(r.authors)).filter(Boolean),
  );
  const reportedMissingCitations = new Set<string>();
  const reportedMissingNumbers = new Set<number>();

  // Regex para capturar citações autor-data: (SOBRENOME, ANO), (Sobrenome, ANO) e (Sobrenome ANO)
  const inTextAbntRegex =
    /\(([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç\s;.&-]+?(?:\s+et\s+al\.?)?),\s*([12]\d{3}[a-z]?(?:,\s*p\.\s*\d+(?:-\d+)?)?)\)/g;
  const inTextAuthorYearRegex =
    /\(([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç.-]*(?:\s+(?:&|e|et\s+al\.?)\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç.-]*|\s+et\s+al\.?)?)\s+([12]\d{3}[a-z]?(?:,\s*p\.\s*\d+(?:-\d+)?)?)\)/g;

  for (const b of project.blocks) {
    if (b.type === 'code' || b.type === 'equation' || b.type === 'raw_typst') continue;

    // Citações longas estruturadas
    if (b.type === 'quote_long' && b.meta?.author?.trim()) {
      const cited = getPrimarySurname(b.meta.author);
      if (cited && !registeredSurnames.has(cited) && !reportedMissingCitations.has(cited)) {
        reportedMissingCitations.add(cited);
        warnings.push({
          id: `missing-ref-${b.id}`,
          severity: 'warning',
          title: `Citação sem referência cadastrada: (${cited}, ${b.meta.year || 's.d.'})`,
          description:
            'Este autor foi citado em uma citação direta longa, mas não está cadastrado na seção de Referências.',
        });
      }
    }

    const legacyHtml = stripNonLegacyHtmlRegions(b.content);
    const text = stripHtmlTags(legacyHtml);
    const rAbnt = new RegExp(inTextAbntRegex.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = rAbnt.exec(text)) !== null) {
      const rawAuthorPart = match[1].trim().replace(/\s*&\s*/g, '; ');
      const yearPart = match[2].trim();
      const { surnames } = parseCitationAuthors(rawAuthorPart);
      for (const s of surnames) {
        if (s && !registeredSurnames.has(s) && !reportedMissingCitations.has(s)) {
          reportedMissingCitations.add(s);
          warnings.push({
            id: `missing-ref-intext-${s.toLowerCase()}`,
            severity: 'warning',
            title: `Citação sem referência cadastrada: (${s}, ${yearPart})`,
            description:
              'Este autor foi citado no corpo do texto, mas não está cadastrado na seção de Referências.',
          });
        }
      }
    }

    const rAuthYear = new RegExp(inTextAuthorYearRegex.source, 'g');
    while ((match = rAuthYear.exec(text)) !== null) {
      const rawAuthorPart = match[1].trim().replace(/\s*&\s*/g, '; ');
      const yearPart = match[2].trim();
      const { surnames } = parseCitationAuthors(rawAuthorPart);
      for (const s of surnames) {
        if (s && !registeredSurnames.has(s) && !reportedMissingCitations.has(s)) {
          reportedMissingCitations.add(s);
          warnings.push({
            id: `missing-ref-intext-${s.toLowerCase()}`,
            severity: 'warning',
            title: `Citação sem referência cadastrada: (${s} ${yearPart})`,
            description:
              'Este autor foi citado no corpo do texto, mas não está cadastrado na seção de Referências.',
          });
        }
      }
    }

    const rNum = new RegExp(numericCitationRegex.source, 'g');
    let numMatch: RegExpExecArray | null;
    while ((numMatch = rNum.exec(text)) !== null) {
      for (const n of parseNumericTokenList(numMatch[1])) {
        if ((n < 1 || n > refCount) && !reportedMissingNumbers.has(n)) {
          reportedMissingNumbers.add(n);
          warnings.push({
            id: `missing-ref-numeric-${n}`,
            severity: 'warning',
            title: `Citação numérica [${n}] sem referência correspondente`,
            description:
              refCount === 0
                ? 'O texto utiliza citação numérica, mas ainda não há referências cadastradas.'
                : `O índice [${n}] ultrapassa o total de ${refCount} referência(s) cadastrada(s).`,
          });
        }
      }
    }

    if (citationFormat === 'superscript') {
      const rSup = new RegExp(htmlSupRegex.source, 'gi');
      let supMatch: RegExpExecArray | null;
      while ((supMatch = rSup.exec(legacyHtml)) !== null) {
        for (const n of parseNumericTokenList(supMatch[1])) {
          if ((n < 1 || n > refCount) && !reportedMissingNumbers.has(n)) {
            reportedMissingNumbers.add(n);
            warnings.push({
              id: `missing-ref-sup-${n}`,
              severity: 'warning',
              title: `Citação sobrescrita ${toUnicodeSuperscript(n)} sem referência correspondente`,
              description: `O marcador sobrescrito ${n} não possui obra correspondente na lista de Referências.`,
            });
          }
        }
      }
      const rUni = new RegExp(unicodeSupRegex.source, 'g');
      let uniMatch: RegExpExecArray | null;
      while ((uniMatch = rUni.exec(text)) !== null) {
        const n = decodeUnicodeSuperscript(uniMatch[1]);
        if (n !== null && (n < 1 || n > refCount) && !reportedMissingNumbers.has(n)) {
          reportedMissingNumbers.add(n);
          warnings.push({
            id: `missing-ref-sup-${n}`,
            severity: 'warning',
            title: `Citação sobrescrita ${uniMatch[1]} sem referência correspondente`,
            description: `O marcador sobrescrito ${n} não possui obra correspondente na lista de Referências.`,
          });
        }
      }
    }
  }

  return warnings;
}

/**
 * Executa a verificação normativa ABNT sobre o documento:
 * - Resumo fora da faixa recomendada de 150–500 palavras (NBR 6028)
 * - Figuras ou tabelas sem legenda ou fonte (NBR 14724)
 * - Citações no texto sem referência correspondente na lista final (NBR 10520 / NBR 6023)
 * - Referências cadastradas mas nunca citadas no corpo do texto
 */
export function runAbntLinter(project: DocumentProject): AbntWarning[] {
  const warnings: AbntWarning[] = [];

  // 1. Contagem de palavras do resumo (NBR 6028: 150 a 500 palavras para TCC/monografias, 100 a 250 para artigos)
  const effectiveTemplate =
    project.templateConfig?.preset === 'sbc' ||
    project.templateConfig?.preset === 'ieee' ||
    project.templateConfig?.preset === 'poster' ||
    project.templateConfig?.preset === 'universe_custom'
      ? project.templateConfig.preset
      : project.templateType;
  const isArticle =
    effectiveTemplate === 'artigo' ||
    effectiveTemplate === 'sbc' ||
    effectiveTemplate === 'ieee';
  const minWords = isArticle ? 100 : 150;
  const maxWords = isArticle ? 250 : 500;

  const abstractWords = countWords(project.metadata.abstract);
  if (abstractWords === 0) {
    warnings.push({
      id: 'abstract-empty',
      severity: 'warning',
      title: 'Resumo em branco (NBR 6028)',
      description: 'O trabalho não possui texto de resumo preenchido.',
    });
  } else if (abstractWords < minWords || abstractWords > maxWords) {
    const rangeText = isArticle
      ? 'entre 100 e 250 palavras para artigos de periódicos'
      : 'entre 150 e 500 palavras para trabalhos acadêmicos (e 100 a 250 para artigos)';
    warnings.push({
      id: 'abstract-length',
      severity: 'info',
      title: `Resumo com ${abstractWords} palavras (NBR 6028)`,
      description: `A ABNT NBR 6028 recomenda ${rangeText}.`,
    });
  }

  // 2. Palavras-chave obrigatórias (NBR 6028 / NBR 14724)
  const validKeywords = (project.metadata.keywords || []).map((k) => k.trim()).filter(Boolean);
  if (validKeywords.length === 0) {
    warnings.push({
      id: 'keywords-empty',
      severity: 'warning',
      title: 'Palavras-chave ausentes (NBR 6028)',
      description: 'O trabalho acadêmico deve conter palavras-chave representativas do conteúdo do documento.',
    });
  }

  // 3. Figuras e Tabelas sem legenda ou fonte (NBR 14724)
  project.blocks.forEach((b, idx) => {
    if (b.type === 'image') {
      if (!b.meta?.caption?.trim() || !b.meta?.source?.trim()) {
        warnings.push({
          id: `fig-meta-${b.id}`,
          severity: 'warning',
          title: `Figura no bloco #${idx + 1} incompleta (NBR 14724)`,
          description: 'Toda ilustração deve possuir título/legenda na parte superior e fonte na parte inferior.',
        });
      }
    }
    if (b.type === 'table' || b.type === 'box') {
      const label = b.type === 'box' ? 'Quadro' : 'Tabela';
      if (!b.meta?.caption?.trim() || !b.meta?.source?.trim()) {
        warnings.push({
          id: `tbl-meta-${b.id}`,
          severity: 'warning',
          title: `${label} no bloco #${idx + 1} incompleto (NBR 14724)`,
          description: `Todo ${label.toLowerCase()} deve possuir título na parte superior e fonte na parte inferior.`,
        });
      }
    }
  });

  // 4. Lista de Referências vazia (NBR 6023)
  if (!project.references || project.references.length === 0) {
    warnings.push({
      id: 'references-empty',
      severity: 'warning',
      title: 'Lista de Referências vazia (NBR 6023)',
      description: 'O trabalho acadêmico deve conter referências bibliográficas cadastradas.',
    });
  }

  // 5. Cruzamento de Citações e Referências (NBR 10520 / NBR 6023)
  warnings.push(...auditCitationsAndReferences(project));

  return warnings;
}
