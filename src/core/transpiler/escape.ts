/**
 * Funções de escape para gerar código Typst seguro a partir de texto do usuário.
 *
 * Sem isso, um texto como "Custo de $50 #importante" ou um link "https://..."
 * seria interpretado como comando/fórmula/comentário pelo Typst e quebraria
 * a compilação (ou pior, executaria marcação inesperada).
 */

/**
 * Caracteres com significado especial em qualquer posição do modo de marcação
 * do Typst. Todos aceitam escape com barra invertida.
 *
 * `/` entra na lista porque `//` inicia comentário (ex.: "https://site").
 * Aspas não entram: o Typst as converte em aspas tipográficas, o que é desejado.
 */
const MARKUP_SPECIAL = /[\\#*_`$@<>[\]~/=+-]/g;

/** Escapa texto para ser inserido como conteúdo (modo de marcação) do Typst. */
export function escapeMarkup(text: string): string {
  return (
    text
      // Normaliza quebras de linha do Windows
      .replace(/\r\n?/g, '\n')
      .replace(MARKUP_SPECIAL, (ch) => `\\${ch}`)
      // "1. Texto" ou "2) Texto" no início da linha viraria lista numerada.
      .replace(/^(\s*\d+)([.)])/gm, '$1\\$2')
      // Linhas em branco dentro de um bloco viram espaço simples: cada bloco do
      // editor é um parágrafo; quebras manuais não devem criar parágrafos novos.
      .replace(/\n\s*\n/g, '\n')
  );
}

/** Escapa texto para ser usado dentro de uma string literal do Typst ("..."). */
export function escapeString(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/** Gera uma string literal Typst completa, com aspas. */
export function typstString(text: string): string {
  return `"${escapeString(text)}"`;
}

/** Gera um bloco de conteúdo Typst ([...]) a partir de texto puro. */
export function typstContent(text: string): string {
  return `[${escapeMarkup(text)}]`;
}

/**
 * Converte HTML rico (vindo do TipTap: `<strong>`, `<em>`, `<u>`, `<sup>`, `<sub>`, `<p>`, `<br>`)
 * ou texto plano em marcação Typst com escape seguro em todos os nós de texto.
 */
export function richTextToTypst(input: string): string {
  if (!input) return '';

  // Se não contiver tags HTML conhecidas, faz apenas o escape normal
  if (!/<\/?[a-z][\s\S]*>/i.test(input)) {
    return escapeMarkup(input);
  }

  const decodeEntities = (str: string): string =>
    str
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");

  // Tokeniza tags simples e texto
  const tokenRegex = /<(\/?)(strong|b|em|i|u|sup|sub|br|p)\b[^>]*>/gi;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(input)) !== null) {
    const rawText = input.slice(lastIndex, match.index);
    if (rawText) {
      result += escapeMarkup(decodeEntities(rawText));
    }

    const isClosing = match[1] === '/';
    const tag = match[2].toLowerCase();

    if (tag === 'br') {
      result += ' \\ ';
    } else if (tag === 'p') {
      if (isClosing && match.index + match[0].length < input.length) {
        result += ' ';
      }
    } else if (!isClosing) {
      if (tag === 'strong' || tag === 'b') result += '#strong[';
      else if (tag === 'em' || tag === 'i') result += '#emph[';
      else if (tag === 'u') result += '#underline[';
      else if (tag === 'sup') result += '#super[';
      else if (tag === 'sub') result += '#sub[';
    } else {
      result += ']';
    }

    lastIndex = match.index + match[0].length;
  }

  const tail = input.slice(lastIndex);
  if (tail) {
    result += escapeMarkup(decodeEntities(tail));
  }

  return result.trim();
}

/**
 * Remove tags HTML retornando texto puro (útil para títulos ou contagem de caracteres).
 */
export function stripHtmlTags(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}
