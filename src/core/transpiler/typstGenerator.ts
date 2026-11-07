import { Block, AcademicReference, DocumentProject } from '@/types/document';
import {
  escapeMarkup,
  richTextToTypst,
  stripHtmlTags,
  typstContent,
  typstString,
} from './escape';
import abntTemplate from '@/core/templates/abnt.typ?raw';

/** Nome do arquivo do modelo dentro do projeto Typst gerado. */
export const TEMPLATE_FILE = 'abnt.typ';
export const MAIN_FILE = 'main.typ';

const IMPORT_LINE = `#import "${TEMPLATE_FILE}": *`;

export interface GeneratedTypstBundle {
  textFiles: Record<string, string>;
  binaryFiles: Record<string, Uint8Array>;
}

/**
 * Transpilador RedijaApp: converte o documento estruturado (metadados + blocos
 * + referências) em um projeto Typst com dois arquivos de texto (`abnt.typ` e
 * `main.typ`), usando caminhos virtuais para eventuais imagens enviadas.
 */
export function generateTypstFiles(project: DocumentProject): Record<string, string> {
  return {
    [TEMPLATE_FILE]: abntTemplate,
    [MAIN_FILE]: generateMain(project, true),
  };
}

/**
 * Extrai também os arquivos binários de imagem (`Uint8Array`) a partir dos
 * Data URLs salvos nos blocos de figura, para mapeamento no WASM compiler.
 */
export function extractBinaryAssets(project: DocumentProject): Record<string, Uint8Array> {
  const assets: Record<string, Uint8Array> = {};

  for (const block of project.blocks) {
    if (block.type === 'image' && block.meta?.imageDataUrl) {
      const parsed = parseDataUrl(block.meta.imageDataUrl);
      if (parsed) {
        const path = getVirtualImagePath(block.id, parsed.ext);
        assets[path] = parsed.bytes;
      }
    }
  }

  return assets;
}

export function getVirtualImagePath(blockId: string, ext: string): string {
  const safeId = blockId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `/assets/img_${safeId}.${ext}`;
}

function parseDataUrl(dataUrl: string): { ext: string; bytes: Uint8Array } | null {
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) return null;

  const mimeSubtype = match[1].toLowerCase();
  let ext = 'png';
  if (mimeSubtype.includes('jpeg') || mimeSubtype.includes('jpg')) ext = 'jpg';
  else if (mimeSubtype.includes('svg')) ext = 'svg';
  else if (mimeSubtype.includes('gif')) ext = 'gif';
  else if (mimeSubtype.includes('webp')) ext = 'webp';

  try {
    const binaryString = atob(match[2]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { ext, bytes };
  } catch {
    return null;
  }
}

/**
 * Gera um único arquivo .typ autocontido (modelo + conteúdo), útil para
 * exportação e para abrir em outros editores Typst.
 */
export function generateStandaloneTypst(project: DocumentProject): string {
  const main = generateMain(project, false).replace(IMPORT_LINE, '');
  return `${abntTemplate}\n// ===================== DOCUMENTO =====================\n${main}`;
}

/** Gera apenas o conteúdo do main.typ. */
export function generateMain(project: DocumentProject, includeBinaryImages = false): string {
  const parts: string[] = [IMPORT_LINE, generateShowRule(project), ''];

  for (const block of project.blocks) {
    const code = transpileBlock(block, includeBinaryImages);
    if (code !== null) parts.push(code, '');
  }

  if (project.references.length > 0) {
    parts.push(transpileReferences(project.references));
  }

  return parts.join('\n');
}

function generateShowRule(project: DocumentProject): string {
  const m = project.metadata;
  const args: string[] = [
    `instituicao: ${typstString(m.institution)}`,
    `curso: ${typstString(m.course)}`,
    `autor: ${typstString(m.author)}`,
    `titulo: ${typstString(m.title)}`,
  ];
  if (m.subtitle?.trim()) args.push(`subtitulo: ${typstString(m.subtitle)}`);
  if (m.nature?.trim()) args.push(`natureza: ${typstContent(m.nature)}`);
  if (m.advisor?.trim()) args.push(`orientador: ${typstString(m.advisor)}`);
  args.push(`local: ${typstString(m.location)}`, `ano: ${typstString(m.year)}`);
  if (m.abstract.trim()) args.push(`resumo: ${typstContent(m.abstract)}`);

  const keywords = m.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length > 0) {
    args.push(`palavras-chave: (${keywords.map(typstString).join(', ')},)`);
  }

  return `#show: abnt.with(\n  ${args.join(',\n  ')},\n)`;
}

/**
 * A numeração das seções é automática (1, 1.1, 1.1.1). Se o usuário digitar
 * o número manualmente ("1 INTRODUÇÃO", "2.1 Objetivos"), ele é removido para
 * não aparecer duplicado.
 */
export function stripManualNumbering(title: string): string {
  return title.replace(/^\s*\d+(\.\d+)*\.?\s+/, '').trim();
}

function transpileBlock(block: Block, includeBinaryImages = false): string | null {
  const plainText = stripHtmlTags(block.content);
  const richContent = richTextToTypst(block.content);

  switch (block.type) {
    case 'h1':
    case 'h2':
    case 'h3': {
      const title = stripManualNumbering(plainText);
      if (!title) return null;
      const level = Number(block.type[1]);
      return `${'='.repeat(level)} ${escapeMarkup(title)}`;
    }

    case 'paragraph':
      return plainText ? richContent : null;

    case 'bullet':
      return plainText ? `- ${richContent}` : null;

    case 'numbered':
      return plainText ? `+ ${richContent}` : null;

    case 'quote_long': {
      if (!plainText) return null;
      const ref = formatCitationReference(block.meta?.author, block.meta?.year, block.meta?.page);
      const refArg = ref ? `referencia: ${typstContent(ref)}` : '';
      return `#citacao(${refArg})[${richContent}]`;
    }

    case 'image': {
      const caption = block.meta?.caption?.trim() || 'Sem legenda';
      const source = block.meta?.source?.trim() || 'do autor';
      if (includeBinaryImages && block.meta?.imageDataUrl) {
        const parsed = parseDataUrl(block.meta.imageDataUrl);
        if (parsed) {
          const virtualPath = getVirtualImagePath(block.id, parsed.ext);
          return `#figura(legenda: ${typstContent(caption)}, fonte: ${typstContent(source)}, imagem: image(${typstString(virtualPath)}, width: 80%))`;
        }
      }
      return `#figura(legenda: ${typstContent(caption)}, fonte: ${typstContent(source)})`;
    }

    case 'table': {
      const caption = block.meta?.caption?.trim() || 'Tabela de dados';
      const source = block.meta?.source?.trim() || 'do autor';
      const headers = block.meta?.headers?.length
        ? block.meta.headers
        : ['Coluna 1', 'Coluna 2'];
      const rows = block.meta?.rows?.length
        ? block.meta.rows
        : [['Dado 1', 'Dado 2']];

      const colCount = headers.length;
      const headerCells = headers
        .map((h) => `table.cell(fill: luma(240))[#strong[${escapeMarkup(h.trim())}]]`)
        .join(', ');
      const bodyCells = rows
        .flatMap((row) =>
          headers.map((_, colIdx) => `[${escapeMarkup((row[colIdx] ?? '').trim())}]`),
        )
        .join(', ');

      return `#tabela(legenda: ${typstContent(caption)}, fonte: ${typstContent(source)})[
  #table(
    columns: (${Array(colCount).fill('1fr').join(', ')}),
    align: left,
    stroke: (x: none, y: 0.5pt + luma(160)),
    table.header(${headerCells}),
    ${bodyCells}
  )
]`;
    }

    case 'footnote':
      return plainText ? `#footnote[${richContent}]` : null;

    case 'pagebreak':
      return '#pagebreak()';

    default:
      return plainText ? richContent : null;
  }
}

/** Monta a chamada autor-data da citação: (SILVA, 2023, p. 42). */
export function formatCitationReference(author?: string, year?: string, page?: string): string {
  const parts: string[] = [];
  if (author?.trim()) parts.push(author.trim().toUpperCase());
  if (year?.trim()) parts.push(year.trim());
  if (page?.trim()) parts.push(`p. ${page.trim()}`);
  return parts.join(', ');
}

function transpileReferences(references: AcademicReference[]): string {
  const sorted = [...references].sort((a, b) =>
    a.authors.localeCompare(b.authors, 'pt-BR', { sensitivity: 'base' }),
  );
  const items = sorted.map((ref) => `  ${transpileReference(ref)},`);
  return `#referencias(\n${items.join('\n')}\n)`;
}

/**
 * Formato NBR 6023 para livros:
 * SOBRENOME, Nome. **Título**: subtítulo. Edição. Local: Editora, Ano.
 */
export function transpileReference(ref: AcademicReference): string {
  const e = escapeMarkup;
  let out = `${e(ref.authors.trim().toUpperCase())}. #strong[${e(ref.title.trim())}]`;
  if (ref.subtitle?.trim()) out += `: ${e(ref.subtitle.trim())}`;
  out += '.';
  if (ref.edition?.trim()) out += ` ${e(ref.edition.trim())}. ed.`;
  out += ` ${e(ref.city?.trim() || '[S. l.]')}: ${e(ref.publisher?.trim() || '[s. n.]')}, ${e(ref.year?.trim() || '[s. d.]')}.`;
  if (ref.url?.trim()) {
    out += ` Disponível em: ${e(ref.url.trim())}.`;
    if (ref.accessDate?.trim()) out += ` Acesso em: ${e(ref.accessDate.trim())}.`;
  }
  return `[${out}]`;
}
