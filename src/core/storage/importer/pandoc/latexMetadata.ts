import { DocumentMetadata } from '@/types/document';

/**
 * Lê o argumento entre chaves (com aninhamento) do primeiro `\comando{...}` não vazio.
 * Aceita um prefixo em maiúsculas usado por modelos de instituições (`\DEELresumo`, `\UFXautor`).
 */
function commandArg(
  source: string,
  names: string[],
  { keepParagraphs = false, lineSep = ', ' }: { keepParagraphs?: boolean; lineSep?: string } = {},
): string | undefined {
  const re = new RegExp(String.raw`\\(?:[A-Z]{2,})?(?:${names.join('|')})\s*(?:\[[^\]]*\])?\s*\{`, 'g');
  for (const m of source.matchAll(re)) {
    // Ignora linhas comentadas
    const lineStart = source.lastIndexOf('\n', m.index) + 1;
    if (source.slice(lineStart, m.index).includes('%')) continue;
    let i = (m.index ?? 0) + m[0].length;
    let depth = 1;
    let out = '';
    for (; i < source.length && depth > 0; i++) {
      const ch = source[i];
      if (ch === '\\' && i + 1 < source.length) {
        out += ch + source[i + 1];
        i++;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth > 0) out += ch;
    }
    const cleaned = keepParagraphs
      ? out
          .split(/\n\s*\n/)
          .map((p) => cleanLatex(p))
          .filter(Boolean)
          .join('\n')
      : cleanLatex(out, lineSep);
    if (cleaned) return cleaned;
  }
  return undefined;
}

/** Marcador interno de quebra de linha (caractere de uso privado, nunca presente no texto). */
const BREAK = '';

/** Remove marcação LaTeX simples de um texto de metadado. `\\` e `\par` viram `lineSep`. */
export function cleanLatex(text: string, lineSep = ', '): string {
  return text
    .replace(/%.*$/gm, '')
    .replace(/\\(?:par\b|newline\b|\\)\s*/g, BREAK)
    .replace(/\\(?:textbf|textit|emph|textsc|textrm|MakeUppercase|uppercase)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\([&%#_$])/g, '$1')
    .replace(/~/g, ' ')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .split(BREAK)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(lineSep)
    .trim();
}

/** Lista de palavras-chave: aceita separadores `;`, `,`, `.` e listas numeradas ("1. A. 2. B."). */
export function parseKeywordList(text: string): string[] {
  return text
    .replace(/(^|\s)\d+[.)]\s+/g, '$1;')
    .split(/[;\n]|\.\s+|,\s+/)
    .map((k) => k.replace(/\.+$/, '').trim())
    .filter(Boolean);
}

/**
 * Extrai metadados do LaTeX: comandos do abntex2 (\titulo, \autor, \orientador, \instituicao, \local,
 * \data, \preambulo) e campos que modelos institucionais costumam guardar em comandos
 * (\resumo{}, \abstract{}, \palavraschave{}, \keywords{}, \dedicatoria{}, \agradecimentos{}, \epigrafe{}).
 */
export function extractLatexMetadata(source: string): Partial<DocumentMetadata> {
  const meta: Partial<DocumentMetadata> = {};
  const set = <K extends keyof DocumentMetadata>(key: K, value: DocumentMetadata[K] | undefined) => {
    if (value !== undefined && (!Array.isArray(value) || value.length > 0)) {
      (meta as Record<string, unknown>)[key] = value;
    }
  };

  set('title', commandArg(source, ['titulo', 'title']));
  set('subtitle', commandArg(source, ['subtitulo', 'subtitle']));
  // Vários autores costumam vir separados por `\\` ou `\and`
  const author = commandArg(source, ['autor', 'author'], { lineSep: '; ' });
  set('author', author?.replace(/\s+and\s+/g, '; '));
  set('advisor', commandArg(source, ['orientador', 'orientadora']));
  set('coadvisor', commandArg(source, ['coorientador', 'coorientadora']));
  set('institution', commandArg(source, ['instituicao', 'institution']));
  set('course', commandArg(source, ['curso', 'programa', 'departamento']));
  set('location', commandArg(source, ['local']));
  set('nature', commandArg(source, ['preambulo']));

  set('abstract', commandArg(source, ['resumo'], { keepParagraphs: true }));
  set('foreignAbstract', commandArg(source, ['abstract'], { keepParagraphs: true }));
  const kw = commandArg(source, ['palavraschave', 'palavraschaves', 'palavrasChave']);
  set('keywords', kw ? parseKeywordList(kw) : undefined);
  const fkw = commandArg(source, ['keywords']);
  set('foreignKeywords', fkw ? parseKeywordList(fkw) : undefined);
  set('dedicatory', commandArg(source, ['dedicatoria'], { keepParagraphs: true }));
  set('acknowledgments', commandArg(source, ['agradecimentos'], { keepParagraphs: true }));
  set('epigraph', commandArg(source, ['epigrafe'], { keepParagraphs: true }));

  const date = commandArg(source, ['data', 'date']);
  const year = date?.match(/\b(1[5-9]\d{2}|20\d{2})\b/)?.[1];
  if (year) meta.year = year;
  return meta;
}
