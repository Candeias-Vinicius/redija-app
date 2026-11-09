import type { AcademicReference, BibliographyEngine, CitationFormat } from '@/types/document';
import { resolveCitationDisplay } from './citationFormatter';

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

export interface RichTextTypstContext {
  references?: AcademicReference[];
  refIndexMap?: Map<string, number>;
  citationFormat?: CitationFormat;
  bibliographyEngine?: BibliographyEngine;
  bibKeyMap?: Map<string, string>;
}

/** Verifica rapidamente se uma string HTML contém marcação rica ou nós estruturados suportados pelo editor. */
export function hasRichHtmlMarkup(html: string): boolean {
  return /<\/?(strong|b|em|i|u|s|sup|sub|code|a|cite)\b|<span\b[^>]*data-(?:cite-id|inline-math)/i.test(
    html,
  );
}

export function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'");
}

/**
 * Valida URLs para links clicáveis no Typst, permitindo exclusivamente
 * protocolos seguros (`https:`, `http:`, `mailto:`).
 */
export function sanitizeLinkUrl(rawHref: string): string | null {
  const trimmed = decodeHtmlEntities(rawHref).trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

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

function extractHtmlAttribute(attrs: string, name: string): string | undefined {
  const regex = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = attrs.match(regex);
  if (!match) return undefined;
  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '');
}

function convertSimpleHtmlToTypst(html: string): string {
  // Remove tags HTML não suportadas (como <span>, <div>, <font>) mantendo o texto interno
  const cleanInput = html.replace(
    /<(\/?)(?!strong\b|b\b|em\b|i\b|u\b|s\b|sup\b|sub\b|br\b|p\b)[a-z][^>]*>/gi,
    '',
  );

  // Tokeniza tags simples e texto
  const tokenRegex = /<(\/?)(strong|b|em|i|u|s|sup|sub|br|p)\b[^>]*>/gi;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const openTags: string[] = [];

  while ((match = tokenRegex.exec(cleanInput)) !== null) {
    const rawText = cleanInput.slice(lastIndex, match.index);
    if (rawText) {
      result += escapeMarkup(decodeHtmlEntities(rawText));
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
      } else if (tag === 's') {
        result += '#strike[';
        openTags.push('strike');
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
    result += escapeMarkup(decodeHtmlEntities(tail));
  }

  // Fecha eventuais tags que ficaram abertas para garantir que o Typst nunca receba colchetes desbalanceados
  while (openTags.length > 0) {
    openTags.pop();
    result += ']';
  }

  return result;
}

/**
 * Converte HTML rico (vindo do TipTap: `<strong>`, `<em>`, `<u>`, `<s>`, `<code>`, `<sup>`, `<sub>`,
 * `<a href>`, nós `<cite data-cite-id>`, matemática inline `<span data-inline-math>`, `<p>`, `<br>`)
 * ou texto plano em marcação Typst com escape seguro em todos os nós de texto.
 * Garante balanceamento de colchetes via pilha de tags abertas e descarta tags não suportadas
 * (como <span> genérico ou <div>) mantendo o texto interno sem poluir o Typst.
 */
export function richTextToTypst(input: string, ctx?: RichTextTypstContext): string {
  if (!input) return '';

  // Se não contiver tags HTML conhecidas, faz apenas o escape normal
  if (!/<\/?[a-z][\s\S]*>/i.test(input)) {
    return escapeMarkup(input);
  }

  // Remove sentinelas e tags executáveis perigosas com conteúdo
  const sanitized = input
    .replace(/[\0\uE000\uE001]/g, '')
    .replace(/<(script|style|iframe)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  const atoms: string[] = [];
  const pushAtom = (typstCode: string): string => {
    const idx = atoms.length;
    atoms.push(typstCode);
    return `\uE000REDIJAATOM${idx}\uE001`;
  };

  // 1. Extrai tokens estruturados de citação (<cite data-cite-id="..."> ou <span data-cite-id="...">)
  let withAtoms = sanitized.replace(
    /<cite\b([^>]*)>([\s\S]*?)<\/cite>|<span\b([^>]*data-cite-id=[^>]*)>([\s\S]*?)<\/span>/gi,
    (_full, citeAttrs, citeInner, spanAttrs, spanInner) => {
      const attrs = (citeAttrs ?? spanAttrs ?? '') as string;
      const inner = (citeInner ?? spanInner ?? '') as string;
      const citeId = extractHtmlAttribute(attrs, 'data-cite-id')?.trim();
      const page = extractHtmlAttribute(attrs, 'data-cite-page')?.trim();
      const rawMode = extractHtmlAttribute(attrs, 'data-cite-mode')?.trim();
      const mode = rawMode === 'narrative' ? 'narrative' : 'parenthetical';
      const fallbackText = stripHtmlTags(inner);

      const ref = citeId && ctx?.references ? ctx.references.find((r) => r.id === citeId) : undefined;
      if (!ref) {
        return pushAtom(escapeMarkup(fallbackText));
      }

      if (ctx?.bibliographyEngine === 'typst_csl') {
        const bibKey = ctx.bibKeyMap?.get(ref.id);
        if (bibKey) {
          const safeKey = bibKey.replace(/[^a-zA-Z0-9_-]/g, '');
          const args = [`<${safeKey}>`];
          if (mode === 'narrative') args.push('form: "prose"');
          if (page) args.push(`supplement: [p. ${escapeMarkup(page)}]`);
          return pushAtom(`#cite(${args.join(', ')})`);
        }
      }

      const display = resolveCitationDisplay(ref, {
        format: ctx?.citationFormat ?? 'abnt_upper',
        mode,
        page,
        refNumber: ctx?.refIndexMap?.get(ref.id) ?? 1,
      });
      return pushAtom(display.typst);
    },
  );

  // 2. Extrai nós de matemática inline (<span data-inline-math="true" data-math="...">)
  withAtoms = withAtoms.replace(
    /<span\b([^>]*data-inline-math=[^>]*)>([\s\S]*?)<\/span>/gi,
    (_full, attrs: string, inner: string) => {
      let expr = (extractHtmlAttribute(attrs, 'data-math') || stripHtmlTags(inner)).trim();
      if (expr.startsWith('$$') && expr.endsWith('$$') && expr.length >= 4) {
        expr = expr.slice(2, -2).trim();
      } else if (expr.startsWith('$') && expr.endsWith('$') && expr.length >= 2) {
        expr = expr.slice(1, -1).trim();
      }
      if (!expr) return '';
      // Modo inline no Typst exige ausência de espaços colados aos delimitadores `$`
      const safeExpr = expr.replace(/\$/g, '\\$').replace(/#/g, '\\#');
      return pushAtom(`$${safeExpr}$`);
    },
  );

  // 3. Extrai código inline (<code>...</code>)
  withAtoms = withAtoms.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_full, inner: string) => {
    const rawCode = decodeHtmlEntities(inner.replace(/<[^>]+>/g, ''));
    if (!rawCode) return '';
    return pushAtom(`#raw(${typstString(rawCode)})`);
  });

  // 4. Extrai hyperlinks (<a href="...">...</a>) com sanitização estrita de protocolo
  withAtoms = withAtoms.replace(
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (_full, attrs: string, inner: string) => {
      const href = extractHtmlAttribute(attrs, 'href') ?? '';
      const safeUrl = sanitizeLinkUrl(href);
      const innerTypst = convertSimpleHtmlToTypst(inner);
      if (!safeUrl) {
        return pushAtom(innerTypst);
      }
      return pushAtom(`#link(${typstString(safeUrl)})[${innerTypst || escapeMarkup(safeUrl)}]`);
    },
  );

  let restored = convertSimpleHtmlToTypst(withAtoms);

  // Restaura tokens atômicos (suportando <code>/<cite> aninhados dentro de <a>)
  for (let pass = 0; pass < atoms.length + 1 && restored.includes('\uE000REDIJAATOM'); pass++) {
    restored = restored.replace(/\uE000REDIJAATOM(\d+)\uE001/g, (_m, idxStr: string) => {
      const idx = Number(idxStr);
      return atoms[idx] ?? '';
    });
  }

  return restored.trim();
}

/**
 * Remove tags HTML retornando texto puro (útil para títulos ou contagem de caracteres).
 */
export function stripHtmlTags(input: string): string {
  if (!input) return '';
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, '')).trim();
}
