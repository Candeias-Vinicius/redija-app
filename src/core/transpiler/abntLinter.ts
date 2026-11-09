// =====================================================================
// RedijaApp — Busca Automática de Referências por DOI / ISBN e Linter ABNT
// =====================================================================

import {
  AcademicReference,
  CitationFormat,
  DocumentProject,
  TemplateConfig,
} from '@/types/document';
import { stripHtmlTags } from './escape';

export interface AbntWarning {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  description: string;
}

export interface ShortCitationOptions {
  format?: CitationFormat | 'uppercase' | 'titlecase';
  page?: string;
  refNumber?: number;
}

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
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

/**
 * Converte um número inteiro positivo para notação sobrescrita Unicode (ex: 12 -> "¹²").
 */
export function toUnicodeSuperscript(num: number): string {
  const digits = String(Math.max(1, Math.floor(num)));
  return digits
    .split('')
    .map((d) => SUPERSCRIPT_DIGITS[Number(d)] ?? d)
    .join('');
}

/**
 * Resolve o formato efetivo de citação com retrocompatibilidade para projetos
 * legados que possuem apenas `citationStyle`.
 */
export function resolveCitationFormat(config?: Partial<TemplateConfig>): CitationFormat {
  if (config?.citationFormat) return config.citationFormat;
  if (config?.citationStyle === 'titlecase') return 'abnt_titlecase';
  return 'abnt_upper';
}

/**
 * Ordena a lista de referências exatamente na mesma ordem usada pela
 * seção final de Referências do Typst, garantindo numeração [1], [2], ... consistente.
 */
export function getSortedReferences(references: AcademicReference[]): AcademicReference[] {
  return [...references].sort((a, b) =>
    a.authors.localeCompare(b.authors, 'pt-BR', { sensitivity: 'base' }),
  );
}

/**
 * Retorna um mapa `refId -> índice 1-based` após ordenação da bibliografia.
 */
export function getReferenceIndexMap(references: AcademicReference[]): Map<string, number> {
  const sorted = getSortedReferences(references);
  const map = new Map<string, number>();
  sorted.forEach((ref, idx) => {
    map.set(ref.id, idx + 1);
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
 * Extrai o primeiro sobrenome em caixa alta de uma string de autores ABNT
 * (ex: "SILVA, Roberto; SOUZA, Maria" -> "SILVA").
 */
export function getPrimarySurname(authors: string): string {
  const cleaned = authors.replace(/\bet\s+al\.?/gi, '').trim();
  const firstAuthor = cleaned.split(';')[0]?.trim() || '';
  const surname = firstAuthor.split(',')[0]?.trim() || firstAuthor;
  return surname.replace(/\.+$/, '').trim().toUpperCase();
}

function toTitleCaseSurname(surname: string): string {
  return surname
    .toLowerCase()
    .replace(/(?:^|[\s-])(\S)/g, (m) => m.toUpperCase());
}

/**
 * Extrai a lista de sobrenomes (ou nomes de entidades) de uma string de autores ABNT
 * separada por ponto e vírgula, além de identificar se contém "et al.".
 */
export function parseCitationAuthors(authors: string): {
  surnames: string[];
  hasEtAl: boolean;
} {
  const hasEtAl = /\bet\s+al\.?/i.test(authors);
  const cleaned = authors.replace(/\bet\s+al\.?/gi, '').trim();
  const entries = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  const surnames = entries
    .map((entry) => {
      const surname = entry.split(',')[0]?.trim() || entry;
      return surname.replace(/\.+$/, '').trim().toUpperCase();
    })
    .filter(Boolean);

  return { surnames, hasEtAl };
}

/**
 * Gera a citação curta conforme o sistema escolhido pelo usuário/modelo:
 * - `abnt_upper` / `uppercase`: `(SILVA, 2023)` ou `(SILVA; SOUZA, 2023)`
 * - `abnt_titlecase` / `titlecase`: `(Silva, 2023)` ou `(Silva; Souza, 2023)`
 * - `ieee_numeric`: `[1]` (ou `[1, p. 42]`)
 * - `superscript`: `¹`
 * - `author_date`: `(Silva 2023)` / `(Silva & Souza 2023)` / `(Silva et al. 2023)`
 */
export function formatShortCitation(
  ref: AcademicReference,
  styleOrOptions: 'uppercase' | 'titlecase' | CitationFormat | ShortCitationOptions = 'uppercase',
  pageArg?: string,
  refNumberArg?: number,
): string {
  const opts: ShortCitationOptions =
    typeof styleOrOptions === 'string'
      ? { format: styleOrOptions, page: pageArg, refNumber: refNumberArg }
      : styleOrOptions;

  const rawFormat = opts.format ?? 'uppercase';
  const page = opts.page ?? pageArg;
  const refNumber = Math.max(1, opts.refNumber ?? refNumberArg ?? 1);

  if (rawFormat === 'ieee_numeric') {
    const pagePart = page?.trim() ? `, p. ${page.trim()}` : '';
    return `[${refNumber}${pagePart}]`;
  }

  if (rawFormat === 'superscript') {
    return toUnicodeSuperscript(refNumber);
  }

  const { surnames, hasEtAl } = parseCitationAuthors(ref.authors);
  const isTitleCase =
    rawFormat === 'titlecase' ||
    rawFormat === 'abnt_titlecase' ||
    rawFormat === 'author_date';

  const formatted = isTitleCase ? surnames.map(toTitleCaseSurname) : surnames;
  const year = ref.year?.trim() || 's.d.';
  const pagePart = page?.trim() ? `, p. ${page.trim()}` : '';

  if (rawFormat === 'author_date') {
    let authorLabel = 'Autor';
    if (formatted.length > 0) {
      if (hasEtAl || formatted.length >= 4) {
        authorLabel = `${formatted[0]} et al.`;
      } else if (formatted.length === 2) {
        authorLabel = `${formatted[0]} & ${formatted[1]}`;
      } else {
        authorLabel = formatted.join('; ');
      }
    }
    return `(${authorLabel} ${year}${pagePart})`;
  }

  let authorLabel = isTitleCase ? 'Autor' : 'AUTOR';
  if (formatted.length > 0) {
    if (hasEtAl || formatted.length >= 4) {
      authorLabel = `${formatted[0]} et al.`;
    } else {
      authorLabel = formatted.join('; ');
    }
  }

  return `(${authorLabel}, ${year}${pagePart})`;
}

/**
 * Gera a chamada narrativa com o autor na frase:
 * `Silva (2023)`, `Silva e Souza (2023)` ou `Silva et al. (2023, p. 42)`.
 */
export function formatNarrativeCitation(ref: AcademicReference, page?: string): string {
  const { surnames, hasEtAl } = parseCitationAuthors(ref.authors);
  const formatted = surnames.map(toTitleCaseSurname);

  let authorLabel = 'Autor';
  if (formatted.length > 0) {
    if (hasEtAl || formatted.length >= 4) {
      authorLabel = `${formatted[0]} et al.`;
    } else if (formatted.length === 1) {
      authorLabel = formatted[0];
    } else if (formatted.length === 2) {
      authorLabel = `${formatted[0]} e ${formatted[1]}`;
    } else {
      authorLabel = `${formatted[0]}, ${formatted[1]} e ${formatted[2]}`;
    }
  }

  const year = ref.year?.trim() || 's.d.';
  const pagePart = page?.trim() ? `, p. ${page.trim()}` : '';
  return `${authorLabel} (${year}${pagePart})`;
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
      const surname = getPrimarySurname(ref.authors).toLowerCase().replace(/[^a-z0-9]/g, '') || 'ref';
      const key = `${surname}${ref.year || idx + 1}_${idx + 1}`;
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

/**
 * Audita cruzamento entre citações no texto (autor-data, numérico `[1]`, sobrescrito)
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
  const sortedRefs = getSortedReferences(project.references || []);
  const refCount = sortedRefs.length;

  const citedNumbers = new Set<number>();
  const numericCitationRegex = /(?:^|[\s([{"'“])\[(\d{1,3}(?:\s*,\s*\d{1,3})*)(?:,\s*p\.\s*\d+(?:-\d+)?)?\](?=[\s.,;:!?)\]}"'”]|$)/g;
  const htmlSupRegex = /<sup[^>]*>(\d{1,3}(?:\s*,\s*\d{1,3})*)<\/sup>/gi;
  const unicodeSupRegex = /([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g;

  const bodyChunks: string[] = [];

  for (const b of project.blocks) {
    if (b.type === 'code' || b.type === 'equation') continue;
    const baseText = stripHtmlTags(b.content);
    if (b.type === 'quote_long' && b.meta?.author) {
      bodyChunks.push(`${baseText} (${b.meta.author.toUpperCase()}, ${b.meta.year || ''})`);
    } else {
      bodyChunks.push(baseText);
    }

    let numMatch: RegExpExecArray | null;
    while ((numMatch = numericCitationRegex.exec(baseText)) !== null) {
      for (const n of parseNumericTokenList(numMatch[1])) {
        citedNumbers.add(n);
      }
    }

    if (citationFormat === 'superscript') {
      let supMatch: RegExpExecArray | null;
      while ((supMatch = htmlSupRegex.exec(b.content)) !== null) {
        for (const n of parseNumericTokenList(supMatch[1])) {
          citedNumbers.add(n);
        }
      }
      let uniMatch: RegExpExecArray | null;
      while ((uniMatch = unicodeSupRegex.exec(baseText)) !== null) {
        const parsed = decodeUnicodeSuperscript(uniMatch[1]);
        if (parsed !== null) citedNumbers.add(parsed);
      }
    }
  }

  const fullBodyText = bodyChunks.join(' ').toUpperCase();

  if (checkUncited) {
    sortedRefs.forEach((ref, idx) => {
      const refNum = idx + 1;
      const surname = getPrimarySurname(ref.authors);
      const isCitedByAuthor = Boolean(surname && fullBodyText.includes(surname));
      const isCitedByNumber = citedNumbers.has(refNum);
      if (!isCitedByAuthor && !isCitedByNumber) {
        warnings.push({
          id: `uncited-ref-${ref.id}`,
          severity: 'info',
          title: `Referência não citada no texto: ${surname || `[${refNum}]`} (${ref.year})`,
          description: uncitedDescription,
        });
      }
    });
  }

  // Verifica citações cujos autores ou índices numéricos não constam na lista de referências
  const registeredSurnames = new Set(
    sortedRefs.map((r) => getPrimarySurname(r.authors)).filter(Boolean),
  );
  const reportedMissingCitations = new Set<string>();
  const reportedMissingNumbers = new Set<number>();

  // Regex para capturar citações autor-data: (SOBRENOME, ANO), (Sobrenome, ANO) e (Sobrenome ANO)
  const inTextAbntRegex =
    /\(([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç\s;.&-]+?(?:\s+et\s+al\.?)?),\s*([12]\d{3}[a-z]?(?:,\s*p\.\s*\d+(?:-\d+)?)?)\)/g;
  const inTextAuthorYearRegex =
    /\(([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç.-]*(?:\s+(?:&|e|et\s+al\.?)\s+[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇa-záéíóúâêîôûãõç.-]*|\s+et\s+al\.?)?)\s+([12]\d{3}[a-z]?(?:,\s*p\.\s*\d+(?:-\d+)?)?)\)/g;

  for (const b of project.blocks) {
    if (b.type === 'code' || b.type === 'equation') continue;

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

    const text = stripHtmlTags(b.content);
    let match: RegExpExecArray | null;
    while ((match = inTextAbntRegex.exec(text)) !== null) {
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

    while ((match = inTextAuthorYearRegex.exec(text)) !== null) {
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

    let numMatch: RegExpExecArray | null;
    while ((numMatch = numericCitationRegex.exec(text)) !== null) {
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
      let supMatch: RegExpExecArray | null;
      while ((supMatch = htmlSupRegex.exec(b.content)) !== null) {
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
      let uniMatch: RegExpExecArray | null;
      while ((uniMatch = unicodeSupRegex.exec(text)) !== null) {
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
  const isArticle =
    project.templateType === 'artigo' ||
    project.templateType === 'sbc' ||
    project.templateType === 'ieee';
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
