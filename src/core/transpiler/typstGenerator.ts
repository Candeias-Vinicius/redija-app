import {
  Block,
  AcademicReference,
  DocumentProject,
  DEFAULT_TEMPLATE_CONFIG,
  TemplateConfig,
  ProjectTemplateType,
} from '@/types/document';
import {
  escapeMarkup,
  richTextToTypst,
  stripHtmlTags,
  typstContent,
  typstString,
} from './escape';
import abntTemplate from '@/core/templates/abnt.typ?raw';
import sbcTemplate from '@/core/templates/sbc.typ?raw';
import ieeeTemplate from '@/core/templates/ieee.typ?raw';
import posterTemplate from '@/core/templates/poster.typ?raw';

/** Nome do arquivo do modelo dentro do projeto Typst gerado. */
export const TEMPLATE_FILE = 'abnt.typ';
export const MAIN_FILE = 'main.typ';

export function getTemplateFileName(templateType?: ProjectTemplateType): string {
  switch (templateType) {
    case 'sbc':
      return 'sbc.typ';
    case 'ieee':
      return 'ieee.typ';
    case 'poster':
      return 'poster.typ';
    default:
      return 'abnt.typ';
  }
}

export function getTemplateRawContent(templateType?: ProjectTemplateType): string {
  switch (templateType) {
    case 'sbc':
      return sbcTemplate;
    case 'ieee':
      return ieeeTemplate;
    case 'poster':
      return posterTemplate;
    default:
      return abntTemplate;
  }
}

export interface GeneratedTypstBundle {
  textFiles: Record<string, string>;
  binaryFiles: Record<string, Uint8Array>;
}

/**
 * Transpilador RedijaApp: converte o documento estruturado (metadados + blocos
 * + referências) em um projeto Typst com arquivos virtuais carregados no compilador,
 * mapeando imagens e o modelo correto (ABNT, SBC, IEEE ou Pôster).
 */
export function generateTypstFiles(
  project: DocumentProject,
  extraFiles?: Record<string, string>,
): Record<string, string> {
  const currentTemplateFile = getTemplateFileName(project.templateType);
  const currentTemplateContent = getTemplateRawContent(project.templateType);

  return {
    [currentTemplateFile]: currentTemplateContent,
    'abnt.typ': abntTemplate,
    'sbc.typ': sbcTemplate,
    'ieee.typ': ieeeTemplate,
    'poster.typ': posterTemplate,
    ...(extraFiles || {}),
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

const dataUrlCache = new Map<string, { ext: string; bytes: Uint8Array }>();

function parseDataUrl(dataUrl: string): { ext: string; bytes: Uint8Array } | null {
  const cached = dataUrlCache.get(dataUrl);
  if (cached) return cached;

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
    const result = { ext, bytes };
    if (dataUrlCache.size >= 50) {
      const firstKey = dataUrlCache.keys().next().value;
      if (firstKey) dataUrlCache.delete(firstKey);
    }
    dataUrlCache.set(dataUrl, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * Gera um único arquivo .typ autocontido (modelo + conteúdo), útil para
 * exportação e para abrir em outros editores Typst.
 */
export function generateStandaloneTypst(project: DocumentProject): string {
  const currentTemplateFile = getTemplateFileName(project.templateType);
  const currentTemplateContent = getTemplateRawContent(project.templateType);
  const importLine = `#import "${currentTemplateFile}": *`;
  const main = generateMain(project, false).replace(importLine, '').trim();
  return `${currentTemplateContent}\n// ===================== DOCUMENTO =====================\n${main}`;
}

/** Gera apenas o conteúdo do main.typ. */
export function generateMain(project: DocumentProject, includeBinaryImages = false): string {
  const cfg: TemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...(project.templateConfig ?? {}),
  };

  let importLine = `#import "${getTemplateFileName(project.templateType)}": *`;
  if (project.templateType === 'universe_custom') {
    const SAFE_PKG_REGEX = /^@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+:[0-9.]+$/;
    const pkg =
      cfg.universePackage && SAFE_PKG_REGEX.test(cfg.universePackage.trim())
        ? cfg.universePackage.trim()
        : '@preview/charged-ieee:0.1.1';
    importLine = `#import "abnt.typ": *\n#import "${pkg}": *`;
  }

  const parts: string[] = [
    importLine,
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

  // Elementos Pós-Textuais Opcionais (NBR 14724): Glossário, Apêndices e Anexos (Apenas para ABNT/TCC)
  if (project.templateType !== 'poster' && project.templateType !== 'ieee' && project.templateType !== 'sbc') {
    if (project.metadata.glossary?.trim()) {
      parts.push(
        '',
        '#pagebreak(weak: true)',
        '#heading(numbering: none)[GLOSSÁRIO]',
        escapeMarkup(project.metadata.glossary.trim()),
      );
    }

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
  }

  return parts.join('\n');
}

function generateShowRule(
  project: DocumentProject,
  cfg: TemplateConfig,
  includeBinaryImages = false,
): string {
  switch (project.templateType) {
    case 'sbc':
      return generateSbcShowRule(project, cfg);
    case 'ieee':
      return generateIeeeShowRule(project, cfg);
    case 'poster':
      return generatePosterShowRule(project, cfg, includeBinaryImages);
    case 'universe_custom':
      return generateUniverseShowRule(project, cfg);
    default:
      return generateAbntShowRule(project, cfg, includeBinaryImages);
  }
}

function generateSbcShowRule(project: DocumentProject, cfg: TemplateConfig): string {
  const m = project.metadata;
  const args: string[] = [
    `titulo: ${typstString(m.title)}`,
    `autor: ${typstString(m.author)}`,
    `instituicao: ${typstString(m.institution)}`,
    `curso: ${typstString(m.course)}`,
    `local: ${typstString(m.location)}`,
    `ano: ${typstString(m.year)}`,
  ];
  if (m.subtitle?.trim()) args.push(`subtitulo: ${typstString(m.subtitle)}`);
  if (m.abstract.trim()) args.push(`resumo: ${typstContent(m.abstract)}`);
  const keywords = m.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length > 0) args.push(`palavras-chave: (${keywords.map(typstString).join(', ')},)`);
  if (m.foreignAbstract?.trim()) args.push(`abstract: ${typstContent(m.foreignAbstract)}`);
  const foreignKeywords = (m.foreignKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (foreignKeywords.length > 0) args.push(`keywords: (${foreignKeywords.map(typstString).join(', ')},)`);
  if (cfg.fontFamily) args.push(`fonte: ${typstString(cfg.fontFamily === 'sans' ? 'sans' : 'serif')}`);
  const sbcCols = Number(cfg.columns) === 2 ? 2 : 1;
  args.push(`colunas: ${sbcCols}`);

  return `#show: sbc-article.with(\n  ${args.join(',\n  ')},\n)`;
}

function generateIeeeShowRule(project: DocumentProject, cfg: TemplateConfig): string {
  const m = project.metadata;
  const args: string[] = [
    `titulo: ${typstString(m.title)}`,
    `autor: ${typstString(m.author)}`,
    `instituicao: ${typstString(m.institution)}`,
    `curso: ${typstString(m.course)}`,
    `local: ${typstString(m.location)}`,
    `ano: ${typstString(m.year)}`,
  ];
  if (m.subtitle?.trim()) args.push(`subtitulo: ${typstString(m.subtitle)}`);
  if (m.abstract.trim()) args.push(`resumo: ${typstContent(m.abstract)}`);
  const keywords = m.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length > 0) args.push(`palavras-chave: (${keywords.map(typstString).join(', ')},)`);
  if (m.foreignAbstract?.trim()) args.push(`abstract: ${typstContent(m.foreignAbstract)}`);
  const foreignKeywords = (m.foreignKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (foreignKeywords.length > 0) args.push(`keywords: (${foreignKeywords.map(typstString).join(', ')},)`);
  if (cfg.fontFamily) args.push(`fonte: ${typstString(cfg.fontFamily === 'sans' ? 'sans' : 'serif')}`);
  const ieeeCols = Number(cfg.columns) === 1 ? 1 : 2;
  args.push(`colunas: ${ieeeCols}`);

  return `#show: ieee-article.with(\n  ${args.join(',\n  ')},\n)`;
}

function generatePosterShowRule(
  project: DocumentProject,
  cfg: TemplateConfig,
  includeBinaryImages = false,
): string {
  const m = project.metadata;
  const args: string[] = [
    `titulo: ${typstString(m.title)}`,
    `autor: ${typstString(m.author)}`,
    `instituicao: ${typstString(m.institution)}`,
    `curso: ${typstString(m.course)}`,
    `local: ${typstString(m.location)}`,
    `ano: ${typstString(m.year)}`,
  ];
  if (m.subtitle?.trim()) args.push(`subtitulo: ${typstString(m.subtitle)}`);

  if (includeBinaryImages && m.institutionLogoDataUrl) {
    const parsedLogo = parseDataUrl(m.institutionLogoDataUrl);
    if (parsedLogo) {
      const logoPath = `/assets/logo_instituicao.${parsedLogo.ext}`;
      args.push(`logo: image(${typstString(logoPath)}, height: 6cm)`);
    }
  }

  const safeDimensions =
    cfg.posterDimensions && /^[a-zA-Z0-9_-]+$/.test(cfg.posterDimensions) ? cfg.posterDimensions : 'a0';
  const safeOrientation = cfg.posterOrientation === 'landscape' ? 'landscape' : 'portrait';
  const safeCols = Math.min(4, Math.max(1, Number(cfg.posterColumns) || 3));
  const safeTheme =
    cfg.posterTheme && /^[a-zA-Z0-9_-]+$/.test(cfg.posterTheme) ? cfg.posterTheme : 'emerald';

  args.push(`dimensoes: ${typstString(safeDimensions)}`);
  args.push(`orientacao: ${typstString(safeOrientation)}`);
  args.push(`colunas: ${safeCols}`);
  args.push(`tema: ${typstString(safeTheme)}`);
  if (cfg.fontFamily) args.push(`fonte: ${typstString(cfg.fontFamily === 'sans' ? 'sans' : 'serif')}`);

  return `#show: academic-poster.with(\n  ${args.join(',\n  ')},\n)`;
}

function generateUniverseShowRule(project: DocumentProject, cfg: TemplateConfig): string {
  const m = project.metadata;
  const SAFE_ENTRY_REGEX = /^[a-zA-Z0-9_-]+$/;
  const entry =
    cfg.universeEntrypoint && SAFE_ENTRY_REGEX.test(cfg.universeEntrypoint.trim())
      ? cfg.universeEntrypoint.trim()
      : 'article';
  const args: string[] = [
    `title: ${typstString(m.title)}`,
    `authors: (${typstString(m.author)},)`,
  ];
  if (m.abstract.trim()) args.push(`abstract: ${typstContent(m.abstract)}`);
  return `#show: ${entry}.with(\n  ${args.join(',\n  ')},\n)`;
}

function generateAbntShowRule(
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
  if (m.coadvisor?.trim()) args.push(`coorientador: ${typstString(m.coadvisor)}`);
  args.push(`local: ${typstString(m.location)}`, `ano: ${typstString(m.year)}`);

  if (includeBinaryImages && m.institutionLogoDataUrl) {
    const parsedLogo = parseDataUrl(m.institutionLogoDataUrl);
    if (parsedLogo) {
      const logoPath = `/assets/logo_instituicao.${parsedLogo.ext}`;
      args.push(`logo: image(${typstString(logoPath)}, height: 2.2cm)`);
    }
  }

  if (m.includeApprovalPage) {
    args.push('incluir-folha-aprovacao: true');
    if (m.approvalDate?.trim()) {
      args.push(`data-aprovacao: ${typstString(m.approvalDate.trim())}`);
    }
    const members = (m.committeeMembers ?? []).map((c) => c.trim()).filter(Boolean);
    if (members.length > 0) {
      args.push(`banca: (${members.map(typstString).join(', ')},)`);
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
  if (m.includeBoxesList) args.push('lista-quadros: true');
  if (m.includeTablesList) args.push('lista-tabelas: true');
  if (m.abbreviations?.trim()) args.push(`siglas: ${typstContent(m.abbreviations)}`);
  if (m.symbols?.trim()) args.push(`simbolos: ${typstContent(m.symbols)}`);

  // Parâmetros de personalização do template / norma
  if (cfg.fontFamily !== DEFAULT_TEMPLATE_CONFIG.fontFamily) {
    const safeFont = cfg.fontFamily === 'sans' ? 'sans' : 'serif';
    args.push(`fonte: ${typstString(safeFont)}`);
  }
  if (cfg.fontSizePt !== DEFAULT_TEMPLATE_CONFIG.fontSizePt) {
    const safeSize = Number(cfg.fontSizePt) || 12;
    args.push(`tamanho-fonte: ${safeSize}pt`);
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
    const safeIndent = Number(cfg.paragraphIndentCm) || 1.25;
    args.push(`recuo: ${safeIndent}cm`);
  }
  if (cfg.marginTopCm !== DEFAULT_TEMPLATE_CONFIG.marginTopCm) {
    const safeMargin = Number(cfg.marginTopCm) || 3;
    args.push(`margem-superior: ${safeMargin}cm`);
  }
  if (cfg.marginLeftCm !== DEFAULT_TEMPLATE_CONFIG.marginLeftCm) {
    const safeMargin = Number(cfg.marginLeftCm) || 3;
    args.push(`margem-esquerda: ${safeMargin}cm`);
  }
  if (cfg.marginBottomCm !== DEFAULT_TEMPLATE_CONFIG.marginBottomCm) {
    const safeMargin = Number(cfg.marginBottomCm) || 2;
    args.push(`margem-inferior: ${safeMargin}cm`);
  }
  if (cfg.marginRightCm !== DEFAULT_TEMPLATE_CONFIG.marginRightCm) {
    const safeMargin = Number(cfg.marginRightCm) || 2;
    args.push(`margem-direita: ${safeMargin}cm`);
  }
  if (cfg.columns !== DEFAULT_TEMPLATE_CONFIG.columns) {
    const safeCols = Number(cfg.columns) === 2 ? 2 : 1;
    args.push(`colunas: ${safeCols}`);
  }
  if (cfg.includeCoverPage !== DEFAULT_TEMPLATE_CONFIG.includeCoverPage) {
    args.push(`incluir-capa: ${Boolean(cfg.includeCoverPage)}`);
  }
  if (cfg.includeTitlePage !== DEFAULT_TEMPLATE_CONFIG.includeTitlePage) {
    args.push(`incluir-folha-rosto: ${Boolean(cfg.includeTitlePage)}`);
  }
  if (cfg.includeToc !== DEFAULT_TEMPLATE_CONFIG.includeToc) {
    args.push(`incluir-sumario: ${Boolean(cfg.includeToc)}`);
  }

  return `#show: abnt.with(\n  ${args.join(',\n  ')},\n)`;
}

/**
 * A numeração das seções é automática (1, 1.1, 1.1.1). Se o usuário digitar
 * o número manualmente ("1 INTRODUÇÃO", "1.1 - Objetivos"), ele é removido para
 * não aparecer duplicado.
 */
export function stripManualNumbering(title: string): string {
  return title.replace(/^\s*\d+(\.\d+)*(\.|\s*[-–—:])?(\s+|$)/, '').trim();
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
      return plainText ? italicizeLatinTerms(richContent) : null;

    case 'bullet':
      return plainText ? `- ${italicizeLatinTerms(richContent)}` : null;

    case 'numbered':
      return plainText ? `+ ${italicizeLatinTerms(richContent)}` : null;

    case 'quote_long': {
      if (!plainText) return null;
      const ref = formatCitationReference(
        block.meta?.author,
        block.meta?.year,
        block.meta?.page,
        cfg.citationStyle,
      );
      const refContent = ref ? italicizeLatinTerms(escapeMarkup(ref)) : '';
      const refArg = refContent ? `referencia: [${refContent}]` : '';
      return `#citacao(${refArg})[${italicizeLatinTerms(richContent)}]`;
    }

    case 'equation': {
      let expr = block.content.trim();
      if (!expr) return null;
      if (expr.startsWith('$$') && expr.endsWith('$$') && expr.length >= 4) {
        expr = expr.slice(2, -2).trim();
      } else if (expr.startsWith('$') && expr.endsWith('$') && expr.length >= 2) {
        expr = expr.slice(1, -1).trim();
      }
      if (!expr) return null;
      // Expressão em modo display do Typst ($ expr $)
      // Escapa delimitadores internos $ para não fechar modo matemático
      // e neutraliza # para evitar execução de comandos/macros do Typst
      const sanitizedExpr = expr.replace(/\$/g, '\\$').replace(/#/g, '\\#');
      return `$ ${sanitizedExpr} $`;
    }

    case 'code': {
      const rawCode = block.content.trim();
      if (!rawCode) return null;
      const caption = block.meta?.caption?.trim().replace(/\.+$/, '');
      const source = block.meta?.source?.trim().replace(/\.+$/, '');
      const lang = (block.meta?.language || 'txt').replace(/[^a-zA-Z0-9_-]/g, '');
      const args: string[] = [];
      if (caption) args.push(`legenda: ${typstContent(caption)}`);
      if (source) args.push(`fonte: ${typstContent(source)}`);
      const argsStr = args.length > 0 ? `(${args.join(', ')})` : '';

      // Evita fechamento prematuro do bloco raw quando o código contém três ou mais crases
      const tickMatches = rawCode.match(/`+/g);
      const maxTicks = tickMatches ? Math.max(...tickMatches.map((m) => m.length)) : 0;
      const fence = '`'.repeat(Math.max(3, maxTicks + 1));

      return `#codigo${argsStr}[\n${fence}${lang}\n${rawCode}\n${fence}\n]`;
    }

    case 'image': {
      const caption = (block.meta?.caption?.trim() || 'Sem legenda').replace(/\.+$/, '');
      const source = (block.meta?.source?.trim() || 'do autor').replace(/\.+$/, '');
      const widthPct = Math.min(100, Math.max(10, Number(block.meta?.imageWidthPct) || 80));
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
      const caption = (
        block.meta?.caption?.trim() || (isBox ? 'Quadro comparativo' : 'Tabela de dados')
      ).replace(/\.+$/, '');
      const source = (block.meta?.source?.trim() || 'do autor').replace(/\.+$/, '');
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
      return plainText ? `#footnote[${italicizeLatinTerms(richContent)}]` : null;

    case 'pagebreak':
      return '#pagebreak()';

    default:
      return plainText ? italicizeLatinTerms(richContent) : null;
  }
}

/**
 * Aplica itálico automático às expressões latinas "et al." e "apud" (NBR 10520:2023)
 * quando ainda não estão dentro de `#emph[...]`.
 */
function italicizeLatinTerms(typstText: string): string {
  return typstText
    .replace(/(?<!#emph\[)\b(et\s+al\.)/gi, '#emph[et al.]')
    .replace(/(?<!#emph\[)\b(apud)\b/gi, '#emph[apud]');
}

/**
 * Formata os autores de uma citação autor-data conforme a NBR 10520:
 * - Extrai os sobrenomes (antes da vírgula ou último nome caso não haja vírgula).
 * - 1 autor: SILVA ou Silva
 * - 2 autores: SILVA; SOUZA ou Silva; Souza
 * - 3 autores: SILVA; SOUZA; SANTOS ou Silva; Souza; Santos
 * - 4 ou mais autores (ou com et al.): SILVA et al. ou Silva et al.
 */
export function formatAuthorCase(
  rawAuthor: string,
  style: 'uppercase' | 'titlecase' = 'uppercase',
): string {
  const trimmed = rawAuthor.trim();
  if (!trimmed) return '';

  const hasEtAl = /\bet\s+al\.?/i.test(trimmed);
  const cleaned = trimmed.replace(/\bet\s+al\.?/gi, '').trim();

  const extractSurname = (entry: string): string => {
    const cleanEntry = entry.trim();
    if (cleanEntry.includes(',')) {
      return cleanEntry.split(',')[0].trim();
    }
    const words = cleanEntry.split(/\s+/);
    return words[words.length - 1] || cleanEntry;
  };

  const formatSingle = (text: string): string => {
    if (style === 'titlecase') {
      return text
        .toLowerCase()
        .replace(/(?:^|[\s-;])(\S)/g, (match) => match.toUpperCase())
        .replace(/\bApud\b/gi, 'apud');
    }
    return text.toUpperCase().replace(/\bAPUD\b/gi, 'apud');
  };

  // Suporte à citação de citação "apud" (NBR 10520)
  if (/\bapud\b/i.test(cleaned)) {
    const parts = cleaned.split(/\bapud\b/i);
    if (parts.length === 2) {
      const first = extractSurname(parts[0].trim());
      const second = extractSurname(parts[1].trim());
      return `${formatSingle(first)} apud ${formatSingle(second)}`;
    }
  }

  const entries = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  if (entries.length >= 4 || hasEtAl) {
    const first = entries[0] || cleaned;
    const surname = extractSurname(first);
    return `${formatSingle(surname.replace(/\.+$/, ''))} et al.`;
  }

  const surnames = entries.map(extractSurname);
  return surnames.map((s) => formatSingle(s.replace(/\.+$/, ''))).join('; ');
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
 * Formata os autores para a lista final de Referências (NBR 6023):
 * - Até 3 autores: mantém todos separados por ponto e vírgula, finalizando com ponto.
 * - 4 ou mais autores (ou com "et al."): indica o primeiro autor seguido de `#emph[et al.].`.
 */
function formatReferenceAuthors(rawAuthors: string): string {
  const e = escapeMarkup;
  const trimmed = rawAuthors.trim();
  const hasEtAl = /\bet\s+al\.?/i.test(trimmed);
  const cleaned = trimmed.replace(/\bet\s+al\.?/gi, '').trim();
  const entries = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  if (entries.length >= 4 || hasEtAl) {
    const firstAuthor = (entries[0] || cleaned).trim().toUpperCase();
    return `${e(firstAuthor)} #emph[et al.].`;
  }

  const allAuthors = cleaned.replace(/\.+$/, '').trim().toUpperCase();
  return `${e(allAuthors)}.`;
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
  const authors = formatReferenceAuthors(ref.authors);
  const title = e(ref.title.trim());
  const subtitle = ref.subtitle?.trim() ? `: ${e(ref.subtitle.trim())}` : '';
  const year = e(ref.year?.trim() || '[s. d.]');
  const hl = (text: string) =>
    cfg.referenceHighlight === 'italic' ? `#emph[${text}]` : `#strong[${text}]`;

  let out: string;

  if (type === 'article' && ref.journal?.trim()) {
    // Artigo de periódico: AUTOR. Título: subtítulo. **Revista**, Local, v. X, n. Y, p. Z, Ano.
    out = `${authors} ${title}${subtitle}. ${hl(e(ref.journal.trim()))}`;
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
    out = `${authors} ${hl(title)}${subtitle}. ${year}. ${degree} — ${inst}, ${city}, ${year}.`;
  } else if (type === 'website') {
    // Documento online / Website (NBR 6023 item 7.14)
    out = `${authors} ${hl(title)}${subtitle}.`;
    if (ref.publisher?.trim()) {
      const city = e(ref.city?.trim() || '[S. l.]');
      out += ` ${city}: ${e(ref.publisher.trim())},`;
    }
    out += ` ${year}.`;
  } else if (type === 'legislation') {
    // Legislação (NBR 6023 item 7.9)
    out = `${authors} ${title}${subtitle}.`;
    if (ref.journal?.trim()) {
      out += ` ${hl(e(ref.journal.trim()))}`;
      if (ref.city?.trim()) out += `, ${e(ref.city.trim())}`;
    }
    out += `, ${year}.`;
  } else {
    // Livro: AUTOR. **Título**: subtítulo. Edição. Local: Editora, Ano.
    out = `${authors} ${hl(title)}${subtitle}.`;
    if (ref.edition?.trim()) out += ` ${e(ref.edition.trim())}. ed.`;
    const city = e(ref.city?.trim() || '[S. l.]');
    const pub = e(ref.publisher?.trim() || '[s. n.]');
    out += ` ${city}: ${pub}, ${year}.`;
  }

  if (ref.doi?.trim()) {
    out += ` DOI: ${e(ref.doi.trim()).replace(/\.+$/, '')}.`;
  }
  if (ref.url?.trim()) {
    out += ` Disponível em: ${e(ref.url.trim()).replace(/\.+$/, '')}.`;
    if (ref.accessDate?.trim()) {
      out += ` Acesso em: ${e(ref.accessDate.trim()).replace(/\.+$/, '')}.`;
    }
  }
  return `[${out}]`;
}
