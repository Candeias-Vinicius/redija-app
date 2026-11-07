// =====================================================================
// RedijaApp — Busca Automática de Referências por DOI / ISBN e Linter ABNT
// =====================================================================

import { AcademicReference, DocumentProject } from '@/types/document';
import { stripHtmlTags } from './escape';

export interface AbntWarning {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  description: string;
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
  const firstAuthor = authors.split(';')[0]?.trim() || '';
  const surname = firstAuthor.split(',')[0]?.trim() || firstAuthor;
  return surname.toUpperCase();
}

/**
 * Gera a citação curta autor-data no padrão ABNT NBR 10520: `(SILVA, 2023)` ou `(Silva, 2023)`.
 */
export function formatShortCitation(
  ref: AcademicReference,
  style: 'uppercase' | 'titlecase' = 'uppercase',
  page?: string,
): string {
  const rawSurname = getPrimarySurname(ref.authors);
  const surname =
    style === 'titlecase'
      ? rawSurname.toLowerCase().replace(/(?:^|[\s-])(\S)/g, (m) => m.toUpperCase())
      : rawSurname;
  const year = ref.year?.trim() || 's.d.';
  const pagePart = page?.trim() ? `, p. ${page.trim()}` : '';
  return `(${surname}, ${year}${pagePart})`;
}

/**
 * Gera a chamada narrativa com o autor na frase: `Silva (2023)` ou `Silva (2023, p. 42)`.
 */
export function formatNarrativeCitation(ref: AcademicReference, page?: string): string {
  const rawSurname = getPrimarySurname(ref.authors);
  const surname = rawSurname
    .toLowerCase()
    .replace(/(?:^|[\s-])(\S)/g, (m) => m.toUpperCase());
  const year = ref.year?.trim() || 's.d.';
  const pagePart = page?.trim() ? `, p. ${page.trim()}` : '';
  return `${surname} (${year}${pagePart})`;
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

/**
 * Executa a verificação normativa ABNT sobre o documento:
 * - Resumo fora da faixa recomendada de 150–500 palavras (NBR 6028)
 * - Figuras ou tabelas sem legenda ou fonte (NBR 14724)
 * - Citações no texto sem referência correspondente na lista final (NBR 10520 / NBR 6023)
 * - Referências cadastradas mas nunca citadas no corpo do texto
 */
export function runAbntLinter(project: DocumentProject): AbntWarning[] {
  const warnings: AbntWarning[] = [];

  // 1. Contagem de palavras do resumo (NBR 6028: 150 a 500 palavras para TCC/monografias)
  const abstractWords = countWords(project.metadata.abstract);
  if (abstractWords === 0) {
    warnings.push({
      id: 'abstract-empty',
      severity: 'warning',
      title: 'Resumo em branco (NBR 6028)',
      description: 'O trabalho não possui texto de resumo preenchido.',
    });
  } else if (abstractWords < 150 || abstractWords > 500) {
    warnings.push({
      id: 'abstract-length',
      severity: 'info',
      title: `Resumo com ${abstractWords} palavras (NBR 6028)`,
      description:
        'A ABNT NBR 6028 recomenda entre 150 e 500 palavras para trabalhos acadêmicos (e 100 a 250 para artigos).',
    });
  }

  // 2. Figuras e Tabelas sem legenda ou fonte
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
    if (b.type === 'table') {
      if (!b.meta?.caption?.trim() || !b.meta?.source?.trim()) {
        warnings.push({
          id: `tbl-meta-${b.id}`,
          severity: 'warning',
          title: `Tabela no bloco #${idx + 1} incompleta (NBR 14724)`,
          description: 'Toda tabela deve possuir título na parte superior e fonte na parte inferior.',
        });
      }
    }
  });

  // 3. Cruzamento de Citações e Referências (NBR 10520 / NBR 6023)
  const fullBodyText = project.blocks
    .map((b) => {
      const base = stripHtmlTags(b.content);
      if (b.type === 'quote_long' && b.meta?.author) {
        return `${base} (${b.meta.author.toUpperCase()}, ${b.meta.year || ''})`;
      }
      return base;
    })
    .join(' ')
    .toUpperCase();

  for (const ref of project.references) {
    const surname = getPrimarySurname(ref.authors);
    if (surname && !fullBodyText.includes(surname)) {
      warnings.push({
        id: `uncited-ref-${ref.id}`,
        severity: 'info',
        title: `Referência não citada no texto: ${surname} (${ref.year})`,
        description:
          'Pela NBR 6023, todas as obras listadas nas Referências devem ser citadas ao menos uma vez no texto.',
      });
    }
  }

  // Verifica citações longas cujos autores não constam na lista de referências
  const registeredSurnames = new Set(
    project.references.map((r) => getPrimarySurname(r.authors)).filter(Boolean),
  );

  for (const b of project.blocks) {
    if (b.type === 'quote_long' && b.meta?.author?.trim()) {
      const cited = b.meta.author.trim().toUpperCase();
      if (!registeredSurnames.has(cited)) {
        warnings.push({
          id: `missing-ref-${b.id}`,
          severity: 'warning',
          title: `Citação sem referência cadastrada: (${cited}, ${b.meta.year || 's.d.'})`,
          description:
            'Este autor foi citado em uma citação direta longa, mas não está cadastrado na seção de Referências.',
        });
      }
    }
  }

  return warnings;
}
