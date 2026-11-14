import { DocumentMetadata } from '@/types/document';

/** Lê o argumento entre chaves (com aninhamento) do primeiro `\comando{...}` encontrado. */
function commandArg(source: string, names: string[]): string | undefined {
  const re = new RegExp(String.raw`\\(?:${names.join('|')})\s*(?:\[[^\]]*\])?\s*\{`, 'g');
  for (const m of source.matchAll(re)) {
    // Ignora definições (\newcommand{\titulo}…) e linhas comentadas
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
    const cleaned = cleanLatex(out);
    if (cleaned) return cleaned;
  }
  return undefined;
}

/** Remove marcação LaTeX simples de um texto de metadado. */
export function cleanLatex(text: string): string {
  return text
    .replace(/%.*$/gm, '')
    .replace(/\\(?:par\b|newline\b|\\)\s*/g, ', ')
    .replace(/\\(?:textbf|textit|emph|textsc|textrm|MakeUppercase|uppercase)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\\([&%#_$])/g, '$1')
    .replace(/~/g, ' ')
    .replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s*,\s*(,\s*)+/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim();
}

/**
 * Extrai metadados do preâmbulo LaTeX, incluindo os comandos do abntex2
 * (\titulo, \autor, \orientador, \instituicao, \local, \data, \preambulo).
 */
export function extractLatexMetadata(source: string): Partial<DocumentMetadata> {
  const meta: Partial<DocumentMetadata> = {};
  const set = <K extends keyof DocumentMetadata>(key: K, value: string | undefined) => {
    if (value) (meta as Record<string, unknown>)[key] = value;
  };

  set('title', commandArg(source, ['titulo', 'title']));
  set('subtitle', commandArg(source, ['subtitulo', 'subtitle']));
  set('author', commandArg(source, ['autor', 'author'])?.replace(/\s+\\and\s+|\s+and\s+/g, '; '));
  set('advisor', commandArg(source, ['orientador']));
  set('coadvisor', commandArg(source, ['coorientador']));
  set('institution', commandArg(source, ['instituicao', 'institution']));
  set('course', commandArg(source, ['curso', 'programa', 'departamento']));
  set('location', commandArg(source, ['local']));
  set('nature', commandArg(source, ['preambulo']));

  const date = commandArg(source, ['data', 'date']);
  const year = date?.match(/\b(1[5-9]\d{2}|20\d{2})\b/)?.[1];
  if (year) meta.year = year;
  return meta;
}
