// =====================================================================
// RedijaApp: Importador de Referências (.ris, CSL-JSON e .bib — RDJ-07.3)
// Processamento 100% local no navegador, com validação atômica e deduplicação.
// =====================================================================

import { AcademicReference, ReferenceType } from '@/types/document';
import {
  isDuplicateReference,
  normalizeDoi,
  normalizeIsbn,
} from '@/core/storage/referenceLibraryMerge';

export type ReferenceImportFormat = 'bibtex' | 'ris' | 'csl-json';
export type ReferenceImportDestination = 'project' | 'library' | 'both';

/**
 * Mapeamento documentado de tipos RIS (Zotero / Mendeley / EndNote) para tipos do RedijaApp (RDJ-07.3).
 */
export const RIS_TO_REDIJA_TYPE_MAP: Record<string, ReferenceType> = {
  JOUR: 'article',
  JFULL: 'article',
  ABST: 'article',
  INPR: 'article',
  MGZN: 'article',
  NEWS: 'article',
  CONF: 'article',
  CPAPER: 'article',
  THES: 'thesis',
  ELEC: 'website',
  WEB: 'website',
  BLOG: 'website',
  DATA: 'website',
  ICOMM: 'website',
  STAT: 'legislation',
  BILL: 'legislation',
  CASE: 'legislation',
  STAND: 'legislation',
  LEGAL: 'legislation',
  BOOK: 'book',
  CHAP: 'book',
  EDBOOK: 'book',
  RPRT: 'book',
  MANSCPT: 'book',
  DICT: 'book',
  ENCYC: 'book',
  GEN: 'book',
};

/**
 * Mapeamento documentado de tipos CSL-JSON (Zotero / Mendeley / CiteProc) para tipos do RedijaApp (RDJ-07.3).
 */
export const CSL_TO_REDIJA_TYPE_MAP: Record<string, ReferenceType> = {
  'article-journal': 'article',
  article: 'article',
  'article-magazine': 'article',
  'article-newspaper': 'article',
  'paper-conference': 'article',
  manuscript: 'article',
  thesis: 'thesis',
  webpage: 'website',
  'post-weblog': 'website',
  post: 'website',
  dataset: 'website',
  legislation: 'legislation',
  bill: 'legislation',
  legal_case: 'legislation',
  standard: 'legislation',
  regulation: 'legislation',
  book: 'book',
  chapter: 'book',
  report: 'book',
  'entry-encyclopedia': 'book',
  'entry-dictionary': 'book',
};

/**
 * Erro de validação atômica na importação de referências (RDJ-07.3 Cenário 5).
 * Indica o formato, o número da entrada afetada (1-based) e a descrição clara do problema.
 */
export class ReferenceImportError extends Error {
  readonly entryIndex?: number;
  readonly entryLabel?: string;

  constructor(message: string, options?: { entryIndex?: number; entryLabel?: string }) {
    super(message);
    this.name = 'ReferenceImportError';
    this.entryIndex = options?.entryIndex;
    this.entryLabel = options?.entryLabel;
  }
}

function formatPersonNameToAbnt(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return '';
  if (trimmed.includes(',')) {
    const [last, ...rest] = trimmed.split(',');
    const given = rest.join(',').trim();
    return given ? `${last.trim().toUpperCase()}, ${given}` : last.trim().toUpperCase();
  }
  const words = trimmed.split(/\s+/);
  if (words.length <= 1) return trimmed.toUpperCase();
  const last = words.pop()!.toUpperCase();
  return `${last}, ${words.join(' ')}`;
}

function extractFourDigitYear(raw?: string): string {
  if (!raw) return String(new Date().getFullYear());
  const match = raw.match(/\b(1[4-9]\d{2}|20\d{2})\b/);
  return match ? match[1] : raw.trim() || String(new Date().getFullYear());
}

/**
 * Faz o parse de um arquivo `.ris` (Zotero / Mendeley) de forma atômica.
 * Se o arquivo estiver corrompido ou alguma entrada não tiver título ou delimitador `ER  -`,
 * lança `ReferenceImportError` indicando a entrada afetada sem importar nada pela metade.
 */
export function parseRisReferences(risContent: string): AcademicReference[] {
  const normalized = risContent
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  interface RawRisRecord {
    startLine: number;
    tags: Map<string, string[]>;
    closed: boolean;
  }

  const records: RawRisRecord[] = [];
  let current: RawRisRecord | null = null;
  let lastTag: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const tagMatch = line.match(/^\s*([A-Z0-9]{2})\s+-\s?(.*)$/);
    if (tagMatch) {
      const tag = tagMatch[1];
      const value = tagMatch[2].trim();

      if (tag === 'TY') {
        if (current && !current.closed) {
          throw new ReferenceImportError(
            `Arquivo .ris inválido na entrada #${records.length} (linha ${current.startLine}): registro não finalizado com "ER  -" antes do próximo "TY  -". Nenhuma referência foi importada.`,
            { entryIndex: records.length },
          );
        }
        current = {
          startLine: i + 1,
          tags: new Map([[tag, value ? [value] : []]]),
          closed: false,
        };
        records.push(current);
        lastTag = tag;
        continue;
      }

      if (!current || current.closed) {
        throw new ReferenceImportError(
          `Arquivo .ris inválido na entrada #${records.length + 1} (linha ${i + 1}): encontrada a tag "${tag}  -" antes do início de registro "TY  -". Nenhuma referência foi importada.`,
          { entryIndex: records.length + 1 },
        );
      }

      if (tag === 'ER') {
        current.closed = true;
        lastTag = null;
        continue;
      }

      const list = current.tags.get(tag) ?? [];
      if (value) list.push(value);
      current.tags.set(tag, list);
      lastTag = tag;
    } else if (current && !current.closed && lastTag) {
      // Linha de continuação do campo anterior
      const list = current.tags.get(lastTag) ?? [];
      if (list.length > 0) {
        list[list.length - 1] = `${list[list.length - 1]} ${trimmed}`;
      } else {
        list.push(trimmed);
      }
      current.tags.set(lastTag, list);
    } else {
      throw new ReferenceImportError(
        `Arquivo .ris corrompido na linha ${i + 1}: conteúdo inesperado fora de um registro RIS ("${trimmed.slice(0, 50)}"). Nenhuma referência foi importada.`,
        { entryIndex: records.length + 1 },
      );
    }
  }

  if (records.length === 0) {
    throw new ReferenceImportError(
      'Arquivo .ris inválido: nenhum registro iniciado por "TY  -" foi encontrado. Nenhuma referência foi importada.',
    );
  }

  const lastRecord = records[records.length - 1];
  if (!lastRecord.closed) {
    throw new ReferenceImportError(
      `Arquivo .ris corrompido na entrada #${records.length} (linha ${lastRecord.startLine}): o registro não foi encerrado com a tag "ER  -". Nenhuma referência foi importada.`,
      { entryIndex: records.length },
    );
  }

  const results: AcademicReference[] = [];

  for (let idx = 0; idx < records.length; idx++) {
    const rec = records[idx];
    const entryNum = idx + 1;
    const first = (tag: string): string | undefined => rec.tags.get(tag)?.[0]?.trim() || undefined;
    const all = (tag: string): string[] => rec.tags.get(tag) ?? [];

    const rawType = (first('TY') ?? 'GEN').toUpperCase();
    const type: ReferenceType = RIS_TO_REDIJA_TYPE_MAP[rawType] ?? 'book';

    const rawTitle = first('TI') || first('T1') || first('CT') || first('BT');
    if (!rawTitle) {
      const idHint = first('ID') || first('DO') || `linha ${rec.startLine}`;
      throw new ReferenceImportError(
        `Erro na entrada #${entryNum} (${idHint}) do arquivo .ris: o título da obra (TI ou T1) está ausente. Nenhuma referência foi importada.`,
        { entryIndex: entryNum, entryLabel: idHint },
      );
    }

    const [mainTitle, ...subParts] = rawTitle.split(':');
    const title = mainTitle.trim() || rawTitle;
    const subtitle = subParts.length > 0 ? subParts.join(':').trim() : undefined;

    const rawAuthors = [...all('AU'), ...all('A1')];
    const fallbackEditors = rawAuthors.length > 0 ? rawAuthors : [...all('A2'), ...all('ED')];
    const authors =
      fallbackEditors.map(formatPersonNameToAbnt).filter(Boolean).join('; ') ||
      'AUTOR DESCONHECIDO';

    const year = extractFourDigitYear(first('PY') || first('Y1') || first('DA'));
    const secondaryTitle = first('T2') || first('JO') || first('JF') || first('JA') || first('J2');
    const publisher = first('PB') || (type === 'article' ? secondaryTitle : undefined) || 'Editora';
    const city = first('CY') || first('PP') || 'São Paulo';
    const volume = first('VL');
    const issue = first('IS');
    const startPage = first('SP');
    const endPage = first('EP');
    const pages =
      startPage && endPage && startPage !== endPage
        ? `${startPage}-${endPage}`
        : startPage || undefined;
    const edition = first('ET');

    const rawDoi = first('DO') || first('M3');
    const doi = normalizeDoi(rawDoi) ?? undefined;

    // SN pode conter um ISBN (10/13 dígitos) ou um ISSN (8 dígitos); só guarda em isbn se for ISBN válido
    let isbn: string | undefined;
    for (const snCandidate of all('SN')) {
      const parsedIsbn = normalizeIsbn(snCandidate);
      if (parsedIsbn) {
        isbn = parsedIsbn;
        break;
      }
    }

    const url = first('UR') || first('L2') || (doi ? `https://doi.org/${doi}` : undefined);
    const accessDate = first('Y2');

    results.push({
      id: crypto.randomUUID(),
      type,
      authors,
      title,
      subtitle,
      edition,
      city,
      publisher,
      year,
      journal: type === 'article' ? secondaryTitle : undefined,
      volume,
      issue,
      pages,
      institution: type === 'thesis' ? first('PB') || secondaryTitle : undefined,
      degree: type === 'thesis' ? first('M3') || first('U1') || secondaryTitle : undefined,
      doi,
      isbn,
      url,
      accessDate,
    });
  }

  return results;
}

interface RawCslPerson {
  family?: string;
  given?: string;
  literal?: string;
}

function formatCslPerson(person: RawCslPerson): string {
  if (person.literal && typeof person.literal === 'string') {
    return formatPersonNameToAbnt(person.literal);
  }
  const family = typeof person.family === 'string' ? person.family.trim().toUpperCase() : '';
  const given = typeof person.given === 'string' ? person.given.trim() : '';
  if (!family) return given.toUpperCase();
  return given ? `${family}, ${given}` : family;
}

function extractCslYear(issued: unknown): string {
  if (!issued || typeof issued !== 'object') return String(new Date().getFullYear());
  const obj = issued as {
    'date-parts'?: unknown;
    literal?: unknown;
    raw?: unknown;
  };
  if (Array.isArray(obj['date-parts']) && Array.isArray(obj['date-parts'][0])) {
    const y = obj['date-parts'][0][0];
    if (y !== undefined && y !== null && String(y).trim()) {
      return String(y).trim();
    }
  }
  if (typeof obj.literal === 'string') return extractFourDigitYear(obj.literal);
  if (typeof obj.raw === 'string') return extractFourDigitYear(obj.raw);
  return String(new Date().getFullYear());
}

function extractCslAccessDate(accessed: unknown): string | undefined {
  if (!accessed || typeof accessed !== 'object') return undefined;
  const obj = accessed as { 'date-parts'?: unknown; literal?: unknown };
  if (Array.isArray(obj['date-parts']) && Array.isArray(obj['date-parts'][0])) {
    const parts = obj['date-parts'][0];
    const [y, m, d] = parts.map((p: unknown) => (p !== undefined && p !== null ? String(p) : ''));
    if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
    if (y) return y;
  }
  if (typeof obj.literal === 'string' && obj.literal.trim()) return obj.literal.trim();
  return undefined;
}

/**
 * Faz o parse de um arquivo CSL-JSON (Zotero / Mendeley) de forma atômica.
 * Se o JSON for inválido ou alguma entrada estiver corrompida (sem título ou estrutura inválida),
 * lança `ReferenceImportError` indicando a entrada afetada sem importar nada pela metade.
 */
export function parseCslJsonReferences(jsonContent: string): AcademicReference[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent.replace(/^\uFEFF/, ''));
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'erro de sintaxe JSON';
    throw new ReferenceImportError(
      `Arquivo CSL-JSON corrompido (${detail}). Verifique o arquivo exportado e tente novamente. Nenhuma referência foi importada.`,
    );
  }

  const items: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && ('title' in parsed || 'type' in parsed)
      ? [parsed]
      : [];

  if (items.length === 0) {
    throw new ReferenceImportError(
      'Arquivo CSL-JSON inválido: esperado um array de referências bibliográficas. Nenhuma referência foi importada.',
    );
  }

  const results: AcademicReference[] = [];

  for (let idx = 0; idx < items.length; idx++) {
    const raw = items[idx];
    const entryNum = idx + 1;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new ReferenceImportError(
        `Erro na entrada #${entryNum} do arquivo CSL-JSON: formato de objeto inválido. Nenhuma referência foi importada.`,
        { entryIndex: entryNum },
      );
    }

    const item = raw as Record<string, unknown>;
    const entryId =
      typeof item.id === 'string' || typeof item.id === 'number'
        ? String(item.id)
        : `entrada #${entryNum}`;

    const rawTitle = typeof item.title === 'string' ? item.title.trim() : '';
    if (!rawTitle) {
      throw new ReferenceImportError(
        `Erro na entrada #${entryNum} (${entryId}) do arquivo CSL-JSON: o campo obrigatório "title" está ausente ou vazio. Nenhuma referência foi importada.`,
        { entryIndex: entryNum, entryLabel: entryId },
      );
    }

    const rawType = typeof item.type === 'string' ? item.type.trim().toLowerCase() : 'book';
    const type: ReferenceType = CSL_TO_REDIJA_TYPE_MAP[rawType] ?? 'book';

    const [mainTitle, ...subParts] = rawTitle.split(':');
    const title = mainTitle.trim() || rawTitle;
    const explicitSubtitle =
      typeof item.subtitle === 'string'
        ? item.subtitle.trim()
        : Array.isArray(item.subtitle) && typeof item.subtitle[0] === 'string'
          ? item.subtitle[0].trim()
          : '';
    const subtitle =
      explicitSubtitle || (subParts.length > 0 ? subParts.join(':').trim() : undefined);

    const rawAuthors = Array.isArray(item.author)
      ? item.author
      : Array.isArray(item.editor)
        ? item.editor
        : [];
    const authors =
      rawAuthors
        .filter((a): a is RawCslPerson => Boolean(a && typeof a === 'object'))
        .map(formatCslPerson)
        .filter(Boolean)
        .join('; ') || 'AUTOR DESCONHECIDO';

    const year = extractCslYear(item.issued);
    const containerTitle =
      typeof item['container-title'] === 'string'
        ? item['container-title'].trim()
        : Array.isArray(item['container-title']) && typeof item['container-title'][0] === 'string'
          ? item['container-title'][0].trim()
          : undefined;
    const publisher =
      typeof item.publisher === 'string' && item.publisher.trim()
        ? item.publisher.trim()
        : containerTitle || 'Editora';
    const city =
      typeof item['publisher-place'] === 'string' && item['publisher-place'].trim()
        ? item['publisher-place'].trim()
        : 'São Paulo';

    const toOptStr = (val: unknown): string | undefined =>
      typeof val === 'string' && val.trim()
        ? val.trim()
        : typeof val === 'number' && Number.isFinite(val)
          ? String(val)
          : undefined;

    const rawDoi = toOptStr(item.DOI) || toOptStr(item.doi);
    const doi = normalizeDoi(rawDoi) ?? rawDoi;

    const rawIsbn =
      typeof item.ISBN === 'string'
        ? item.ISBN
        : Array.isArray(item.ISBN) && typeof item.ISBN[0] === 'string'
          ? item.ISBN[0]
          : typeof item.isbn === 'string'
            ? item.isbn
            : undefined;
    const isbn = normalizeIsbn(rawIsbn) ?? toOptStr(rawIsbn);

    const url =
      toOptStr(item.URL) || toOptStr(item.url) || (doi ? `https://doi.org/${doi}` : undefined);

    results.push({
      id: crypto.randomUUID(),
      type,
      authors,
      title,
      subtitle,
      edition: toOptStr(item.edition),
      city,
      publisher,
      year,
      journal: type === 'article' ? containerTitle : undefined,
      volume: toOptStr(item.volume),
      issue: toOptStr(item.issue),
      pages: toOptStr(item.page)?.replace(/--/g, '-'),
      institution:
        type === 'thesis'
          ? toOptStr(item.publisher) || toOptStr(item.school) || containerTitle
          : undefined,
      degree: type === 'thesis' ? toOptStr(item.genre) : undefined,
      doi,
      isbn,
      url,
      accessDate: extractCslAccessDate(item.accessed),
    });
  }

  return results;
}

/**
 * Faz o parse de um arquivo `.bib` (BibTeX) com validação atômica (RDJ-07.3 Cenários 5 e 6)
 * e suporte adicional a ISBN.
 */
export function parseBibtexReferencesStrict(bibContent: string): AcademicReference[] {
  const cleaned = bibContent.replace(/^\uFEFF/, '').trim();
  if (!cleaned.includes('@')) {
    throw new ReferenceImportError(
      'Nenhuma entrada BibTeX (@article, @book, etc.) válida encontrada no arquivo. Nenhuma referência foi importada.',
    );
  }

  // Verifica se todas as entradas iniciadas por @tipo{ possuem chave e fechamento
  const headerMatches = [...cleaned.matchAll(/@([a-zA-Z]+)\s*\{/g)];
  if (headerMatches.length === 0) {
    throw new ReferenceImportError(
      'Arquivo BibTeX inválido: nenhuma entrada "@tipo{chave, ...}" bem formada foi encontrada. Nenhuma referência foi importada.',
    );
  }

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
    return rawAuthor
      .split(/\s+and\s+/i)
      .map(formatPersonNameToAbnt)
      .filter(Boolean)
      .join('; ');
  };

  const results: AcademicReference[] = [];

  for (let idx = 0; idx < headerMatches.length; idx++) {
    const match = headerMatches[idx];
    const entryNum = idx + 1;
    const rawType = match[1].toLowerCase();
    if (rawType === 'comment' || rawType === 'preamble' || rawType === 'string') {
      continue;
    }

    const startPos = match.index! + match[0].length;
    const nextStartPos =
      idx + 1 < headerMatches.length ? headerMatches[idx + 1].index! : cleaned.length;
    const segment = cleaned.slice(startPos, nextStartPos).trim();

    const commaIdx = segment.indexOf(',');
    const lastBraceIdx = segment.lastIndexOf('}');
    if (commaIdx === -1 || lastBraceIdx === -1 || lastBraceIdx < commaIdx) {
      const keyPreview = segment.slice(0, 24).replace(/\s+/g, ' ');
      throw new ReferenceImportError(
        `Erro de sintaxe BibTeX na entrada #${entryNum} ("@${rawType}{${keyPreview}"): chave ou fechamento "}" ausente. Nenhuma referência foi importada.`,
        { entryIndex: entryNum, entryLabel: keyPreview },
      );
    }

    const citeKey = segment.slice(0, commaIdx).trim() || `entrada #${entryNum}`;
    const body = segment.slice(commaIdx + 1, lastBraceIdx);

    const titleFull = extractField(body, 'title');
    if (!titleFull) {
      throw new ReferenceImportError(
        `Erro na entrada #${entryNum} (${citeKey}) do arquivo BibTeX: o campo obrigatório "title" está ausente. Nenhuma referência foi importada.`,
        { entryIndex: entryNum, entryLabel: citeKey },
      );
    }

    let type: ReferenceType = 'book';
    if (rawType === 'article' || rawType === 'inproceedings' || rawType === 'conference') {
      type = 'article';
    } else if (rawType === 'phdthesis' || rawType === 'mastersthesis' || rawType === 'thesis') {
      type = 'thesis';
    } else if (rawType === 'misc' || rawType === 'online' || rawType === 'electronic') {
      type = 'website';
    } else if (rawType === 'standard' || rawType === 'legislation') {
      type = 'legislation';
    }

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
    const rawDoi = extractField(body, 'doi');
    const doi = normalizeDoi(rawDoi) ?? (rawDoi || undefined);
    const rawIsbn = extractField(body, 'isbn');
    const isbn = normalizeIsbn(rawIsbn) ?? (rawIsbn || undefined);
    const url = extractField(body, 'url') || (doi ? `https://doi.org/${doi}` : '');
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
      doi,
      isbn,
      url: url || undefined,
    });
  }

  if (results.length === 0) {
    throw new ReferenceImportError(
      'Nenhuma entrada BibTeX (@article, @book, etc.) válida encontrada no texto. Nenhuma referência foi importada.',
    );
  }

  return results;
}

/**
 * Detecta o formato (.ris, CSL-JSON ou .bib) pelo nome do arquivo ou pelo conteúdo
 * e executa a importação com validação atômica.
 */
export function parseReferenceFileOrText(
  content: string,
  fileName?: string,
): { format: ReferenceImportFormat; references: AcademicReference[] } {
  const trimmed = content.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    throw new ReferenceImportError(
      'O conteúdo informado está vazio. Selecione um arquivo .bib, .ris ou CSL-JSON (.json) válido.',
    );
  }

  const lowerName = (fileName ?? '').trim().toLowerCase();

  if (lowerName.endsWith('.ris')) {
    return { format: 'ris', references: parseRisReferences(trimmed) };
  }
  if (lowerName.endsWith('.json') || lowerName.endsWith('.csl.json')) {
    return { format: 'csl-json', references: parseCslJsonReferences(trimmed) };
  }
  if (lowerName.endsWith('.bib') || lowerName.endsWith('.bibtex')) {
    return { format: 'bibtex', references: parseBibtexReferencesStrict(trimmed) };
  }

  // Detecção automática pelo conteúdo quando colado ou em .txt
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return { format: 'csl-json', references: parseCslJsonReferences(trimmed) };
  }
  if (/^\s*TY\s+-/m.test(trimmed)) {
    return { format: 'ris', references: parseRisReferences(trimmed) };
  }
  if (/@[a-zA-Z]+\s*\{/.test(trimmed)) {
    return { format: 'bibtex', references: parseBibtexReferencesStrict(trimmed) };
  }

  throw new ReferenceImportError(
    'Formato não reconhecido: envie ou cole referências nos formatos BibTeX (.bib), RIS (.ris) ou CSL-JSON (.json). Nenhuma referência foi importada.',
  );
}

export interface ReferenceImportPlan {
  toImport: AcademicReference[];
  duplicates: AcademicReference[];
  summaryText: string;
}

/**
 * Filtra duplicatas em relação ao destino (e dentro do próprio lote importado) usando as regras
 * de RDJ-07.1 e monta o resumo no formato exigido por RDJ-07.3 Cenário 4:
 * `"12 importadas, 3 duplicadas ignoradas"`.
 */
export function planReferenceImport(
  incoming: AcademicReference[],
  existingInDestination: Array<
    Pick<AcademicReference, 'title' | 'subtitle' | 'year' | 'doi' | 'isbn'>
  >,
): ReferenceImportPlan {
  const accepted: AcademicReference[] = [];
  const duplicates: AcademicReference[] = [];

  for (const candidate of incoming) {
    const existsInTarget = existingInDestination.some((ex) => isDuplicateReference(candidate, ex));
    const existsInBatch = accepted.some((acc) => isDuplicateReference(candidate, acc));

    if (existsInTarget || existsInBatch) {
      duplicates.push(candidate);
    } else {
      accepted.push(candidate);
    }
  }

  const importedLabel = accepted.length === 1 ? '1 importada' : `${accepted.length} importadas`;
  const duplicateLabel =
    duplicates.length === 1 ? '1 duplicada ignorada' : `${duplicates.length} duplicadas ignoradas`;
  const summaryText =
    duplicates.length > 0
      ? `${accepted.length} importadas, ${duplicates.length} duplicadas ignoradas`
      : `${importedLabel} com sucesso`;

  return {
    toImport: accepted,
    duplicates,
    summaryText:
      duplicates.length === 1 && accepted.length === 1
        ? `${importedLabel}, ${duplicateLabel}`
        : summaryText,
  };
}
