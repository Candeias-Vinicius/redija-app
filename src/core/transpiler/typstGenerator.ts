import {
  AcademicReference,
  Block,
  CitationFormat,
  CslStyle,
  DEFAULT_TEMPLATE_CONFIG,
  DocumentLanguage,
  DocumentProject,
  ProjectTemplateType,
  TemplateConfig,
} from '@/types/document';
import {
  escapeMarkup,
  richTextToTypst,
  RichTextTypstContext,
  stripHtmlTags,
  typstContent,
  typstString,
} from './escape';
import {
  buildBibKeyMap,
  exportToBibtex,
  getOrderedReferences,
  getPrimarySurname,
  getReferenceBibKey,
  getReferenceIndexMap,
  getSortedReferences,
  parseCitationAuthors,
  resolveCitationFormat,
} from './abntLinter';
import { ConfigurableFieldId } from '@/core/templates/fieldRegistry';
import {
  getTemplateCapabilities,
  TemplateCapabilities,
} from '@/core/templates/templateCapabilities';
import {
  getTypstFontStack,
  sanitizeCustomFontFamily,
} from '@/core/typst/fontCatalog';
import abntTemplate from '@/core/templates/abnt.typ?raw';
import sbcTemplate from '@/core/templates/sbc.typ?raw';
import ieeeTemplate from '@/core/templates/ieee.typ?raw';
import posterTemplate from '@/core/templates/poster.typ?raw';

export {
  buildBibKeyMap,
  getOrderedReferences,
  getReferenceBibKey,
  getReferenceIndexMap,
  getSortedReferences,
  resolveCitationFormat,
};

/** Nome do arquivo do modelo dentro do projeto Typst gerado. */
export const TEMPLATE_FILE = 'abnt.typ';
export const MAIN_FILE = 'main.typ';
export type ResolvedReferenceEntryFormat = 'abnt' | 'apa' | 'ieee';

export function resolveCslStyle(
  cfg: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
  effectiveType?: ProjectTemplateType,
): CslStyle {
  if (cfg.cslStyle) return cfg.cslStyle;
  if (effectiveType === 'ieee' || cfg.preset === 'ieee' || cfg.citationFormat === 'ieee_numeric') {
    return 'ieee';
  }
  if (cfg.preset === 'apa_7' || cfg.citationFormat === 'author_date') {
    return 'apa';
  }
  return 'associacao-brasileira-de-normas-tecnicas';
}

export function resolveReferenceEntryFormat(
  cfg: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
  effectiveType?: ProjectTemplateType,
): ResolvedReferenceEntryFormat {
  if (
    cfg.referenceEntryFormat === 'abnt' ||
    cfg.referenceEntryFormat === 'apa' ||
    cfg.referenceEntryFormat === 'ieee'
  ) {
    return cfg.referenceEntryFormat;
  }
  if (effectiveType === 'ieee' || cfg.preset === 'ieee') {
    return 'ieee';
  }
  if (cfg.preset === 'apa_7' || cfg.citationFormat === 'author_date') {
    return 'apa';
  }
  return 'abnt';
}

function getEffectiveCfg(project: DocumentProject): TemplateConfig {
  const resolvedCitationFormat = resolveCitationFormat(project.templateConfig);
  return {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...(project.templateConfig ?? {}),
    citationFormat: resolvedCitationFormat,
  };
}

function getLocalizedLabels(lang?: DocumentLanguage): {
  glossary: string;
  appendices: string;
  annexes: string;
  references: string;
} {
  if (lang === 'en') {
    return {
      glossary: 'GLOSSARY',
      appendices: 'APPENDICES',
      annexes: 'ANNEXES',
      references: 'References',
    };
  }
  if (lang === 'es') {
    return {
      glossary: 'GLOSARIO',
      appendices: 'APÉNDICES',
      annexes: 'ANEXOS',
      references: 'Referencias',
    };
  }
  return {
    glossary: 'GLOSSÁRIO',
    appendices: 'APÊNDICES',
    annexes: 'ANEXOS',
    references: 'Referências',
  };
}

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
  const capabilities = getTemplateCapabilities(project);
  const effectiveType = capabilities.effectiveType;
  const cfg = getEffectiveCfg(project);
  const orderedRefs = getOrderedReferences(
    project.references || [],
    cfg.referenceOrdering ?? 'alphabetical',
    project.blocks,
  );
  const currentTemplateFile = getTemplateFileName(effectiveType);
  const currentTemplateContent = getTemplateRawContent(effectiveType);
  const useTypstCsl = cfg.bibliographyEngine === 'typst_csl' && orderedRefs.length > 0;

  return {
    [currentTemplateFile]: currentTemplateContent,
    'abnt.typ': abntTemplate,
    'sbc.typ': sbcTemplate,
    'ieee.typ': ieeeTemplate,
    'poster.typ': posterTemplate,
    ...(useTypstCsl ? { 'refs.bib': exportToBibtex(orderedRefs) } : {}),
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
  const capabilities = getTemplateCapabilities(project);
  const effectiveType = capabilities.effectiveType;
  const cfg = getEffectiveCfg(project);
  const currentTemplateFile = getTemplateFileName(effectiveType);
  const currentTemplateContent = getTemplateRawContent(effectiveType);
  const importLine = `#import "${currentTemplateFile}": *`;
  let main = generateMain(project, false).replace(importLine, '').trim();

  if (cfg.bibliographyEngine === 'typst_csl' && project.references.length > 0) {
    const orderedRefs = getOrderedReferences(
      project.references,
      cfg.referenceOrdering ?? 'alphabetical',
      project.blocks,
    );
    const bibContent = exportToBibtex(orderedRefs);
    main = main.replace(
      '#bibliography("refs.bib"',
      `#bibliography(bytes(${typstString(bibContent)})`,
    );
  }

  return `${currentTemplateContent}\n// ===================== DOCUMENTO =====================\n${main}`;
}

/** Gera apenas o conteúdo do main.typ. */
export function generateMain(project: DocumentProject, includeBinaryImages = false): string {
  const cfg = getEffectiveCfg(project);
  const capabilities = getTemplateCapabilities(project);
  const effectiveType = capabilities.effectiveType;
  const ordering = cfg.referenceOrdering ?? 'alphabetical';
  const orderedRefs = getOrderedReferences(project.references, ordering, project.blocks);
  const refIndexMap = new Map<string, number>();
  orderedRefs.forEach((ref, idx) => refIndexMap.set(ref.id, idx + 1));
  const bibKeyMap = buildBibKeyMap(orderedRefs);

  const richCtx: RichTextTypstContext = {
    references: orderedRefs,
    refIndexMap,
    citationFormat: cfg.citationFormat,
    bibliographyEngine: cfg.bibliographyEngine,
    bibKeyMap,
  };

  let importLine = `#import "${getTemplateFileName(effectiveType)}": *`;
  if (effectiveType === 'universe_custom') {
    const SAFE_PKG_REGEX = /^@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+:[0-9.]+$/;
    const pkg =
      cfg.universePackage && SAFE_PKG_REGEX.test(cfg.universePackage.trim())
        ? cfg.universePackage.trim()
        : '@preview/charged-ieee:0.1.1';
    importLine = `#import "abnt.typ": *\n#import "${pkg}": *`;
  }

  const parts: string[] = [
    importLine,
    generateShowRule(project, cfg, includeBinaryImages, capabilities),
    '',
  ];

  for (const block of project.blocks) {
    const code = transpileBlock(block, includeBinaryImages, cfg, orderedRefs, refIndexMap, richCtx);
    if (code !== null) parts.push(code, '');
  }

  if (orderedRefs.length > 0) {
    parts.push(transpileReferences(orderedRefs, cfg, effectiveType));
  }

  // Elementos Pós-Textuais Opcionais (NBR 14724): Glossário, Apêndices e Anexos
  const canRenderPostTextuals =
    effectiveType !== 'poster' &&
    effectiveType !== 'ieee' &&
    effectiveType !== 'sbc';

  if (canRenderPostTextuals) {
    const labels = getLocalizedLabels(cfg.documentLanguage);
    const allowPostField = (fieldId: 'glossary' | 'appendices' | 'annexes') =>
      !capabilities.supportsSidebarFieldPdfSync ||
      !capabilities.isSidebarCustomized ||
      capabilities.posTextualFields.includes(fieldId);

    if (allowPostField('glossary') && project.metadata.glossary?.trim()) {
      parts.push(
        '',
        '#pagebreak(weak: true)',
        `#heading(numbering: none)[${labels.glossary}]`,
        escapeMarkup(project.metadata.glossary.trim()),
      );
    }

    if (allowPostField('appendices') && project.metadata.appendices?.trim()) {
      parts.push(
        '',
        '#pagebreak(weak: true)',
        `#heading(numbering: none)[${labels.appendices}]`,
        escapeMarkup(project.metadata.appendices.trim()),
      );
    }

    if (allowPostField('annexes') && project.metadata.annexes?.trim()) {
      parts.push(
        '',
        '#pagebreak(weak: true)',
        `#heading(numbering: none)[${labels.annexes}]`,
        escapeMarkup(project.metadata.annexes.trim()),
      );
    }
  }

  return parts.join('\n');
}

function buildTypstFontValue(cfg: TemplateConfig, fallbackDefault: 'serif' | 'sans' = 'serif'): string {
  const family = cfg.fontFamily;
  if (family === 'serif') return typstString('serif');
  if (family === 'sans') return typstString('sans');
  if (family === 'custom' && !sanitizeCustomFontFamily(cfg.customFontFamily)) {
    return typstString(fallbackDefault);
  }
  const stack = getTypstFontStack(family, cfg.customFontFamily);
  return `(${stack.map(typstString).join(', ')})`;
}

function clampFontSizePt(val?: number, fallback = 12): number {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(24, Math.max(8, Math.round(num * 2) / 2));
}

function clampParagraphSpacingEm(val?: number): number | undefined {
  if (typeof val !== 'number' || !Number.isFinite(val)) return undefined;
  return Math.min(3, Math.max(0, Math.round(val * 100) / 100));
}

function getLineSpacingVar(spacing: TemplateConfig['lineSpacing']): string {
  if (spacing === '1.0') return 'entrelinha-simples';
  if (spacing === '2.0') return 'entrelinha-dupla';
  return 'entrelinha-1-5';
}

interface ShowRuleLayoutDefaults {
  fontSizePt: number;
  lineSpacing: TemplateConfig['lineSpacing'];
  paragraphIndentCm: number;
  marginTopCm: number;
  marginLeftCm: number;
  marginBottomCm: number;
  marginRightCm: number;
  lang: DocumentLanguage;
  pageNumbering: NonNullable<TemplateConfig['pageNumbering']>;
  headingNumbering: NonNullable<TemplateConfig['headingNumbering']>;
  skipAbntSpreadDefaults?: boolean;
}

function appendCommonLayoutArgs(
  args: string[],
  cfg: TemplateConfig,
  defaults: ShowRuleLayoutDefaults,
): void {
  const safeFontSize = clampFontSizePt(cfg.fontSizePt, defaults.fontSizePt);
  if (safeFontSize !== defaults.fontSizePt) {
    args.push(`tamanho-fonte: ${safeFontSize}pt`);
  }
  if (cfg.lineSpacing && cfg.lineSpacing !== defaults.lineSpacing) {
    args.push(`entrelinha: ${getLineSpacingVar(cfg.lineSpacing)}`);
  }

  const ignoreAbntIndent =
    defaults.skipAbntSpreadDefaults &&
    cfg.paragraphIndentCm === DEFAULT_TEMPLATE_CONFIG.paragraphIndentCm;
  if (!ignoreAbntIndent && cfg.paragraphIndentCm !== defaults.paragraphIndentCm) {
    const safeIndent = Math.min(4, Math.max(0, Number(cfg.paragraphIndentCm) || defaults.paragraphIndentCm));
    args.push(`recuo: ${safeIndent}cm`);
  }

  const parSpacing = clampParagraphSpacingEm(cfg.paragraphSpacingEm);
  if (parSpacing !== undefined) {
    args.push(`espacamento-paragrafo: ${parSpacing}em`);
  }
  if (cfg.bodyAlignment === 'left') {
    args.push('justificar-corpo: false');
  }

  const pushMargin = (argName: string, val: number, defVal: number, abntDef: number) => {
    if (defaults.skipAbntSpreadDefaults && val === abntDef) return;
    if (val !== defVal && Number.isFinite(val)) {
      const clamped = Math.min(6, Math.max(0.5, val));
      args.push(`${argName}: ${clamped}cm`);
    }
  };
  pushMargin('margem-superior', cfg.marginTopCm, defaults.marginTopCm, DEFAULT_TEMPLATE_CONFIG.marginTopCm);
  pushMargin('margem-esquerda', cfg.marginLeftCm, defaults.marginLeftCm, DEFAULT_TEMPLATE_CONFIG.marginLeftCm);
  pushMargin('margem-inferior', cfg.marginBottomCm, defaults.marginBottomCm, DEFAULT_TEMPLATE_CONFIG.marginBottomCm);
  pushMargin('margem-direita', cfg.marginRightCm, defaults.marginRightCm, DEFAULT_TEMPLATE_CONFIG.marginRightCm);

  if (cfg.paperSize && cfg.paperSize !== 'a4') {
    args.push(`tamanho-papel: ${typstString(cfg.paperSize)}`);
  }
  if (cfg.pageOrientation === 'landscape') {
    args.push('orientacao: "landscape"');
  }
  if (cfg.documentLanguage && cfg.documentLanguage !== defaults.lang) {
    args.push(`idioma: ${typstString(cfg.documentLanguage)}`);
  }
  if (cfg.pageNumbering && cfg.pageNumbering !== defaults.pageNumbering) {
    args.push(`posicao-pagina: ${typstString(cfg.pageNumbering)}`);
  }
  if (cfg.hideFirstPageNumber) {
    args.push('ocultar-pagina-1: true');
  }
  if (cfg.runningHeader !== undefined && cfg.runningHeader.trim()) {
    args.push(`cabecalho: ${typstString(cfg.runningHeader.trim())}`);
  }
  if (cfg.headingNumbering && cfg.headingNumbering !== defaults.headingNumbering) {
    args.push(`numeracao-secoes: ${typstString(cfg.headingNumbering)}`);
  }
  if (typeof cfg.h1PageBreak === 'boolean') {
    args.push(`quebra-h1: ${cfg.h1PageBreak}`);
  }
}

function generateShowRule(
  project: DocumentProject,
  cfg: TemplateConfig,
  includeBinaryImages = false,
  capabilities: TemplateCapabilities = getTemplateCapabilities(project),
): string {
  switch (capabilities.effectiveType) {
    case 'sbc':
      return generateSbcShowRule(project, cfg, includeBinaryImages);
    case 'ieee':
      return generateIeeeShowRule(project, cfg, includeBinaryImages);
    case 'poster':
      return generatePosterShowRule(project, cfg, includeBinaryImages);
    case 'universe_custom':
      return generateUniverseShowRule(project, cfg);
    default:
      return generateAbntShowRule(project, cfg, includeBinaryImages, capabilities);
  }
}

function generateSbcShowRule(
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
      args.push(`logo: image(${typstString(logoPath)}, height: 2cm)`);
    }
  }
  if (m.abstract.trim()) args.push(`resumo: ${typstContent(m.abstract)}`);
  const keywords = m.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length > 0) args.push(`palavras-chave: (${keywords.map(typstString).join(', ')},)`);
  if (m.foreignAbstract?.trim()) args.push(`abstract: ${typstContent(m.foreignAbstract)}`);
  const foreignKeywords = (m.foreignKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (foreignKeywords.length > 0) args.push(`keywords: (${foreignKeywords.map(typstString).join(', ')},)`);
  if (cfg.fontFamily) args.push(`fonte: ${buildTypstFontValue(cfg, 'serif')}`);

  appendCommonLayoutArgs(args, cfg, {
    fontSizePt: 12,
    lineSpacing: '1.0',
    paragraphIndentCm: 1.25,
    marginTopCm: 3.5,
    marginLeftCm: 3.0,
    marginBottomCm: 2.5,
    marginRightCm: 3.0,
    lang: 'pt',
    pageNumbering: 'bottom_center',
    headingNumbering: 'none',
    skipAbntSpreadDefaults: cfg.preset === 'sbc',
  });

  const sbcCols = Number(cfg.columns) === 2 ? 2 : 1;
  args.push(`colunas: ${sbcCols}`);

  return `#show: sbc-article.with(\n  ${args.join(',\n  ')},\n)`;
}

function generateIeeeShowRule(
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
      args.push(`logo: image(${typstString(logoPath)}, height: 1.8cm)`);
    }
  }
  if (m.abstract.trim()) args.push(`resumo: ${typstContent(m.abstract)}`);
  const keywords = m.keywords.map((k) => k.trim()).filter(Boolean);
  if (keywords.length > 0) args.push(`palavras-chave: (${keywords.map(typstString).join(', ')},)`);
  if (m.foreignAbstract?.trim()) args.push(`abstract: ${typstContent(m.foreignAbstract)}`);
  const foreignKeywords = (m.foreignKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (foreignKeywords.length > 0) args.push(`keywords: (${foreignKeywords.map(typstString).join(', ')},)`);
  if (cfg.fontFamily) args.push(`fonte: ${buildTypstFontValue(cfg, 'serif')}`);

  appendCommonLayoutArgs(args, cfg, {
    fontSizePt: 10,
    lineSpacing: '1.0',
    paragraphIndentCm: 0.35,
    marginTopCm: 1.9,
    marginLeftCm: 1.57,
    marginBottomCm: 2.54,
    marginRightCm: 1.57,
    lang: 'en',
    pageNumbering: 'bottom_center',
    headingNumbering: 'none',
    skipAbntSpreadDefaults: cfg.preset === 'ieee',
  });

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
  if (cfg.fontFamily) args.push(`fonte: ${buildTypstFontValue(cfg, 'sans')}`);
  if (cfg.fontSizePt >= 14 && cfg.fontSizePt !== 22) {
    args.push(`tamanho-fonte: ${clampFontSizePt(cfg.fontSizePt, 22)}pt`);
  }
  if (cfg.bodyAlignment === 'left') args.push('justificar-corpo: false');
  if (cfg.documentLanguage && cfg.documentLanguage !== 'pt') {
    args.push(`idioma: ${typstString(cfg.documentLanguage)}`);
  }
  if (cfg.headingNumbering && cfg.headingNumbering !== 'none') {
    args.push(`numeracao-secoes: ${typstString(cfg.headingNumbering)}`);
  }

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
  capabilities: TemplateCapabilities = getTemplateCapabilities(project),
): string {
  const m = project.metadata;
  const visibleSet = new Set<ConfigurableFieldId>(capabilities.visibleFieldIds);
  const hasField = (id: ConfigurableFieldId): boolean =>
    !capabilities.supportsSidebarFieldPdfSync ||
    !capabilities.isSidebarCustomized ||
    visibleSet.has(id);

  const args: string[] = [
    `instituicao: ${hasField('institution') ? typstString(m.institution) : '""'}`,
    `curso: ${hasField('course') ? typstString(m.course) : '""'}`,
    `autor: ${hasField('author') ? typstString(m.author) : '""'}`,
    `titulo: ${hasField('title') ? typstString(m.title) : '""'}`,
  ];
  if (hasField('subtitle') && m.subtitle?.trim()) args.push(`subtitulo: ${typstString(m.subtitle)}`);
  if (hasField('nature') && m.nature?.trim()) args.push(`natureza: ${typstContent(m.nature)}`);
  if (hasField('advisor') && m.advisor?.trim()) args.push(`orientador: ${typstString(m.advisor)}`);
  if (hasField('coadvisor') && m.coadvisor?.trim()) args.push(`coorientador: ${typstString(m.coadvisor)}`);
  args.push(
    `local: ${hasField('location') ? typstString(m.location) : '""'}`,
    `ano: ${hasField('year') ? typstString(m.year) : '""'}`,
  );

  if (includeBinaryImages && m.institutionLogoDataUrl) {
    const parsedLogo = parseDataUrl(m.institutionLogoDataUrl);
    if (parsedLogo) {
      const logoPath = `/assets/logo_instituicao.${parsedLogo.ext}`;
      args.push(`logo: image(${typstString(logoPath)}, height: 2.2cm)`);
    }
  }

  if (hasField('includeApprovalPage') && m.includeApprovalPage) {
    args.push('incluir-folha-aprovacao: true');
    if (m.approvalDate?.trim()) {
      args.push(`data-aprovacao: ${typstString(m.approvalDate.trim())}`);
    }
    const members = (m.committeeMembers ?? []).map((c) => c.trim()).filter(Boolean);
    if (members.length > 0) {
      args.push(`banca: (${members.map(typstString).join(', ')},)`);
    }
  }

  if (hasField('dedicatory') && m.dedicatory?.trim()) args.push(`dedicatoria: ${typstContent(m.dedicatory)}`);
  if (hasField('acknowledgments') && m.acknowledgments?.trim()) args.push(`agradecimentos: ${typstContent(m.acknowledgments)}`);
  if (hasField('epigraph') && m.epigraph?.trim()) args.push(`epigrafe: ${typstContent(m.epigraph)}`);
  if (hasField('epigraph') && m.epigraphAuthor?.trim()) args.push(`epigrafe-autor: ${typstContent(m.epigraphAuthor)}`);
  if (hasField('abstract') && m.abstract.trim()) args.push(`resumo: ${typstContent(m.abstract)}`);

  const keywords = m.keywords.map((k) => k.trim()).filter(Boolean);
  if (hasField('keywords') && keywords.length > 0) {
    args.push(`palavras-chave: (${keywords.map(typstString).join(', ')},)`);
  }

  if (hasField('foreignAbstract') && m.foreignAbstract?.trim()) args.push(`abstract: ${typstContent(m.foreignAbstract)}`);
  const foreignKeywords = (m.foreignKeywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (hasField('foreignAbstract') && foreignKeywords.length > 0) {
    args.push(`keywords: (${foreignKeywords.map(typstString).join(', ')},)`);
  }

  if (hasField('includeFiguresList') && m.includeFiguresList) args.push('lista-figuras: true');
  if (hasField('includeBoxesList') && m.includeBoxesList) args.push('lista-quadros: true');
  if (hasField('includeTablesList') && m.includeTablesList) args.push('lista-tabelas: true');
  if (hasField('abbreviations') && m.abbreviations?.trim()) args.push(`siglas: ${typstContent(m.abbreviations)}`);
  if (hasField('symbols') && m.symbols?.trim()) args.push(`simbolos: ${typstContent(m.symbols)}`);

  // Parâmetros de personalização do template / norma
  if (cfg.fontFamily !== DEFAULT_TEMPLATE_CONFIG.fontFamily) {
    if (cfg.fontFamily !== 'custom' || sanitizeCustomFontFamily(cfg.customFontFamily)) {
      args.push(`fonte: ${buildTypstFontValue(cfg, 'serif')}`);
    }
  }

  appendCommonLayoutArgs(args, cfg, {
    fontSizePt: DEFAULT_TEMPLATE_CONFIG.fontSizePt,
    lineSpacing: DEFAULT_TEMPLATE_CONFIG.lineSpacing,
    paragraphIndentCm: DEFAULT_TEMPLATE_CONFIG.paragraphIndentCm,
    marginTopCm: DEFAULT_TEMPLATE_CONFIG.marginTopCm,
    marginLeftCm: DEFAULT_TEMPLATE_CONFIG.marginLeftCm,
    marginBottomCm: DEFAULT_TEMPLATE_CONFIG.marginBottomCm,
    marginRightCm: DEFAULT_TEMPLATE_CONFIG.marginRightCm,
    lang: 'pt',
    pageNumbering: 'top_right',
    headingNumbering: '1.1',
  });

  if (cfg.romanPreTextual) {
    args.push('romano-pre-textual: true');
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

function findMatchingReference(
  author: string | undefined,
  year: string | undefined,
  references: AcademicReference[],
): AcademicReference | undefined {
  if (!author?.trim() || references.length === 0) return undefined;
  const { surnames } = parseCitationAuthors(author);
  const targetSurname = surnames[0] || getPrimarySurname(author);
  if (!targetSurname) return undefined;
  const exactYearMatch = references.find(
    (r) =>
      getPrimarySurname(r.authors) === targetSurname &&
      (!year?.trim() || r.year?.trim() === year.trim()),
  );
  return exactYearMatch ?? references.find((r) => getPrimarySurname(r.authors) === targetSurname);
}

function transpileBlock(
  block: Block,
  includeBinaryImages = false,
  cfg: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
  references: AcademicReference[] = [],
  refIndexMap: Map<string, number> = new Map(),
  richCtx?: RichTextTypstContext,
): string | null {
  if (block.type === 'raw_typst') {
    const raw = block.content.trim();
    return raw ? raw : null;
  }

  const plainText = stripHtmlTags(block.content);
  const richContent = richTextToTypst(block.content, richCtx);

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
      const matchedRef = findMatchingReference(block.meta?.author, block.meta?.year, references);

      if (richCtx?.bibliographyEngine === 'typst_csl' && matchedRef) {
        const bibKey = richCtx.bibKeyMap?.get(matchedRef.id);
        if (bibKey) {
          const safeKey = bibKey.replace(/[^a-zA-Z0-9_-]/g, '');
          const supArg = block.meta?.page?.trim()
            ? `, supplement: [p. ${escapeMarkup(block.meta.page.trim())}]`
            : '';
          return `#citacao(referencia: [#cite(<${safeKey}>${supArg})], parenteses: false)[${italicizeLatinTerms(richContent)}]`;
        }
      }

      const fmt = resolveCitationFormat(cfg);
      if (fmt === 'ieee_numeric' || fmt === 'superscript') {
        const idx = (matchedRef ? refIndexMap.get(matchedRef.id) : undefined) ?? 1;
        if (fmt === 'ieee_numeric') {
          const pageSuffix = block.meta?.page?.trim()
            ? `, p. ${escapeMarkup(block.meta.page.trim())}`
            : '';
          return `#citacao(referencia: [\\[${idx}${pageSuffix}\\]], parenteses: false)[${italicizeLatinTerms(richContent)}]`;
        }
        return `#citacao(referencia: [#super[${idx}]], parenteses: false)[${italicizeLatinTerms(richContent)}]`;
      }

      const ref = formatCitationReference(
        block.meta?.author,
        block.meta?.year,
        block.meta?.page,
        fmt,
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
 * quando ainda não estão dentro de `#emph[...]`, preservando strings `#raw`/`#link`, `#cite` e matemática.
 */
function italicizeLatinTerms(typstText: string): string {
  const protectedTokens: string[] = [];
  const masked = typstText.replace(
    /#(?:raw|link)\("(?:[^"\\]|\\.)*"\)|#cite\([^)]*\)|\$[^$]+\$/g,
    (match) => {
      const idx = protectedTokens.length;
      protectedTokens.push(match);
      return `\uE000REDIJAPROT${idx}\uE001`;
    },
  );
  const replaced = masked
    .replace(/(?<!#emph\[)\b(et\s+al\.)/gi, '#emph[et al.]')
    .replace(/(?<!#emph\[)\b(apud)\b/gi, '#emph[apud]');
  return protectedTokens.length === 0
    ? replaced
    : replaced.replace(/\uE000REDIJAPROT(\d+)\uE001/g, (_m, i) => protectedTokens[Number(i)] ?? '');
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

/** Monta a chamada autor-data da citação: SILVA, 2023, p. 42 | Silva, 2023 | Silva 2023. */
export function formatCitationReference(
  author?: string,
  year?: string,
  page?: string,
  citationStyleOrFormat: 'uppercase' | 'titlecase' | CitationFormat = 'uppercase',
): string {
  const isAuthorDateSimple = citationStyleOrFormat === 'author_date';
  const style: 'uppercase' | 'titlecase' =
    citationStyleOrFormat === 'titlecase' ||
    citationStyleOrFormat === 'abnt_titlecase' ||
    isAuthorDateSimple
      ? 'titlecase'
      : 'uppercase';

  if (isAuthorDateSimple) {
    const rawAuthor = author?.trim() ? formatAuthorCase(author, 'titlecase').replace(/;\s+/g, ' & ') : '';
    const rawYear = year?.trim() || '';
    const head = [rawAuthor, rawYear].filter(Boolean).join(' ');
    const pagePart = page?.trim() ? `p. ${page.trim()}` : '';
    return [head, pagePart].filter(Boolean).join(', ');
  }

  const parts: string[] = [];
  if (author?.trim()) parts.push(formatAuthorCase(author, style));
  if (year?.trim()) parts.push(year.trim());
  if (page?.trim()) parts.push(`p. ${page.trim()}`);
  return parts.join(', ');
}

function getReferenceSpacingValue(spacing?: TemplateConfig['referenceSpacing']): string {
  if (spacing === 'compact') return '0.5em';
  if (spacing === 'double') return '1.8em';
  return '1.2em';
}

function transpileReferences(
  orderedReferences: AcademicReference[],
  cfg: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
  effectiveType?: ProjectTemplateType,
): string {
  if (cfg.bibliographyEngine === 'typst_csl') {
    const style = resolveCslStyle(cfg, effectiveType);
    const defaultLang: DocumentLanguage = effectiveType === 'ieee' ? 'en' : 'pt';
    const labels = getLocalizedLabels(cfg.documentLanguage ?? defaultLang);
    return `#bibliography("refs.bib", style: ${typstString(style)}, full: true, title: [${escapeMarkup(labels.references)}])`;
  }

  const entryFormat = resolveReferenceEntryFormat(cfg, effectiveType);
  const items = orderedReferences.map((ref) => `  ${transpileReference(ref, cfg, entryFormat)},`);
  const citationFormat = resolveCitationFormat(cfg);

  const refArgs: string[] = [];

  if (cfg.documentLanguage) {
    const nativeLang: DocumentLanguage = effectiveType === 'ieee' ? 'en' : 'pt';
    if (cfg.documentLanguage !== nativeLang) {
      const labels = getLocalizedLabels(cfg.documentLanguage);
      refArgs.push(`titulo: [${escapeMarkup(labels.references)}]`);
    }
  }

  if (effectiveType === 'ieee') {
    if (cfg.referenceAlignment === 'justify') refArgs.push('alinhamento: "justify"');
    if (cfg.referenceSpacing && cfg.referenceSpacing !== 'compact') {
      refArgs.push(`espacamento: ${getReferenceSpacingValue(cfg.referenceSpacing)}`);
    }
    if (citationFormat === 'superscript') {
      refArgs.push('numeracao: "dot"');
    } else if (citationFormat !== 'ieee_numeric') {
      refArgs.push('numeracao: none');
    }
  } else if (effectiveType === 'sbc' || effectiveType === 'poster') {
    if (cfg.referenceAlignment === 'left') refArgs.push('alinhamento: "left"');
    if (cfg.referenceSpacing && cfg.referenceSpacing !== 'single_blank') {
      refArgs.push(`espacamento: ${getReferenceSpacingValue(cfg.referenceSpacing)}`);
    }
    if (citationFormat === 'ieee_numeric') {
      refArgs.push('numeracao: "bracket"');
    } else if (citationFormat === 'superscript') {
      refArgs.push('numeracao: "dot"');
    }
  } else {
    if (cfg.referenceAlignment === 'justify') {
      refArgs.push('alinhamento: "justify"');
    }
    if (cfg.referenceSpacing && cfg.referenceSpacing !== 'single_blank') {
      refArgs.push(`espacamento: ${getReferenceSpacingValue(cfg.referenceSpacing)}`);
    }
    if (citationFormat === 'ieee_numeric') {
      refArgs.push('numeracao: "bracket"');
    } else if (citationFormat === 'superscript') {
      refArgs.push('numeracao: "dot"');
    }
  }

  const argsBlock = refArgs.length > 0 ? `  ${refArgs.join(',\n  ')},\n` : '';
  return `#referencias(\n${argsBlock}${items.join('\n')}\n)`;
}

function toInitials(givenName: string): string {
  return givenName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}.`)
    .join(' ');
}

function toTitleCaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/(?:^|[\s-])(\S)/g, (m) => m.toUpperCase());
}

function parseAuthorNameParts(entry: string): { surname: string; initials: string; isInstitutional: boolean } {
  const clean = entry.trim().replace(/\.+$/, '');
  if (clean.includes(',')) {
    const [last, ...rest] = clean.split(',');
    const given = rest.join(',').trim();
    return {
      surname: toTitleCaseName(last.trim()),
      initials: given ? toInitials(given) : '',
      isInstitutional: false,
    };
  }
  // Sem vírgula (ex.: "W3C", "BRASIL. Ministério") -> mantém institucional ou último sobrenome
  if (/^[A-Z0-9.\s-]+$/.test(clean) && clean.split(/\s+/).length <= 3) {
    return { surname: clean, initials: '', isInstitutional: true };
  }
  const words = clean.split(/\s+/);
  if (words.length <= 1) {
    return { surname: clean, initials: '', isInstitutional: true };
  }
  const last = words.pop()!;
  return {
    surname: toTitleCaseName(last),
    initials: toInitials(words.join(' ')),
    isInstitutional: false,
  };
}

function formatApaAuthors(rawAuthors: string): string {
  const e = escapeMarkup;
  const trimmed = rawAuthors.trim();
  const hasEtAl = /\bet\s+al\.?/i.test(trimmed);
  const cleaned = trimmed.replace(/\bet\s+al\.?/gi, '').trim();
  const entries = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  if (entries.length === 0) return e(cleaned);
  const formatted = entries.map((entry) => {
    const p = parseAuthorNameParts(entry);
    if (p.isInstitutional || !p.initials) return e(p.surname);
    return e(`${p.surname}, ${p.initials}`);
  });

  if (hasEtAl || formatted.length >= 21) {
    return `${formatted[0]} #emph[et al.]`;
  }
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
}

function formatIeeeAuthors(rawAuthors: string): string {
  const e = escapeMarkup;
  const trimmed = rawAuthors.trim();
  const hasEtAl = /\bet\s+al\.?/i.test(trimmed);
  const cleaned = trimmed.replace(/\bet\s+al\.?/gi, '').trim();
  const entries = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  if (entries.length === 0) return e(cleaned);
  const formatted = entries.map((entry) => {
    const p = parseAuthorNameParts(entry);
    if (p.isInstitutional || !p.initials) return e(p.surname);
    return e(`${p.initials} ${p.surname}`);
  });

  if (hasEtAl || formatted.length >= 4) {
    return `${formatted[0]} #emph[et al.]`;
  }
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
  return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`;
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
 * Formata uma entrada bibliográfica em ABNT (NBR 6023), APA 7 ou IEEE,
 * respeitando a preferência de destaque tipográfico do usuário.
 */
export function transpileReference(
  ref: AcademicReference,
  cfg: TemplateConfig = DEFAULT_TEMPLATE_CONFIG,
  entryFormatOverride?: ResolvedReferenceEntryFormat,
): string {
  const e = escapeMarkup;
  const entryFormat = entryFormatOverride ?? resolveReferenceEntryFormat(cfg);
  const type = ref.type || 'book';
  const title = e(ref.title.trim());
  const subtitle = ref.subtitle?.trim() ? `: ${e(ref.subtitle.trim())}` : '';
  const year = e(ref.year?.trim() || (entryFormat === 'abnt' ? '[s. d.]' : 'n.d.'));
  const hl = (text: string) => {
    switch (cfg.referenceHighlight) {
      case 'italic':
        return `#emph[${text}]`;
      case 'underline':
        return `#underline[${text}]`;
      case 'none':
        return text;
      case 'bold':
      default:
        return `#strong[${text}]`;
    }
  };

  if (entryFormat === 'apa') {
    const authors = formatApaAuthors(ref.authors);
    const apaLink = ref.doi?.trim()
      ? ` https://doi.org/${e(ref.doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')).replace(/\.+$/, '')}`
      : ref.url?.trim()
        ? ` ${e(ref.url.trim()).replace(/\.+$/, '')}`
        : '';

    let out: string;
    if (type === 'article' && ref.journal?.trim()) {
      out = `${authors} (${year}). ${title}${subtitle}. ${hl(e(ref.journal.trim()))}`;
      if (ref.volume?.trim()) {
        out += `, ${e(ref.volume.trim())}`;
        if (ref.issue?.trim()) out += `(${e(ref.issue.trim())})`;
      }
      if (ref.pages?.trim()) out += `, ${e(ref.pages.trim())}`;
      out += '.';
    } else if (type === 'thesis') {
      const degree = e(ref.degree?.trim() || 'Thesis');
      const inst = e(ref.institution?.trim() || ref.publisher?.trim() || 'University');
      out = `${authors} (${year}). ${hl(title)}${subtitle} [${degree}, ${inst}].`;
    } else if (type === 'website') {
      const site = ref.publisher?.trim() ? ` ${e(ref.publisher.trim())}.` : '';
      out = `${authors} (${year}). ${hl(title)}${subtitle}.${site}`;
    } else {
      const ed = ref.edition?.trim() ? ` (${e(ref.edition.trim())} ed.)` : '';
      const pub = e(ref.publisher?.trim() || 'Publisher');
      out = `${authors} (${year}). ${hl(title)}${subtitle}${ed}. ${pub}.`;
    }
    return `[${out}${apaLink}]`;
  }

  if (entryFormat === 'ieee') {
    const authors = formatIeeeAuthors(ref.authors);
    const ieeeSuffix = ref.doi?.trim()
      ? ` doi: ${e(ref.doi.trim()).replace(/\.+$/, '')}.`
      : ref.url?.trim()
        ? ` [Online]. Available: ${e(ref.url.trim()).replace(/\.+$/, '')}`
        : '';

    let out: string;
    if (type === 'article' && ref.journal?.trim()) {
      out = `${authors}, "${title}${subtitle}," ${hl(e(ref.journal.trim()))}`;
      if (ref.volume?.trim()) out += `, vol. ${e(ref.volume.trim())}`;
      if (ref.issue?.trim()) out += `, no. ${e(ref.issue.trim())}`;
      if (ref.pages?.trim()) out += `, pp. ${e(ref.pages.trim())}`;
      out += `, ${year}.`;
    } else if (type === 'thesis') {
      const degree = e(ref.degree?.trim() || 'Thesis');
      const inst = e(ref.institution?.trim() || ref.publisher?.trim() || 'Institution');
      const city = ref.city?.trim() ? `, ${e(ref.city.trim())}` : '';
      out = `${authors}, "${title}${subtitle}," ${degree}, ${inst}${city}, ${year}.`;
    } else if (type === 'website') {
      out = `${authors}, "${title}${subtitle}," ${year}.`;
    } else {
      const ed = ref.edition?.trim() ? `, ${e(ref.edition.trim())} ed.` : '';
      const city = ref.city?.trim() ? ` ${e(ref.city.trim())}:` : '';
      const pub = e(ref.publisher?.trim() || 'Publisher');
      out = `${authors}, ${hl(title)}${subtitle}${ed}.${city} ${pub}, ${year}.`;
    }
    return `[${out}${ieeeSuffix}]`;
  }

  // ABNT (NBR 6023)
  const authors = formatReferenceAuthors(ref.authors);
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
