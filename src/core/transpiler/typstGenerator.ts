import {
  Block,
  AcademicReference,
  DocumentProject,
  DEFAULT_TEMPLATE_CONFIG,
  TemplateConfig,
} from '@/types/document';
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
 * Data URLs salvos nos blocos de figura e no logo da instituição, para
 * mapeamento no WASM compiler.
 */
export function extractBinaryAssets(project: DocumentProject): Record<string, Uint8Array> {
  const assets: Record<string, Uint8Array> = {};

  if (project.metadata.institutionLogoDataUrl) {
    const parsedLogo = parseDataUrl(project.metadata.institutionLogoDataUrl);
    if (parsedLogo) {
      assets[`/assets/logo_instituicao.${parsedLogo.ext}`] = parsedLogo.bytes;
    }
  }

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
  const cfg: TemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...(project.templateConfig ?? {}),
  };
  const parts: string[] = [
    IMPORT_LINE,
    generateShowRule(project, cfg, includeBinaryImages),
    '',
  ];

  for (const block of project.blocks) {
    const code = transpileBlock(block, includeBinaryImages, cfg);
    if (code !== null) parts.push(code, '');
  }

  if (project.references.length > 0) {
    parts.push(transpileReferences(project.references, cfg));
  }

  // Elementos Pós-Textuais Opcionais (NBR 14724): Apêndices e Anexos
  if (project.metadata.appendices?.trim()) {
    parts.push(
      '',
      '#pagebreak(weak: true)',
      '#heading(numbering: none)[APÊNDICES]',
      escapeMarkup(project.metadata.appendices.trim()),
    );
  }

  if (project.metadata.annexes?.trim()) {
    parts.push(
      '',
      '#pagebreak(weak: true)',
      '#heading(numbering: none)[ANEXOS]',
      escapeMarkup(project.metadata.annexes.trim()),
    );
  }

  return parts.join('\n');
}

function generateShowRule(
  project: DocumentProject,
  cfg: TemplateConfig,
  includeBinaryImages = false,
): string {
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

  if (includeBinaryImages && m.institutionLogoDataUrl) {
    const parsedLogo = parseDataUrl(m.institutionLogoDataUrl);
    if (parsedLogo) {
      const logoPath = `/assets/logo_instituicao.${parsedLogo.ext}`;
      args.push(`logo: image(${typstString(logoPath)}, height: 2.2cm)`);
    }
  }

  if (m.dedicatory?.trim()) args.push(`dedicatoria: ${typstContent(m.dedicatory)}`);
  if (m.acknowledgments?.trim()) args.push(`agradecimentos: ${typstContent(m.acknowledgments)}`);
  if (m.epigraph?.trim()) args.push(`epigrafe: ${typstContent(m.epigraph)}`);
  if (m.epigraphAuthor?.trim()) args.push(`epigrafe-autor: ${typstContent(m.epigraphAuthor)}`);
  if (m.abstract.trim()) args.push(`resumo: ${typstContent(m.abstract)}`);

  const keywords = m.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length > 0) {
    args.push(`palavras-chave: (${keywords.map(typstString).join(', ')},)`);
  }

  if (m.foreignAbstract?.trim()) args.push(`abstract: ${typstContent(m.foreignAbstract)}`);
  const foreignKeywords = (m.foreignKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (foreignKeywords.length > 0) {
    args.push(`keywords: (${foreignKeywords.map(typstString).join(', ')},)`);
  }

  if (m.includeFiguresList) args.push('lista-figuras: true');
  if (m.includeTablesList) args.push('lista-tabelas: true');
  if (m.abbreviations?.trim()) args.push(`siglas: ${typstContent(m.abbreviations)}`);

  // Parâmetros de personalização do template / norma
  if (cfg.fontFamily !== DEFAULT_TEMPLATE_CONFIG.fontFamily) {
    args.push(`fonte: ${typstString(cfg.fontFamily)}`);
  }
  if (cfg.fontSizePt !== DEFAULT_TEMPLATE_CONFIG.fontSizePt) {
    args.push(`tamanho-fonte: ${cfg.fontSizePt}pt`);
  }
  if (cfg.lineSpacing !== DEFAULT_TEMPLATE_CONFIG.lineSpacing) {
    const leadingVar =
      cfg.lineSpacing === '1.0'
        ? 'entrelinha-simples'
        : cfg.lineSpacing === '2.0'
          ? 'entrelinha-dupla'
          : 'entrelinha-1-5';
    args.push(`entrelinha: ${leadingVar}`);
  }
  if (cfg.paragraphIndentCm !== DEFAULT_TEMPLATE_CONFIG.paragraphIndentCm) {
    args.push(`recuo: ${cfg.paragraphIndentCm}cm`);
  }
  if (cfg.marginTopCm !== DEFAULT_TEMPLATE_CONFIG.marginTopCm) {
    args.push(`margem-superior: ${cfg.marginTopCm}cm`);
  }
  if (cfg.marginLeftCm !== DEFAULT_TEMPLATE_CONFIG.marginLeftCm) {
    args.push(`margem-esquerda: ${cfg.marginLeftCm}cm`);
  }
  if (cfg.marginBottomCm !== DEFAULT_TEMPLATE_CONFIG.marginBottomCm) {
    args.push(`margem-inferior: ${cfg.marginBottomCm}cm`);
  }
  if (cfg.marginRightCm !== DEFAULT_TEMPLATE_CONFIG.marginRightCm) {
    args.push(`margem-direita: ${cfg.marginRightCm}cm`);
  }
  if (cfg.columns !== DEFAULT_TEMPLATE_CONFIG.columns) {
    args.push(`colunas: ${cfg.columns}`);
  }
  if (cfg.includeCoverPage !== DEFAULT_TEMPLATE_CONFIG.includeCoverPage) {
    args.push(`incluir-capa: ${cfg.includeCoverPage}`);
  }
  if (cfg.includeTitlePage !== DEFAULT_TEMPLATE_CONFIG.includeTitlePage) {
    args.push(`incluir-folha-rosto: ${cfg.includeTitlePage}`);
  }
  if (cfg.includeToc !== DEFAULT_TEMPLATE_CONFIG.includeToc) {
    args.push(`incluir-sumario: ${cfg.includeToc}`);
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

function transpileBlock(
  block: Block,
  includeBinaryImages = false,
  cfg: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
): string | null {
  const plainText = stripHtmlTags(block.content);
  const richContent = richTextToTypst(block.content);

  switch (block.type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5': {
      const title = stripManualNumbering(plainText);
      if (!title) return null;
      const level = Number(block.type[1]);
      return `${'='.repeat(level)} ${escapeMarkup(title)}`;
    }

    case 'unnumbered_heading': {
      const title = stripManualNumbering(plainText);
      if (!title) return null;
      return `#heading(numbering: none)[${escapeMarkup(title.toUpperCase())}]`;
    }

    case 'paragraph':
      return plainText ? richContent : null;

    case 'bullet':
      return plainText ? `- ${richContent}` : null;

    case 'numbered':
      return plainText ? `+ ${richContent}` : null;

    case 'quote_long': {
      if (!plainText) return null;
      const ref = formatCitationReference(
        block.meta?.author,
        block.meta?.year,
        block.meta?.page,
        cfg.citationStyle,
      );
      const refArg = ref ? `referencia: ${typstContent(ref)}` : '';
      return `#citacao(${refArg})[${richContent}]`;
    }

    case 'equation': {
      const expr = block.content.trim();
      if (!expr) return null;
      // Expressão em modo display do Typst ($ expr $)
      return `$ ${expr} $`;
    }

    case 'code': {
      const rawCode = block.content.trim();
      if (!rawCode) return null;
      const caption = block.meta?.caption?.trim();
      const source = block.meta?.source?.trim();
      const lang = (block.meta?.language || 'txt').replace(/[^a-zA-Z0-9_-]/g, '');
      const args: string[] = [];
      if (caption) args.push(`legenda: ${typstContent(caption)}`);
      if (source) args.push(`fonte: ${typstContent(source)}`);
      const argsStr = args.length > 0 ? `(${args.join(', ')})` : '';
      return `#codigo${argsStr}[\n\`\`\`${lang}\n${rawCode}\n\`\`\`\n]`;
    }

    case 'image': {
      const caption = block.meta?.caption?.trim() || 'Sem legenda';
      const source = block.meta?.source?.trim() || 'do autor';
      const widthPct = block.meta?.imageWidthPct || 80;
      if (includeBinaryImages && block.meta?.imageDataUrl) {
        const parsed = parseDataUrl(block.meta.imageDataUrl);
        if (parsed) {
          const virtualPath = getVirtualImagePath(block.id, parsed.ext);
          return `#figura(legenda: ${typstContent(caption)}, fonte: ${typstContent(source)}, imagem: image(${typstString(virtualPath)}, width: ${widthPct}%))`;
        }
      }
      return `#figura(legenda: ${typstContent(caption)}, fonte: ${typstContent(source)})`;
    }

    case 'table':
    case 'box': {
      const isBox = block.type === 'box';
      const macroName = isBox ? 'quadro' : 'tabela';
      const caption =
        block.meta?.caption?.trim() || (isBox ? 'Quadro comparativo' : 'Tabela de dados');
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

      // Na ABNT/IBGE, Tabela é aberta nas laterais (stroke x: none), enquanto Quadro é fechado nos 4 lados
      const strokeRule = isBox
        ? '0.5pt + luma(140)'
        : '(x: none, y: 0.5pt + luma(160))';

      return `#${macroName}(legenda: ${typstContent(caption)}, fonte: ${typstContent(source)})[
  #table(
    columns: (${Array(colCount).fill('1fr').join(', ')}),
    align: left,
    stroke: ${strokeRule},
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

/** Formata o sobrenome do autor conforme o estilo (MAIÚSCULAS ou Inicial Maiúscula). */
export function formatAuthorCase(
  rawAuthor: string,
  style: 'uppercase' | 'titlecase' = 'uppercase',
): string {
  const trimmed = rawAuthor.trim();
  if (!trimmed) return '';
  if (style === 'titlecase') {
    return trimmed
      .toLowerCase()
      .replace(/(?:^|[\s-;])(\S)/g, (match) => match.toUpperCase());
  }
  return trimmed.toUpperCase();
}

/** Monta a chamada autor-data da citação: (SILVA, 2023, p. 42) ou (Silva, 2023, p. 42). */
export function formatCitationReference(
  author?: string,
  year?: string,
  page?: string,
  citationStyle: 'uppercase' | 'titlecase' = 'uppercase',
): string {
  const parts: string[] = [];
  if (author?.trim()) parts.push(formatAuthorCase(author, citationStyle));
  if (year?.trim()) parts.push(year.trim());
  if (page?.trim()) parts.push(`p. ${page.trim()}`);
  return parts.join(', ');
}

function transpileReferences(
  references: AcademicReference[],
  cfg: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
): string {
  const sorted = [...references].sort((a, b) =>
    a.authors.localeCompare(b.authors, 'pt-BR', { sensitivity: 'base' }),
  );
  const items = sorted.map((ref) => `  ${transpileReference(ref, cfg)},`);
  return `#referencias(\n${items.join('\n')}\n)`;
}

/**
 * Formato NBR 6023 para livros, artigos de periódico, teses/TCCs, sites e legislação,
 * respeitando a preferência de destaque (negrito ou itálico).
 */
export function transpileReference(
  ref: AcademicReference,
  cfg: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
): string {
  const e = escapeMarkup;
  const type = ref.type || 'book';
  const authors = e(ref.authors.trim().toUpperCase());
  const title = e(ref.title.trim());
  const subtitle = ref.subtitle?.trim() ? `: ${e(ref.subtitle.trim())}` : '';
  const year = e(ref.year?.trim() || '[s. d.]');
  const hl = (text: string) =>
    cfg.referenceHighlight === 'italic' ? `#emph[${text}]` : `#strong[${text}]`;

  let out: string;

  if (type === 'article' && ref.journal?.trim()) {
    // Artigo de periódico: AUTOR. Título: subtítulo. **Revista**, Local, v. X, n. Y, p. Z, Ano.
    out = `${authors}. ${title}${subtitle}. ${hl(e(ref.journal.trim()))}`;
    if (ref.city?.trim()) out += `, ${e(ref.city.trim())}`;
    if (ref.volume?.trim()) out += `, v. ${e(ref.volume.trim())}`;
    if (ref.issue?.trim()) out += `, n. ${e(ref.issue.trim())}`;
    if (ref.pages?.trim()) out += `, p. ${e(ref.pages.trim())}`;
    out += `, ${year}.`;
  } else if (type === 'thesis') {
    // Tese / Dissertação / TCC: AUTOR. **Título**: subtítulo. Ano. Tipo — Instituição, Local, Ano.
    const degree = e(ref.degree?.trim() || 'Trabalho de Conclusão de Curso');
    const inst = e(ref.institution?.trim() || ref.publisher?.trim() || 'Instituição');
    const city = e(ref.city?.trim() || '[S. l.]');
    out = `${authors}. ${hl(title)}${subtitle}. ${year}. ${degree} — ${inst}, ${city}, ${year}.`;
  } else {
    // Livro / Site / Legislação: AUTOR. **Título**: subtítulo. Edição. Local: Editora, Ano.
    out = `${authors}. ${hl(title)}${subtitle}.`;
    if (ref.edition?.trim()) out += ` ${e(ref.edition.trim())}. ed.`;
    const city = e(ref.city?.trim() || '[S. l.]');
    const pub = e(ref.publisher?.trim() || '[s. n.]');
    out += ` ${city}: ${pub}, ${year}.`;
  }

  if (ref.doi?.trim()) {
    out += ` DOI: ${e(ref.doi.trim())}.`;
  }
  if (ref.url?.trim()) {
    out += ` Disponível em: ${e(ref.url.trim())}.`;
    if (ref.accessDate?.trim()) out += ` Acesso em: ${e(ref.accessDate.trim())}.`;
  }
  return `[${out}]`;
}
