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
 * Gera a citação curta autor-data no padrão ABNT NBR 10520: `(SILVA, 2023)`.
 */
export function formatShortCitation(ref: AcademicReference): string {
  const surname = getPrimarySurname(ref.authors);
  const year = ref.year?.trim() || 's.d.';
  return `(${surname}, ${year})`;
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
