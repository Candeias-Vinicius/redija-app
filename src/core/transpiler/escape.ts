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
