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
 * Garante balanceamento de colchetes via pilha de tags abertas e descarta tags não suportadas
 * (como <span> ou <div>) mantendo o texto interno sem poluir o Typst.
 */
export function richTextToTypst(input: string): string {
  if (!input) return '';

  // Se não contiver tags HTML conhecidas, faz apenas o escape normal
  if (!/<\/?[a-z][\s\S]*>/i.test(input)) {
    return escapeMarkup(input);
  }

  // Remove tags executáveis perigosas com conteúdo
  const sanitized = input.replace(/<(script|style|iframe)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  // Remove tags HTML não suportadas (como <span>, <div>, <font>) mantendo o texto interno
  const cleanInput = sanitized.replace(
    /<(\/?)(?!strong\b|b\b|em\b|i\b|u\b|sup\b|sub\b|br\b|p\b)[a-z][^>]*>/gi,
    '',
  );

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
  const openTags: string[] = [];

  while ((match = tokenRegex.exec(cleanInput)) !== null) {
    const rawText = cleanInput.slice(lastIndex, match.index);
    if (rawText) {
      result += escapeMarkup(decodeEntities(rawText));
    }

    const isClosing = match[1] === '/';
    const tag = match[2].toLowerCase();

    if (tag === 'br') {
      result += ' \\ ';
    } else if (tag === 'p') {
      if (isClosing && match.index + match[0].length < cleanInput.length) {
        result += ' ';
      }
    } else if (!isClosing) {
      if (tag === 'strong' || tag === 'b') {
        result += '#strong[';
        openTags.push('strong');
      } else if (tag === 'em' || tag === 'i') {
        result += '#emph[';
        openTags.push('emph');
      } else if (tag === 'u') {
        result += '#underline[';
        openTags.push('underline');
      } else if (tag === 'sup') {
        result += '#super[';
        openTags.push('super');
      } else if (tag === 'sub') {
        result += '#sub[';
        openTags.push('sub');
      }
    } else {
      // Fecha apenas se houver tag correspondente na pilha
      if (openTags.length > 0) {
        openTags.pop();
        result += ']';
      }
    }

    lastIndex = match.index + match[0].length;
  }

  const tail = cleanInput.slice(lastIndex);
  if (tail) {
    result += escapeMarkup(decodeEntities(tail));
  }

  // Fecha eventuais tags que ficaram abertas para garantir que o Typst nunca receba colchetes desbalanceados
  while (openTags.length > 0) {
    openTags.pop();
    result += ']';
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
