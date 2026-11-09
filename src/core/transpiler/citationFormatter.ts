// =====================================================================
// RedijaApp — Formatadores Puros de Citação Multi-Norma
// =====================================================================

import { AcademicReference, CitationFormat, TemplateConfig } from '@/types/document';

export interface ShortCitationOptions {
  format?: CitationFormat | 'uppercase' | 'titlecase';
  page?: string;
  refNumber?: number;
}

export type CitationCallMode = 'parenthetical' | 'narrative';

/** Posição de uma chamada parentética dentro de um grupo NBR 10520. */
export type ParentheticalGroupRole = 'solo' | 'first' | 'middle' | 'last';

const MARKUP_ESCAPE_FOR_CITE = /[\\#*_`$@<>[\]~/=+-]/g;

function escapeCiteMarkup(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(MARKUP_ESCAPE_FOR_CITE, (ch) => `\\${ch}`)
    .replace(/^(\s*\d+)([.)])/gm, '$1\\$2');
}

const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

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
 * Extrai o primeiro sobrenome em caixa alta de uma string de autores ABNT
 * (ex: "SILVA, Roberto; SOUZA, Maria" -> "SILVA").
 */
export function getPrimarySurname(authors: string): string {
  const cleaned = authors.replace(/\bet\s+al\.?/gi, '').trim();
  const firstAuthor = cleaned.split(';')[0]?.trim() || '';
  const surname = firstAuthor.split(',')[0]?.trim() || firstAuthor;
  return surname.replace(/\.+$/, '').trim().toUpperCase();
}

export function toTitleCaseSurname(surname: string): string {
  return surname
    .toLowerCase()
    .replace(/(?:^|[\s-])(\S)/g, (m) => m.toUpperCase());
}

/**
 * Divide a string de autores em entradas individuais.
 * Aceita separadores ABNT (`;`), BibTeX (`and` / `&`) e o conectivo português (`e`)
 * entre sobrenomes soltos (ex.: "Aghajanyan e Gupta e Zettlemoyer").
 */
export function splitAuthorEntries(authors: string): string[] {
  const cleaned = authors.replace(/\bet\s+al\.?/gi, '').trim();
  if (!cleaned) return [];

  const primary = cleaned
    .split(/\s*;\s*|\s+and\s+|\s+&\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const entries: string[] = [];
  for (const part of primary) {
    // "Sobrenome e Sobrenome" (sem vírgula) → múltiplos autores
    if (!part.includes(',') && /\s+e\s+/i.test(part)) {
      const loose = part
        .split(/\s+e\s+/i)
        .map((s) => s.trim())
        .filter(Boolean);
      if (loose.length > 1 && loose.every((s) => s.split(/\s+/).length <= 3)) {
        entries.push(...loose);
        continue;
      }
    }
    entries.push(part);
  }
  return entries;
}

function extractCitationSurname(entry: string): string {
  const cleanEntry = entry.trim();
  if (!cleanEntry) return '';
  if (cleanEntry.includes(',')) {
    return cleanEntry.split(',')[0]?.trim() || cleanEntry;
  }
  // Ordem ocidental ("Armen Aghajanyan") → último token é o sobrenome
  const words = cleanEntry.split(/\s+/).filter(Boolean);
  return words[words.length - 1] || cleanEntry;
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
  const entries = splitAuthorEntries(authors);

  const surnames = entries
    .map((entry) => extractCitationSurname(entry).replace(/\.+$/, '').trim().toUpperCase())
    .filter(Boolean);

  return { surnames, hasEtAl };
}

function buildNarrativeAuthorLabel(authors: string, useAmpersand = false): string {
  const { surnames, hasEtAl } = parseCitationAuthors(authors);
  const formatted = surnames.map(toTitleCaseSurname);

  if (formatted.length === 0) return 'Autor';
  if (hasEtAl || formatted.length >= 4) {
    return `${formatted[0]} et al.`;
  }
  if (formatted.length === 1) {
    return formatted[0];
  }
  const joiner = useAmpersand ? ' & ' : ' e ';
  if (formatted.length === 2) {
    return `${formatted[0]}${joiner}${formatted[1]}`;
  }
  return `${formatted[0]}, ${formatted[1]}${joiner}${formatted[2]}`;
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
 * Formatos autor-data (ABNT / APA-like) que admitem agrupamento NBR 10520 §6.1.8:
 * várias obras no mesmo parêntese, separadas por ponto e vírgula.
 * Formatos numéricos (`ieee_numeric`, `superscript`) ficam de fora.
 */
export function isGroupableParentheticalFormat(format?: CitationFormat): boolean {
  return format !== 'ieee_numeric' && format !== 'superscript';
}

/**
 * Corpo da chamada parentética sem os parênteses externos.
 * Ex.: `SILVA, 2024` | `Silva; Souza, 2023` | `Silva & Souza 2023`.
 */
export function formatParentheticalCitationBody(
  ref: AcademicReference,
  styleOrOptions: 'uppercase' | 'titlecase' | CitationFormat | ShortCitationOptions = 'uppercase',
  pageArg?: string,
  refNumberArg?: number,
): string {
  const full = formatShortCitation(ref, styleOrOptions, pageArg, refNumberArg);
  if (full.startsWith('(') && full.endsWith(')')) {
    return full.slice(1, -1);
  }
  return full;
}

/**
 * Agrupa várias obras parentéticas no padrão NBR 10520:
 * `(AutorA, anoA; AutorB, anoB; AutorC, anoC)`.
 */
export function formatGroupedParentheticalCitations(
  items: Array<{ ref: AcademicReference; page?: string; refNumber?: number }>,
  format?: CitationFormat,
): string {
  if (items.length === 0) return '';
  if (items.length === 1) {
    const only = items[0];
    return formatShortCitation(only.ref, {
      format,
      page: only.page,
      refNumber: only.refNumber,
    });
  }

  const bodies = items.map((item) =>
    formatParentheticalCitationBody(item.ref, {
      format,
      page: item.page,
      refNumber: item.refNumber,
    }),
  );
  return `(${bodies.join('; ')})`;
}

/**
 * Segmento visual de uma citação dentro de um grupo parentético (editor TipTap).
 * `first` → `(Silva, 2020;` · `middle` → `Souza, 2021;` · `last` → `Almeida, 2022)`.
 */
export function formatParentheticalGroupSegment(
  ref: AcademicReference,
  role: ParentheticalGroupRole,
  options: ShortCitationOptions = {},
): string {
  if (role === 'solo') {
    return formatShortCitation(ref, options);
  }
  const body = formatParentheticalCitationBody(ref, options);
  if (role === 'first') return `(${body};`;
  if (role === 'middle') return `${body};`;
  return `${body})`;
}

/**
 * Gera a chamada narrativa com o autor na frase:
 * `Silva (2023)`, `Silva e Souza (2023)` ou `Silva et al. (2023, p. 42)`.
 */
export function formatNarrativeCitation(
  ref: AcademicReference,
  page?: string,
  format?: CitationFormat,
): string {
  const authorLabel = buildNarrativeAuthorLabel(ref.authors, format === 'author_date');
  const year = ref.year?.trim() || 's.d.';
  const pagePart = page?.trim() ? `, p. ${page.trim()}` : '';
  return `${authorLabel} (${year}${pagePart})`;
}

function toTypstCitationMarkup(label: string): string {
  return escapeCiteMarkup(label).replace(/\b(et\s+al\.)/gi, '#emph[et al.]');
}

/**
 * Resolve simultaneamente o rótulo de exibição na UI (editor TipTap) e a marcação
 * Typst correspondente para um token `<cite>` reativo.
 */
export function resolveCitationDisplay(
  ref: AcademicReference,
  options: {
    format?: CitationFormat;
    mode?: CitationCallMode;
    page?: string;
    refNumber?: number;
    /** Papel no agrupamento NBR 10520 de parentéticas consecutivas (somente autor-data). */
    groupRole?: ParentheticalGroupRole;
  } = {},
): { label: string; typst: string } {
  const format = options.format ?? 'abnt_upper';
  const mode: CitationCallMode = options.mode === 'narrative' ? 'narrative' : 'parenthetical';
  const cleanPage = options.page?.trim() || '';
  const refNumber = Math.max(1, options.refNumber ?? 1);
  const groupRole = options.groupRole ?? 'solo';

  if (format === 'ieee_numeric') {
    const pageSuffix = cleanPage ? `, p. ${escapeCiteMarkup(cleanPage)}` : '';
    const escapedBracket = `\\[${refNumber}${pageSuffix}\\]`;
    const plainBracket = `[${refNumber}${cleanPage ? `, p. ${cleanPage}` : ''}]`;

    if (mode === 'narrative') {
      const authorLabel = buildNarrativeAuthorLabel(ref.authors, false);
      const escapedAuthor = escapeCiteMarkup(authorLabel).replace(/\b(et\s+al\.)/gi, '#emph[et al.]');
      return {
        label: `${authorLabel} ${plainBracket}`,
        typst: `${escapedAuthor} ${escapedBracket}`,
      };
    }

    return {
      label: plainBracket,
      typst: escapedBracket,
    };
  }

  if (format === 'superscript') {
    const supUnicode = toUnicodeSuperscript(refNumber);
    const supTypst = `#super[${refNumber}]`;

    if (mode === 'narrative') {
      const authorLabel = buildNarrativeAuthorLabel(ref.authors, false);
      const escapedAuthor = escapeCiteMarkup(authorLabel).replace(/\b(et\s+al\.)/gi, '#emph[et al.]');
      return {
        label: `${authorLabel}${supUnicode}`,
        typst: `${escapedAuthor}${supTypst}`,
      };
    }

    return {
      label: supUnicode,
      typst: supTypst,
    };
  }

  if (mode === 'narrative') {
    const label = formatNarrativeCitation(ref, cleanPage || undefined, format);
    return { label, typst: toTypstCitationMarkup(label) };
  }

  const label = formatParentheticalGroupSegment(ref, groupRole, {
    format,
    page: cleanPage || undefined,
    refNumber,
  });
  return { label, typst: toTypstCitationMarkup(label) };
}

/**
 * Resolve rótulo + Typst para um grupo de parentéticas autor-data (NBR 10520 §6.1.8).
 */
export function resolveGroupedParentheticalDisplay(
  items: Array<{ ref: AcademicReference; page?: string; refNumber?: number }>,
  format?: CitationFormat,
): { label: string; typst: string } {
  const label = formatGroupedParentheticalCitations(items, format);
  return { label, typst: toTypstCitationMarkup(label) };
}
