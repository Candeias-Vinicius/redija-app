// =====================================================================
// RedijaApp — Exportador de Documentos para Microsoft Word (.docx)
// Implementa o Épico RDJ-01 (RDJ-01.1 a RDJ-01.4):
// - RDJ-01.1: Estrutura (Heading 1..5), formatação de texto, listas e layout da norma
// - RDJ-01.2: Tabelas nativas editáveis, figuras (1 a 4 imagens), legendas e redimensionamento
// - RDJ-01.3: Equações nativas editáveis em OMML (em bloco numeradas e inline) + fallback seguro
// - RDJ-01.4: Citações e referências (ABNT, IEEE, SBC, APA) a partir da fonte única de verdade
// =====================================================================

import JSZip from 'jszip';
import {
  AcademicReference,
  CitationFormat,
  DEFAULT_TEMPLATE_CONFIG,
  DocumentLanguage,
  DocumentProject,
  ProjectTemplateType,
  TemplateConfig,
} from '@/types/document';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import { PRESETS } from '@/components/customizer/presets';
import { sanitizeCustomFontFamily } from '@/core/typst/fontCatalog';
import { getBlockImages } from '@/core/storage/imageQuota';
import { getImportApiUrl } from '@/core/storage/importer/pandoc/client';
import {
  decodeHtmlEntities,
  sanitizeLinkUrl,
  stripHtmlTags,
} from './escape';
import {
  formatCitationReference,
  getOrderedReferences,
  resolveCitationFormat,
  resolveReferenceEntryFormat,
  stripManualNumbering,
  transpileReference,
} from './typstGenerator';
import {
  isGroupableParentheticalFormat,
  resolveCitationDisplay,
  resolveGroupedParentheticalDisplay,
  toUnicodeSuperscript,
} from './citationFormatter';
import { getPrimarySurname, parseCitationAuthors } from './abntLinter';
import { convertMathToOmml } from './mathToOmml';

export const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const DOCX_CONVERSION_NOTICE_KEY = 'redija:docx_conversion_notice_dismissed';

export const DOCX_CONVERSION_NOTICE_TEXT =
  'O .docx é uma conversão. O PDF continua sendo a versão de referência do seu trabalho';

export class DocxExportUnavailableError extends Error {
  constructor(
    message = 'Não foi possível exportar o documento para .docx no momento. Verifique sua conexão e tente novamente.',
  ) {
    super(message);
    this.name = 'DocxExportUnavailableError';
  }
}

export interface MissingImageReport {
  figureNumber: number;
  caption: string;
  blockId: string;
}

export interface FailedEquationReport {
  index: number;
  location: string;
  expression: string;
  blockId: string;
}

export interface MissingCitationReport {
  citeId: string;
  label: string;
  location: string;
  blockId: string;
}

export interface DocxExportResult {
  blob: Blob;
  bytes: Uint8Array;
  fileName: string;
  warnings: string[];
  missingImages: MissingImageReport[];
  failedEquations: FailedEquationReport[];
  missingCitations: MissingCitationReport[];
}

export interface ResolvedDocxLayout {
  fontName: string;
  fontSizePt: number;
  fontSizeHalfPt: number;
  lineSpacing: '1.0' | '1.5' | '2.0';
  lineSpacingTwips: number;
  paragraphIndentCm: number;
  paragraphIndentTwips: number;
  marginTopCm: number;
  marginBottomCm: number;
  marginLeftCm: number;
  marginRightCm: number;
  marginTopTwips: number;
  marginBottomTwips: number;
  marginLeftTwips: number;
  marginRightTwips: number;
  pageWidthCm: number;
  pageHeightCm: number;
  pageWidthTwips: number;
  pageHeightTwips: number;
  usableWidthCm: number;
  usableHeightCm: number;
  usableWidthTwips: number;
  usableWidthEmu: number;
  usableHeightEmu: number;
  columns: number;
  orientation: 'portrait' | 'landscape';
  bodyAlignment: 'both' | 'left';
  headingNumbering: NonNullable<TemplateConfig['headingNumbering']>;
  citationFormat: CitationFormat;
  referenceAlignment: 'both' | 'left';
  referenceSpacingAfterTwips: number;
  languageTag: string;
  effectiveType: ProjectTemplateType;
  effectiveConfig: TemplateConfig;
}

let memoryDocxNoticeDismissed = false;

/** Verifica se o usuário marcou "Não mostrar novamente" no aviso de conversão .docx. */
export function isDocxConversionNoticeDismissed(): boolean {
  if (memoryDocxNoticeDismissed) return true;
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(DOCX_CONVERSION_NOTICE_KEY) === 'true';
    }
  } catch {
    // Ignora restrições de localStorage
  }
  return false;
}

/** Marca o aviso de conversão .docx para não ser exibido novamente. */
export function dismissDocxConversionNotice(): void {
  memoryDocxNoticeDismissed = true;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DOCX_CONVERSION_NOTICE_KEY, 'true');
    }
  } catch {
    // Ignora restrições de localStorage
  }
}

/** Restaura o estado do aviso de conversão (utilizado em testes). */
export function resetDocxConversionNotice(): void {
  memoryDocxNoticeDismissed = false;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DOCX_CONVERSION_NOTICE_KEY);
    }
  } catch {
    // Ignora restrições de localStorage
  }
}

function stripControlChars(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) >= 32) {
      out += input[i];
    }
  }
  return out;
}

/**
 * Gera o nome do arquivo `<nome-do-projeto>.docx` removendo caracteres inválidos
 * para sistemas de arquivos (Windows, macOS e Linux).
 */
export function getDocxFileName(projectName: string): string {
  const withoutExt = stripControlChars(projectName || '')
    .trim()
    .replace(/\.(redija|docx)$/i, '')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();

  const safeBase = withoutExt || 'projeto_redija';
  return `${safeBase}.docx`;
}

export function cmToTwips(cm: number): number {
  return Math.round(cm * 566.929133858);
}

export function cmToEmu(cm: number): number {
  return Math.round(cm * 360_000);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resolveFontName(cfg: TemplateConfig): string {
  switch (cfg.fontFamily) {
    case 'sans':
      return 'Arial';
    case 'libertinus':
      return 'Libertinus Serif';
    case 'new_cm':
      return 'New Computer Modern';
    case 'lora':
      return 'Lora';
    case 'eb_garamond':
      return 'EB Garamond';
    case 'inter':
      return 'Inter';
    case 'roboto':
      return 'Roboto';
    case 'fira_sans':
      return 'Fira Sans';
    case 'jetbrains_mono':
      return 'JetBrains Mono';
    case 'custom':
      return sanitizeCustomFontFamily(cfg.customFontFamily) || 'Times New Roman';
    case 'serif':
    default:
      return 'Times New Roman';
  }
}

function resolveEffectiveTemplateConfig(project: DocumentProject): {
  cfg: TemplateConfig;
  effectiveType: ProjectTemplateType;
} {
  const capabilities = getTemplateCapabilities(project);
  const effectiveType = capabilities.effectiveType;
  const userCfg = project.templateConfig;

  // Busca defaults do preset correspondente se o projeto usar sbc, ieee, poster, apa_7 ou article
  const presetId =
    userCfg?.preset ??
    (effectiveType === 'sbc'
      ? 'sbc'
      : effectiveType === 'ieee'
        ? 'ieee'
        : effectiveType === 'poster'
          ? 'poster'
          : effectiveType === 'artigo'
            ? 'article_1col'
            : 'abnt_classic');

  const presetDefaults = PRESETS.find((p) => p.id === presetId)?.config;

  const merged: TemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...(presetDefaults ?? {}),
    ...(userCfg ?? {}),
  };

  // Quando o usuário selecionou o preset 'sbc', 'ieee', 'apa_7' ou 'poster' mas manteve os valores de spread
  // originais da ABNT (3/3/2/2 cm, 1,5), preserva as medidas oficiais do preset como faz o typstGenerator.
  if (
    presetDefaults &&
    (merged.preset === 'sbc' ||
      merged.preset === 'ieee' ||
      merged.preset === 'apa_7' ||
      merged.preset === 'poster')
  ) {
    const matchesAbntMargins =
      userCfg?.marginTopCm === DEFAULT_TEMPLATE_CONFIG.marginTopCm &&
      userCfg?.marginLeftCm === DEFAULT_TEMPLATE_CONFIG.marginLeftCm &&
      userCfg?.marginBottomCm === DEFAULT_TEMPLATE_CONFIG.marginBottomCm &&
      userCfg?.marginRightCm === DEFAULT_TEMPLATE_CONFIG.marginRightCm;
    if (matchesAbntMargins) {
      merged.marginTopCm = presetDefaults.marginTopCm;
      merged.marginLeftCm = presetDefaults.marginLeftCm;
      merged.marginBottomCm = presetDefaults.marginBottomCm;
      merged.marginRightCm = presetDefaults.marginRightCm;
    }
    if (
      userCfg?.lineSpacing === DEFAULT_TEMPLATE_CONFIG.lineSpacing &&
      presetDefaults.lineSpacing !== DEFAULT_TEMPLATE_CONFIG.lineSpacing
    ) {
      merged.lineSpacing = presetDefaults.lineSpacing;
    }
    if (
      userCfg?.paragraphIndentCm === DEFAULT_TEMPLATE_CONFIG.paragraphIndentCm &&
      presetDefaults.paragraphIndentCm !== DEFAULT_TEMPLATE_CONFIG.paragraphIndentCm
    ) {
      merged.paragraphIndentCm = presetDefaults.paragraphIndentCm;
    }
  }

  merged.citationFormat = resolveCitationFormat(merged);
  return { cfg: merged, effectiveType };
}

/**
 * Calcula todas as medidas tipográficas e de página da norma ativa do projeto
 * convertidas para as unidades do Word (twips, half-points e EMUs).
 */
export function resolveEffectiveDocxLayout(project: DocumentProject): ResolvedDocxLayout {
  const { cfg, effectiveType } = resolveEffectiveTemplateConfig(project);

  const fontName = resolveFontName(cfg);
  const fontSizePt = Math.min(24, Math.max(8, Number(cfg.fontSizePt) || 12));
  const fontSizeHalfPt = Math.round(fontSizePt * 2);

  const lineSpacing = cfg.lineSpacing === '1.0' || cfg.lineSpacing === '2.0' ? cfg.lineSpacing : '1.5';
  const lineSpacingTwips = lineSpacing === '1.0' ? 240 : lineSpacing === '2.0' ? 480 : 360;

  const paragraphIndentCm = Math.min(4, Math.max(0, Number(cfg.paragraphIndentCm ?? 1.25)));
  const paragraphIndentTwips = cmToTwips(paragraphIndentCm);

  const marginTopCm = Math.min(6, Math.max(0.5, Number(cfg.marginTopCm) || 3));
  const marginBottomCm = Math.min(6, Math.max(0.5, Number(cfg.marginBottomCm) || 2));
  const marginLeftCm = Math.min(6, Math.max(0.5, Number(cfg.marginLeftCm) || 3));
  const marginRightCm = Math.min(6, Math.max(0.5, Number(cfg.marginRightCm) || 2));

  const orientation: 'portrait' | 'landscape' =
    effectiveType === 'poster'
      ? cfg.posterOrientation === 'landscape'
        ? 'landscape'
        : 'portrait'
      : cfg.pageOrientation === 'landscape'
        ? 'landscape'
        : 'portrait';

  // Tamanhos de papel em cm (Nota: o Word limita páginas a 55,88 cm = 31680 twips;
  // pôsteres A0/A1/A2 usam folha A4/A3 proporcional no Word para abrir sem erro de limite).
  let baseW = 21.0;
  let baseH = 29.7;
  if (cfg.paperSize === 'letter') {
    baseW = 21.59;
    baseH = 27.94;
  } else if (cfg.paperSize === 'a5') {
    baseW = 14.8;
    baseH = 21.0;
  }

  const pageWidthCm = orientation === 'landscape' ? baseH : baseW;
  const pageHeightCm = orientation === 'landscape' ? baseW : baseH;
  const pageWidthTwips = Math.min(31680, cmToTwips(pageWidthCm));
  const pageHeightTwips = Math.min(31680, cmToTwips(pageHeightCm));

  const usableWidthCm = Math.max(5, pageWidthCm - marginLeftCm - marginRightCm);
  const usableHeightCm = Math.max(5, pageHeightCm - marginTopCm - marginBottomCm);

  const columns =
    effectiveType === 'poster'
      ? Math.min(3, Math.max(1, Number(cfg.posterColumns) || 3))
      : Math.min(3, Math.max(1, Number(cfg.columns) || 1));

  const bodyAlignment: 'both' | 'left' = cfg.bodyAlignment === 'left' ? 'left' : 'both';

  const defaultRefAlign =
    effectiveType === 'sbc' || effectiveType === 'poster' ? 'justify' : 'left';
  const refAlignSetting = cfg.referenceAlignment ?? defaultRefAlign;
  const referenceAlignment: 'both' | 'left' = refAlignSetting === 'justify' ? 'both' : 'left';

  const defaultRefSpacing = effectiveType === 'ieee' || effectiveType === 'poster' ? 'compact' : 'single_blank';
  const refSpacingSetting = cfg.referenceSpacing ?? defaultRefSpacing;
  const referenceSpacingAfterTwips =
    refSpacingSetting === 'compact' ? 120 : refSpacingSetting === 'double' ? 360 : 240;

  const lang = cfg.documentLanguage ?? (effectiveType === 'ieee' ? 'en' : 'pt');
  const languageTag = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';

  const defaultHeadingNumbering =
    effectiveType === 'sbc' || effectiveType === 'ieee' || effectiveType === 'poster'
      ? 'none'
      : '1.1';
  const headingNumbering = cfg.headingNumbering ?? defaultHeadingNumbering;

  return {
    fontName,
    fontSizePt,
    fontSizeHalfPt,
    lineSpacing,
    lineSpacingTwips,
    paragraphIndentCm,
    paragraphIndentTwips,
    marginTopCm,
    marginBottomCm,
    marginLeftCm,
    marginRightCm,
    marginTopTwips: cmToTwips(marginTopCm),
    marginBottomTwips: cmToTwips(marginBottomCm),
    marginLeftTwips: cmToTwips(marginLeftCm),
    marginRightTwips: cmToTwips(marginRightCm),
    pageWidthCm,
    pageHeightCm,
    pageWidthTwips,
    pageHeightTwips,
    usableWidthCm,
    usableHeightCm,
    usableWidthTwips: cmToTwips(usableWidthCm),
    usableWidthEmu: cmToEmu(usableWidthCm),
    usableHeightEmu: cmToEmu(usableHeightCm),
    columns,
    orientation,
    bodyAlignment,
    headingNumbering,
    citationFormat: cfg.citationFormat ?? 'abnt_titlecase',
    referenceAlignment,
    referenceSpacingAfterTwips,
    languageTag,
    effectiveType,
    effectiveConfig: cfg,
  };
}

/* -------------------------------------------------------------------------- */
/* Leitura e validação de imagens binárias sem recompressão                    */
/* -------------------------------------------------------------------------- */

interface ValidatedImageAsset {
  ext: 'png' | 'jpg' | 'gif' | 'webp' | 'svg';
  mime: string;
  bytes: Uint8Array;
  widthPx: number;
  heightPx: number;
}

function parseImageDimensions(
  bytes: Uint8Array,
  ext: ValidatedImageAsset['ext'],
): { widthPx: number; heightPx: number } | null {
  if (bytes.byteLength < 8) return null;

  if (ext === 'png') {
    // Assinatura PNG: 89 50 4E 47 0D 0A 1A 0A + IHDR (mínimo 24 bytes)
    if (
      bytes.byteLength < 24 ||
      bytes[0] !== 0x89 ||
      bytes[1] !== 0x50 ||
      bytes[2] !== 0x4e ||
      bytes[3] !== 0x47
    ) {
      return null;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const widthPx = view.getUint32(16, false);
    const heightPx = view.getUint32(20, false);
    if (widthPx <= 0 || heightPx <= 0 || widthPx > 30000 || heightPx > 30000) return null;
    return { widthPx, heightPx };
  }

  if (ext === 'gif') {
    // GIF87a / GIF89a (mínimo 10 bytes)
    if (
      bytes.byteLength < 10 ||
      bytes[0] !== 0x47 ||
      bytes[1] !== 0x49 ||
      bytes[2] !== 0x46 ||
      bytes[3] !== 0x38
    ) {
      return null;
    }
    const widthPx = bytes[6] | (bytes[7] << 8);
    const heightPx = bytes[8] | (bytes[9] << 8);
    if (widthPx <= 0 || heightPx <= 0) return null;
    return { widthPx, heightPx };
  }

  if (ext === 'jpg') {
    if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
      return null;
    }
    let offset = 2;
    while (offset + 8 < bytes.byteLength) {
      if (bytes[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset++;
        continue;
      }
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (segLen < 2 || offset + 2 + segLen > bytes.byteLength) break;
      // Marcadores SOF0..SOF15 (exceto DHT 0xC4, JPG 0xC8, DAC 0xCC)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        const heightPx = (bytes[offset + 5] << 8) | bytes[offset + 6];
        const widthPx = (bytes[offset + 7] << 8) | bytes[offset + 8];
        if (widthPx > 0 && heightPx > 0) return { widthPx, heightPx };
      }
      offset += 2 + segLen;
    }
    return null;
  }

  if (ext === 'webp') {
    // RIFF....WEBP
    if (
      bytes.byteLength < 30 ||
      bytes[0] !== 0x52 ||
      bytes[1] !== 0x49 ||
      bytes[2] !== 0x46 ||
      bytes[3] !== 0x46 ||
      bytes[8] !== 0x57 ||
      bytes[9] !== 0x45 ||
      bytes[10] !== 0x42 ||
      bytes[11] !== 0x50
    ) {
      return null;
    }
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === 'VP8 ' && bytes.byteLength >= 30) {
      const widthPx = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
      const heightPx = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
      if (widthPx > 0 && heightPx > 0) return { widthPx, heightPx };
    } else if (chunk === 'VP8L' && bytes.byteLength >= 25) {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      const widthPx = 1 + (((b1 & 0x3f) << 8) | b0);
      const heightPx = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      if (widthPx > 0 && heightPx > 0) return { widthPx, heightPx };
    } else if (chunk === 'VP8X' && bytes.byteLength >= 30) {
      const widthPx = 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16));
      const heightPx = 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16));
      if (widthPx > 0 && heightPx > 0) return { widthPx, heightPx };
    }
    return { widthPx: 600, heightPx: 400 };
  }

  if (ext === 'svg') {
    const text = new TextDecoder('utf-8').decode(bytes);
    if (!/<svg\b/i.test(text)) return null;
    const vb = text.match(/viewBox\s*=\s*["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/i);
    if (vb) {
      const w = Number.parseFloat(vb[1]);
      const h = Number.parseFloat(vb[2]);
      if (w > 0 && h > 0) return { widthPx: Math.round(w), heightPx: Math.round(h) };
    }
    return { widthPx: 600, heightPx: 400 };
  }

  return null;
}

function validateAndParseImageDataUrl(dataUrl?: string | null): ValidatedImageAsset | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.trim().match(/^data:image\/([a-zA-Z0-9+.-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return null;

  const subtype = match[1].toLowerCase();
  const base64Clean = match[2].replace(/\s+/g, '');
  if (!base64Clean || base64Clean.length < 8) return null;

  let ext: ValidatedImageAsset['ext'] = 'png';
  let mime = 'image/png';
  if (subtype === 'jpeg' || subtype === 'jpg') {
    ext = 'jpg';
    mime = 'image/jpeg';
  } else if (subtype === 'gif') {
    ext = 'gif';
    mime = 'image/gif';
  } else if (subtype === 'webp') {
    ext = 'webp';
    mime = 'image/webp';
  } else if (subtype.includes('svg')) {
    ext = 'svg';
    mime = 'image/svg+xml';
  } else if (subtype !== 'png') {
    return null;
  }

  let bytes: Uint8Array;
  try {
    const binaryString = atob(base64Clean);
    bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
  } catch {
    return null;
  }

  const dims = parseImageDimensions(bytes, ext);
  if (!dims) return null;

  return {
    ext,
    mime,
    bytes,
    widthPx: dims.widthPx,
    heightPx: dims.heightPx,
  };
}

/**
 * Calcula as dimensões da imagem em EMUs respeitando a largura útil da página/célula
 * e mantendo estritamente a proporção original (`heightPx / widthPx`).
 */
export function computeImageExtentEmu(
  widthPx: number,
  heightPx: number,
  maxWidthEmu: number,
  maxHeightEmu: number,
  targetWidthEmu?: number,
): { cx: number; cy: number } {
  const safeW = Math.max(1, widthPx);
  const safeH = Math.max(1, heightPx);
  const aspect = safeH / safeW;

  // 1 pixel a 96 DPI = 9525 EMUs; imagens de 1px (ex.: testes) ganham largura visual mínima razoável
  const naturalWidthEmu = safeW <= 4 && safeH <= 4 ? Math.min(maxWidthEmu, cmToEmu(4)) : safeW * 9525;
  let cx = targetWidthEmu ? Math.min(maxWidthEmu, targetWidthEmu) : Math.min(maxWidthEmu, naturalWidthEmu);
  let cy = Math.round(cx * aspect);

  if (cy > maxHeightEmu) {
    cy = maxHeightEmu;
    cx = Math.max(1, Math.round(cy / aspect));
  }

  return { cx: Math.max(1, Math.round(cx)), cy: Math.max(1, Math.round(cy)) };
}

/* -------------------------------------------------------------------------- */
/* Construção de runs, citações, matemática inline e parágrafos OOXML          */
/* -------------------------------------------------------------------------- */

interface RunStyleFlags {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  code?: boolean;
  color?: string;
  sizeHalfPt?: number;
}

function buildRunXml(text: string, flags: RunStyleFlags = {}): string {
  if (!text) return '';
  const rPrParts: string[] = [];
  if (flags.code) {
    rPrParts.push('<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>');
  }
  if (flags.bold) {
    rPrParts.push('<w:b/><w:bCs/>');
  }
  if (flags.italic) {
    rPrParts.push('<w:i/><w:iCs/>');
  }
  if (flags.underline) {
    rPrParts.push('<w:u w:val="single"/>');
  }
  if (flags.strike) {
    rPrParts.push('<w:strike/>');
  }
  if (flags.superscript) {
    rPrParts.push('<w:vertAlign w:val="superscript"/>');
  } else if (flags.subscript) {
    rPrParts.push('<w:vertAlign w:val="subscript"/>');
  }
  if (flags.color) {
    rPrParts.push(`<w:color w:val="${flags.color}"/>`);
  }
  if (flags.sizeHalfPt) {
    rPrParts.push(`<w:sz w:val="${flags.sizeHalfPt}"/><w:szCs w:val="${flags.sizeHalfPt}"/>`);
  }

  const rPr = rPrParts.length > 0 ? `<w:rPr>${rPrParts.join('')}</w:rPr>` : '';
  const preserveSpace = /^\s|\s$|\s{2,}/.test(text) ? ' xml:space="preserve"' : '';
  return `<w:r>${rPr}<w:t${preserveSpace}>${escapeXml(text)}</w:t></w:r>`;
}

/**
 * Emite runs de texto aplicando automaticamente itálico nos termos latinos
 * "et al." e "apud" (NBR 10520:2023), igual ao PDF.
 */
function buildTextRunsWithLatinItalics(text: string, flags: RunStyleFlags = {}): string {
  if (!text) return '';
  if (flags.code || flags.italic) {
    return buildRunXml(text, flags);
  }

  const latinRe = /\b(et\s+al\.|apud\b)/gi;
  let out = '';
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = latinRe.exec(text)) !== null) {
    const before = text.slice(lastIndex, m.index);
    if (before) {
      out += buildRunXml(before, flags);
    }
    const term = m[1].toLowerCase().startsWith('et') ? 'et al.' : m[1];
    out += buildRunXml(term, { ...flags, italic: true });
    lastIndex = m.index + m[0].length;
  }

  const tail = text.slice(lastIndex);
  if (tail) {
    out += buildRunXml(tail, flags);
  }

  return out;
}

function extractHtmlAttr(attrs: string, name: string): string | undefined {
  const regex = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = attrs.match(regex);
  if (!match) return undefined;
  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '');
}

interface DocxBuildContext {
  layout: ResolvedDocxLayout;
  orderedRefs: AcademicReference[];
  refIndexMap: Map<string, number>;
  currentSectionLabel: string;
  blockId: string;
  registerHyperlink: (url: string) => string;
  failedEquations: FailedEquationReport[];
  missingCitations: MissingCitationReport[];
  equationTotalCounter: { count: number };
}

function convertSimpleHtmlToRuns(html: string, baseFlags: RunStyleFlags = {}): string {
  const cleanInput = html.replace(
    /<(\/?)(?!strong\b|b\b|em\b|i\b|u\b|s\b|strike\b|del\b|sup\b|sub\b|br\b|p\b)[a-z][^>]*>/gi,
    '',
  );

  const tokenRegex = /<(\/?)(strong|b|em|i|u|s|strike|del|sup|sub|br|p)\b[^>]*>/gi;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const tagStack: string[] = [];

  const currentFlags = (): RunStyleFlags => {
    const f: RunStyleFlags = { ...baseFlags };
    for (const t of tagStack) {
      if (t === 'strong' || t === 'b') f.bold = true;
      else if (t === 'em' || t === 'i') f.italic = true;
      else if (t === 'u') f.underline = true;
      else if (t === 's' || t === 'strike' || t === 'del') f.strike = true;
      else if (t === 'sup') f.superscript = true;
      else if (t === 'sub') f.subscript = true;
    }
    return f;
  };

  while ((match = tokenRegex.exec(cleanInput)) !== null) {
    const rawText = cleanInput.slice(lastIndex, match.index);
    if (rawText) {
      result += buildTextRunsWithLatinItalics(decodeHtmlEntities(rawText), currentFlags());
    }

    const isClosing = match[1] === '/';
    const tag = match[2].toLowerCase();

    if (tag === 'br') {
      result += '<w:r><w:br/></w:r>';
    } else if (tag === 'p') {
      if (isClosing && match.index + match[0].length < cleanInput.length) {
        result += buildRunXml(' ', currentFlags());
      }
    } else if (!isClosing) {
      tagStack.push(tag);
    } else {
      const idx = tagStack.lastIndexOf(tag);
      if (idx !== -1) {
        tagStack.splice(idx, 1);
      } else if (tagStack.length > 0) {
        tagStack.pop();
      }
    }

    lastIndex = match.index + match[0].length;
  }

  const tail = cleanInput.slice(lastIndex);
  if (tail) {
    result += buildTextRunsWithLatinItalics(decodeHtmlEntities(tail), currentFlags());
  }

  return result;
}

/**
 * Converte o HTML rico de um bloco do editor (TipTap) em elementos XML de parágrafo do Word
 * (`<w:r>`, `<w:hyperlink>`, `<m:oMath>`), compartilhando a formatação de citações com o PDF.
 */
function richHtmlToDocxInlineXml(
  input: string,
  ctx: DocxBuildContext,
  baseFlags: RunStyleFlags = {},
): string {
  if (!input) return '';

  if (!/<\/?[a-z][\s\S]*>/i.test(input)) {
    return buildTextRunsWithLatinItalics(input, baseFlags);
  }

  const sanitized = input
    .replace(/[\0\uE000\uE001]/g, '')
    .replace(/<(script|style|iframe)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  const atoms: string[] = [];
  const pushAtom = (xmlSnippet: string): string => {
    const idx = atoms.length;
    atoms.push(xmlSnippet);
    return `\uE000REDIJADOCXATOM${idx}\uE001`;
  };

  // 1. Citações estruturadas (<cite data-cite-id="..."> ou <span data-cite-id="...">)
  const citeTagRe =
    /<cite\b([^>]*)>([\s\S]*?)<\/cite>|<span\b([^>]*data-cite-id=[^>]*)>([\s\S]*?)<\/span>/gi;

  type ParsedCite = {
    index: number;
    length: number;
    attrs: string;
    inner: string;
  };

  type ResolvedCite = {
    groupable: boolean;
    xml: string;
    groupRef?: AcademicReference;
    groupPage?: string;
    groupRefNumber?: number;
  };

  const citeMatches: ParsedCite[] = [];
  let citeMatch: RegExpExecArray | null;
  while ((citeMatch = citeTagRe.exec(sanitized)) !== null) {
    citeMatches.push({
      index: citeMatch.index,
      length: citeMatch[0].length,
      attrs: (citeMatch[1] ?? citeMatch[3] ?? '') as string,
      inner: (citeMatch[2] ?? citeMatch[4] ?? '') as string,
    });
  }

  const format = ctx.layout.citationFormat;

  const resolveOneCite = (parsed: ParsedCite): ResolvedCite => {
    const citeId = extractHtmlAttr(parsed.attrs, 'data-cite-id')?.trim() || '';
    const page = extractHtmlAttr(parsed.attrs, 'data-cite-page')?.trim() || undefined;
    const rawMode = extractHtmlAttr(parsed.attrs, 'data-cite-mode')?.trim();
    const mode = rawMode === 'narrative' ? 'narrative' : 'parenthetical';
    const fallbackText = stripHtmlTags(parsed.inner) || '[Ref removida]';

    const ref = citeId ? ctx.orderedRefs.find((r) => r.id === citeId) : undefined;
    if (!ref) {
      ctx.missingCitations.push({
        citeId: citeId || 'desconhecida',
        label: fallbackText,
        location: ctx.currentSectionLabel,
        blockId: ctx.blockId,
      });
      return {
        groupable: false,
        xml: buildTextRunsWithLatinItalics(fallbackText, baseFlags),
      };
    }

    const refNumber = ctx.refIndexMap.get(ref.id) ?? 1;
    const display = resolveCitationDisplay(ref, {
      format,
      mode,
      page,
      refNumber,
    });

    if (format === 'superscript') {
      const supStr = toUnicodeSuperscript(refNumber);
      if (mode === 'narrative') {
        const authorPart = display.label.slice(0, display.label.length - supStr.length);
        return {
          groupable: false,
          xml:
            buildTextRunsWithLatinItalics(authorPart, baseFlags) +
            buildRunXml(String(refNumber), { ...baseFlags, superscript: true }),
        };
      }
      return {
        groupable: false,
        xml: buildRunXml(String(refNumber), { ...baseFlags, superscript: true }),
      };
    }

    const canGroup = mode === 'parenthetical' && isGroupableParentheticalFormat(format);
    return {
      groupable: canGroup,
      xml: buildTextRunsWithLatinItalics(display.label, baseFlags),
      groupRef: canGroup ? ref : undefined,
      groupPage: canGroup ? page : undefined,
      groupRefNumber: canGroup ? refNumber : undefined,
    };
  };

  const flushGroupBuffer = (buffer: ResolvedCite[]): string => {
    if (buffer.length === 0) return '';
    if (buffer.length === 1) return pushAtom(buffer[0].xml);
    if (buffer.every((b) => b.groupRef)) {
      const grouped = resolveGroupedParentheticalDisplay(
        buffer.map((b) => ({
          ref: b.groupRef!,
          page: b.groupPage,
          refNumber: b.groupRefNumber,
        })),
        format,
      );
      return pushAtom(buildTextRunsWithLatinItalics(grouped.label, baseFlags));
    }
    return buffer.map((b) => pushAtom(b.xml)).join(' ');
  };

  let withAtoms = '';
  let cursor = 0;
  let matchIdx = 0;
  while (matchIdx < citeMatches.length) {
    const run: ParsedCite[] = [citeMatches[matchIdx]];
    while (matchIdx + run.length < citeMatches.length) {
      const prev = run[run.length - 1];
      const next = citeMatches[matchIdx + run.length];
      const between = sanitized.slice(prev.index + prev.length, next.index);
      if (!/^\s*$/.test(between)) break;
      run.push(next);
    }

    withAtoms += sanitized.slice(cursor, run[0].index);

    const resolved = run.map(resolveOneCite);
    const emitted: string[] = [];
    let buffer: ResolvedCite[] = [];
    for (const item of resolved) {
      if (item.groupable) {
        buffer.push(item);
      } else {
        if (buffer.length > 0) {
          emitted.push(flushGroupBuffer(buffer));
          buffer = [];
        }
        emitted.push(pushAtom(item.xml));
      }
    }
    if (buffer.length > 0) {
      emitted.push(flushGroupBuffer(buffer));
    }
    withAtoms += emitted.join(' ');

    const last = run[run.length - 1];
    cursor = last.index + last.length;
    matchIdx += run.length;
  }
  withAtoms += sanitized.slice(cursor);

  // 2. Matemática inline (<span data-inline-math="true" data-math="...">)
  withAtoms = withAtoms.replace(
    /<span\b([^>]*data-inline-math=[^>]*)>([\s\S]*?)<\/span>/gi,
    (_full, attrs: string, inner: string) => {
      const rawExpr = (extractHtmlAttr(attrs, 'data-math') || stripHtmlTags(inner)).trim();
      if (!rawExpr) return '';
      const eqIdx = ++ctx.equationTotalCounter.count;
      const mathRes = convertMathToOmml(rawExpr, false);
      if (mathRes.ok) {
        return pushAtom(mathRes.omml);
      }
      ctx.failedEquations.push({
        index: eqIdx,
        location: `${ctx.currentSectionLabel} (equação inline #${eqIdx})`,
        expression: mathRes.rawCode,
        blockId: ctx.blockId,
      });
      return pushAtom(buildRunXml(mathRes.rawCode, { ...baseFlags, code: true }));
    },
  );

  // 3. Código inline (<code>...</code>)
  withAtoms = withAtoms.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_full, inner: string) => {
    const rawCode = decodeHtmlEntities(inner.replace(/<[^>]+>/g, ''));
    if (!rawCode) return '';
    return pushAtom(buildRunXml(rawCode, { ...baseFlags, code: true }));
  });

  // 4. Hyperlinks (<a href="...">...</a>)
  withAtoms = withAtoms.replace(
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (_full, attrs: string, inner: string) => {
      const href = extractHtmlAttr(attrs, 'href') ?? '';
      const safeUrl = sanitizeLinkUrl(href);
      if (!safeUrl) {
        return pushAtom(convertSimpleHtmlToRuns(inner, baseFlags));
      }
      const rId = ctx.registerHyperlink(safeUrl);
      const innerRuns = convertSimpleHtmlToRuns(inner || safeUrl, {
        ...baseFlags,
        underline: true,
        color: '0563C1',
      });
      return pushAtom(`<w:hyperlink r:id="${rId}">${innerRuns}</w:hyperlink>`);
    },
  );

  // Divide pelos átomos preservando a formatação de tags HTML que os envolvem
  const atomTokenRe = /\uE000REDIJADOCXATOM(\d+)\uE001/g;
  if (!atomTokenRe.test(withAtoms)) {
    return convertSimpleHtmlToRuns(withAtoms, baseFlags);
  }

  // Converte os segmentos de texto entre átomos, mantendo os átomos intactos
  let restored = convertSimpleHtmlToRuns(withAtoms, baseFlags);
  for (let pass = 0; pass < atoms.length + 1 && restored.includes('\uE000REDIJADOCXATOM'); pass++) {
    restored = restored.replace(
      /<w:r>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:t[^>]*>([\s\S]*?)<\/w:t><\/w:r>/g,
      (fullRun, textContent: string) => {
        if (!textContent.includes('\uE000REDIJADOCXATOM')) return fullRun;
        const parts = textContent.split(/(\uE000REDIJADOCXATOM\d+\uE001)/g);
        return parts
          .map((part) => {
            const m = part.match(/^\uE000REDIJADOCXATOM(\d+)\uE001$/);
            if (m) return atoms[Number(m[1])] ?? '';
            if (!part) return '';
            return fullRun.replace(
              /<w:t[^>]*>[\s\S]*?<\/w:t>/,
              `<w:t xml:space="preserve">${part}</w:t>`,
            );
          })
          .join('');
      },
    );
  }

  return restored;
}

/**
 * Converte a string retornada por `transpileReference(ref, cfg, entryFormat)` (fonte única de verdade
 * com o PDF) em runs `<w:r>` do Word, transformando `#strong[...]`, `#emph[...]` e `#underline[...]`.
 */
function typstReferenceMarkupToDocxRuns(typstRef: string): string {
  let body = typstRef.trim();
  if (body.startsWith('[') && body.endsWith(']') && body.length >= 2) {
    body = body.slice(1, -1);
  }

  const unescapeTypst = (s: string) => s.replace(/\\([\\#*_`$@<>[\]~/=+-]|[.)])/g, '$1');

  const tagRe = /#(strong|emph|underline)\[([^\]]*)\]/g;
  let out = '';
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = tagRe.exec(body)) !== null) {
    const before = body.slice(lastIndex, m.index);
    if (before) {
      out += buildTextRunsWithLatinItalics(unescapeTypst(before));
    }
    const kind = m[1];
    const innerText = unescapeTypst(m[2]);
    if (kind === 'strong') {
      out += buildRunXml(innerText, { bold: true });
    } else if (kind === 'emph') {
      out += buildRunXml(innerText, { italic: true });
    } else if (kind === 'underline') {
      out += buildRunXml(innerText, { underline: true });
    }
    lastIndex = m.index + m[0].length;
  }

  const tail = body.slice(lastIndex);
  if (tail) {
    out += buildTextRunsWithLatinItalics(unescapeTypst(tail));
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/* Desenho de imagens OOXML (<w:drawing>)                                      */
/* -------------------------------------------------------------------------- */

function buildDrawingXml(
  rId: string,
  docPrId: number,
  name: string,
  cx: number,
  cy: number,
  altText: string,
): string {
  const safeName = escapeXml(name);
  const safeDescr = escapeXml(altText || name);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${safeName}" descr="${safeDescr}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${safeName}" descr="${safeDescr}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

/* -------------------------------------------------------------------------- */
/* Geração dos arquivos internos do pacote OpenXML (.docx)                     */
/* -------------------------------------------------------------------------- */

function buildStylesXml(layout: ResolvedDocxLayout): string {
  const font = escapeXml(layout.fontName);
  const sz = layout.fontSizeHalfPt;
  const smallSz = Math.max(16, Math.round(sz * 0.85)); // ~10pt para fonte 12pt
  const line = layout.lineSpacingTwips;
  const indent = layout.paragraphIndentTwips;
  const bodyJc = layout.bodyAlignment;
  const quoteIndent = layout.effectiveType === 'ieee' ? cmToTwips(1.5) : layout.effectiveType === 'sbc' ? cmToTwips(3) : cmToTwips(4);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>
        <w:sz w:val="${sz}"/>
        <w:szCs w:val="${sz}"/>
        <w:lang w:val="${layout.languageTag}" w:eastAsia="${layout.languageTag}" w:bidi="ar-SA"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="120" w:line="${line}" w:lineRule="auto"/>
        <w:jc w:val="${bodyJc}"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="120" w:line="${line}" w:lineRule="auto"/>
      <w:ind w:firstLine="${indent}"/>
      <w:jc w:val="${bodyJc}"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>
      <w:sz w:val="${sz}"/>
      <w:szCs w:val="${sz}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:aliases w:val="Título 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="240" w:after="120" w:line="${line}" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="${sz}"/>
      <w:szCs w:val="${sz}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:aliases w:val="Título 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="200" w:after="120" w:line="${line}" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="1"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="${sz}"/>
      <w:szCs w:val="${sz}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:aliases w:val="Título 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="160" w:after="100" w:line="${line}" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="2"/>
    </w:pPr>
    <w:rPr>
      <w:i/>
      <w:iCs/>
      <w:sz w:val="${sz}"/>
      <w:szCs w:val="${sz}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="heading 4"/>
    <w:aliases w:val="Título 4"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="140" w:after="80" w:line="${line}" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="3"/>
    </w:pPr>
    <w:rPr>
      <w:u w:val="single"/>
      <w:sz w:val="${sz}"/>
      <w:szCs w:val="${sz}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading5">
    <w:name w:val="heading 5"/>
    <w:aliases w:val="Título 5"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:keepLines/>
      <w:spacing w:before="120" w:after="80" w:line="${line}" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="left"/>
      <w:outlineLvl w:val="4"/>
    </w:pPr>
    <w:rPr>
      <w:sz w:val="${sz}"/>
      <w:szCs w:val="${sz}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Caption">
    <w:name w:val="caption"/>
    <w:aliases w:val="Legenda"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="160" w:after="80" w:line="240" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="center"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:bCs/>
      <w:sz w:val="${smallSz}"/>
      <w:szCs w:val="${smallSz}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/>
    <w:aliases w:val="Citação Direta Longa"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="180" w:after="180" w:line="240" w:lineRule="auto"/>
      <w:ind w:left="${quoteIndent}" w:firstLine="0"/>
      <w:jc w:val="both"/>
    </w:pPr>
    <w:rPr>
      <w:sz w:val="${smallSz}"/>
      <w:szCs w:val="${smallSz}"/>
    </w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/>
    <w:aliases w:val="Parágrafo de Lista"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="60" w:line="${line}" w:lineRule="auto"/>
      <w:ind w:left="720" w:hanging="360"/>
      <w:jc w:val="${bodyJc}"/>
    </w:pPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="ReferenceItem">
    <w:name w:val="Bibliography"/>
    <w:aliases w:val="Referência Bibliográfica"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:before="0" w:after="${layout.referenceSpacingAfterTwips}" w:line="240" w:lineRule="auto"/>
      <w:ind w:firstLine="0"/>
      <w:jc w:val="${layout.referenceAlignment}"/>
    </w:pPr>
  </w:style>

  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr>
      <w:color w:val="0563C1"/>
      <w:u w:val="single"/>
    </w:rPr>
  </w:style>
</w:styles>`;
}

function buildNumberingXml(numberedGroupCount: number): string {
  const extraNums: string[] = [];
  for (let i = 0; i < numberedGroupCount; i++) {
    const numId = 2 + i;
    extraNums.push(`  <w:num w:numId="${numId}">
    <w:abstractNumId w:val="1"/>
    <w:lvlOverride w:ilvl="0">
      <w:startOverride w:val="1"/>
    </w:lvlOverride>
  </w:num>`);
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr>
        <w:ind w:left="720" w:hanging="360"/>
      </w:pPr>
    </w:lvl>
  </w:abstractNum>
  <w:num w:numId="1">
    <w:abstractNumId w:val="0"/>
  </w:num>
${extraNums.join('\n')}
</w:numbering>`;
}

function buildSettingsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="708"/>
  <w:hyphenationZone w:val="425"/>
  <m:mathPr>
    <m:mathFont m:val="Cambria Math"/>
    <m:brkBin m:val="before"/>
    <m:brkBinSub m:val="--"/>
    <m:smallFrac m:val="0"/>
    <m:dispDef/>
    <m:lMargin m:val="0"/>
    <m:rMargin m:val="0"/>
    <m:defJc m:val="centerGroup"/>
    <m:wrapIndent m:val="1440"/>
    <m:intLim m:val="subSup"/>
    <m:naryLim m:val="undOvr"/>
  </m:mathPr>
</w:settings>`;
}

function buildFontTableXml(fontName: string): string {
  const safeFont = escapeXml(fontName);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="${safeFont}">
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Times New Roman">
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Arial">
    <w:charset w:val="00"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Cambria Math">
    <w:charset w:val="00"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Courier New">
    <w:charset w:val="00"/>
    <w:family w:val="modern"/>
    <w:pitch w:val="fixed"/>
  </w:font>
</w:fonts>`;
}

function buildCorePropsXml(project: DocumentProject): string {
  const nowIso = new Date().toISOString();
  const title = escapeXml(project.metadata.title?.trim() || project.name);
  const author = escapeXml(project.metadata.author?.trim() || 'Autor');
  const description = escapeXml(project.metadata.abstract?.trim() || '');
  const keywords = escapeXml((project.metadata.keywords ?? []).join('; '));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${title}</dc:title>
  <dc:creator>${author}</dc:creator>
  <dc:description>${description}</dc:description>
  <cp:keywords>${keywords}</cp:keywords>
  <cp:lastModifiedBy>RedijaApp</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;
}

function buildAppPropsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>RedijaApp</Application>
  <AppVersion>1.0000</AppVersion>
</Properties>`;
}

function buildRootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function buildContentTypesXml(mediaExtensions: Set<string>): string {
  const defaultMimes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };

  const mediaDefaults = [...mediaExtensions]
    .map((ext) => `  <Default Extension="${ext}" ContentType="${defaultMimes[ext] || 'image/png'}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
${mediaDefaults ? `${mediaDefaults}\n` : ''}  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function toRoman(num: number): string {
  const romans: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let n = Math.max(1, Math.floor(num));
  let res = '';
  for (const [val, sym] of romans) {
    while (n >= val) {
      res += sym;
      n -= val;
    }
  }
  return res;
}

function formatHeadingNumber(counters: number[], level: number, style: ResolvedDocxLayout['headingNumbering']): string {
  if (style === 'none') return '';
  const slice = counters.slice(0, level);
  if (style === 'I.A') {
    if (level === 1) return `${toRoman(slice[0])}. `;
    if (level === 2) return `${String.fromCharCode(64 + Math.max(1, slice[1]))}. `;
    return `${slice.join('.')} `;
  }
  if (style === '1.') {
    return `${slice.join('.')}. `;
  }
  return `${slice.join('.')} `;
}

function getLocalizedLabels(lang?: DocumentLanguage): {
  abstract: string;
  keywords: string;
  references: string;
  glossary: string;
  appendices: string;
  annexes: string;
  source: string;
  figure: string;
  table: string;
  box: string;
} {
  if (lang === 'en') {
    return {
      abstract: 'ABSTRACT',
      keywords: 'Keywords',
      references: 'References',
      glossary: 'GLOSSARY',
      appendices: 'APPENDICES',
      annexes: 'ANNEXES',
      source: 'Source',
      figure: 'Figura',
      table: 'Tabela',
      box: 'Quadro',
    };
  }
  if (lang === 'es') {
    return {
      abstract: 'RESUMEN',
      keywords: 'Palabras clave',
      references: 'Referencias',
      glossary: 'GLOSARIO',
      appendices: 'APÉNDICES',
      annexes: 'ANEXOS',
      source: 'Fuente',
      figure: 'Figura',
      table: 'Tabela',
      box: 'Quadro',
    };
  }
  return {
    abstract: 'RESUMO',
    keywords: 'Palavras-chave',
    references: 'Referências',
    glossary: 'GLOSSÁRIO',
    appendices: 'APÊNDICES',
    annexes: 'ANEXOS',
    source: 'Fonte',
    figure: 'Figura',
    table: 'Tabela',
    box: 'Quadro',
  };
}

/**
 * Monta o pacote `.docx` completo em memória com JSZip.
 */
export async function buildDocxArchive(project: DocumentProject): Promise<DocxExportResult> {
  const layout = resolveEffectiveDocxLayout(project);
  const cfg = layout.effectiveConfig;
  const ordering = cfg.referenceOrdering ?? 'alphabetical';
  const orderedRefs = getOrderedReferences(project.references || [], ordering, project.blocks);
  const refIndexMap = new Map<string, number>();
  orderedRefs.forEach((ref, idx) => refIndexMap.set(ref.id, idx + 1));
  const registeredSurnames = new Set(
    orderedRefs.map((r) => getPrimarySurname(r.authors)).filter(Boolean),
  );

  const missingImages: MissingImageReport[] = [];
  const failedEquations: FailedEquationReport[] = [];
  const missingCitations: MissingCitationReport[] = [];

  const mediaFiles: Array<{ rId: string; fileName: string; ext: string; bytes: Uint8Array }> = [];
  const mediaExtensions = new Set<string>();
  const hyperlinks: Array<{ rId: string; url: string }> = [];
  let nextRelIdx = 10;
  let nextDocPrId = 1;

  const registerMedia = (asset: ValidatedImageAsset): string => {
    const rId = `rIdMedia${nextRelIdx++}`;
    const fileName = `image${mediaFiles.length + 1}.${asset.ext}`;
    mediaFiles.push({ rId, fileName, ext: asset.ext, bytes: asset.bytes });
    mediaExtensions.add(asset.ext);
    return rId;
  };

  const registerHyperlink = (url: string): string => {
    const existing = hyperlinks.find((h) => h.url === url);
    if (existing) return existing.rId;
    const rId = `rIdLink${nextRelIdx++}`;
    hyperlinks.push({ rId, url });
    return rId;
  };

  const bodyElements: string[] = [];
  const labels = getLocalizedLabels(cfg.documentLanguage);
  const smallSz = Math.max(16, Math.round(layout.fontSizeHalfPt * 0.85));

  // 1. Cabeçalho / Identificação Inicial e Resumo (se preenchidos nos metadados)
  const m = project.metadata;
  if (m.institution?.trim()) {
    bodyElements.push(
      `<w:p><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(m.institution.trim().toUpperCase(), { bold: true })}</w:p>`,
    );
  }
  if (m.course?.trim()) {
    bodyElements.push(
      `<w:p><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(m.course.trim(), {})}</w:p>`,
    );
  }
  if (m.title?.trim()) {
    const fullTitle = m.subtitle?.trim()
      ? `${m.title.trim()}: ${m.subtitle.trim()}`
      : m.title.trim();
    bodyElements.push(
      `<w:p><w:pPr><w:spacing w:before="240" w:after="120"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(fullTitle, { bold: true })}</w:p>`,
    );
  }
  if (m.author?.trim()) {
    bodyElements.push(
      `<w:p><w:pPr><w:spacing w:after="180"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(m.author.trim(), { bold: true })}</w:p>`,
    );
  }

  if (m.abstract?.trim()) {
    bodyElements.push(
      `<w:p><w:pPr><w:spacing w:before="200" w:after="80"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(labels.abstract, { bold: true })}</w:p>`,
    );
    bodyElements.push(
      `<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="both"/></w:pPr>${buildTextRunsWithLatinItalics(m.abstract.trim())}</w:p>`,
    );
    const kws = (m.keywords ?? []).map((k) => k.trim()).filter(Boolean);
    if (kws.length > 0) {
      bodyElements.push(
        `<w:p><w:pPr><w:spacing w:after="200" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="both"/></w:pPr>${buildRunXml(`${labels.keywords}: `, { bold: true })}${buildRunXml(`${kws.join('; ')}.`)}</w:p>`,
      );
    }
  }

  if (m.foreignAbstract?.trim()) {
    bodyElements.push(
      `<w:p><w:pPr><w:spacing w:before="200" w:after="80"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml('ABSTRACT', { bold: true })}</w:p>`,
    );
    bodyElements.push(
      `<w:p><w:pPr><w:spacing w:after="120" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="both"/></w:pPr>${buildTextRunsWithLatinItalics(m.foreignAbstract.trim())}</w:p>`,
    );
    const fkws = (m.foreignKeywords ?? []).map((k) => k.trim()).filter(Boolean);
    if (fkws.length > 0) {
      bodyElements.push(
        `<w:p><w:pPr><w:spacing w:after="200" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="both"/></w:pPr>${buildRunXml('Keywords: ', { bold: true })}${buildRunXml(`${fkws.join('; ')}.`)}</w:p>`,
      );
    }
  }

  // 2. Contadores sequenciais idênticos ao PDF
  const headingCounters = [0, 0, 0, 0, 0];
  let figureCount = 0;
  let tableCount = 0;
  let boxCount = 0;
  let numberedEquationCount = 0;
  const equationTotalCounter = { count: 0 };
  let numberedListGroupCount = 0;
  let activeNumberedNumId: number | null = null;
  let currentSectionLabel = 'Início do documento';

  // 3. Transpilação de cada bloco do projeto
  for (const block of project.blocks) {
    if (block.type !== 'numbered') {
      activeNumberedNumId = null;
    }

    const ctx: DocxBuildContext = {
      layout,
      orderedRefs,
      refIndexMap,
      currentSectionLabel,
      blockId: block.id,
      registerHyperlink,
      failedEquations,
      missingCitations,
      equationTotalCounter,
    };

    switch (block.type) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5': {
        const plainTitle = stripManualNumbering(stripHtmlTags(block.content));
        if (!plainTitle) break;
        const level = Number(block.type[1]);
        headingCounters[level - 1] += 1;
        for (let l = level; l < 5; l++) headingCounters[l] = 0;

        const numPrefix = formatHeadingNumber(headingCounters, level, layout.headingNumbering);
        const displayTitle =
          level === 1 && layout.effectiveType !== 'sbc' && layout.effectiveType !== 'ieee'
            ? `${numPrefix}${plainTitle.toUpperCase()}`
            : `${numPrefix}${plainTitle}`;
        currentSectionLabel = `Seção "${(`${numPrefix}${plainTitle}`).trim()}"`;

        const styleId = `Heading${level}`;
        const runFlags: RunStyleFlags = {
          bold: level <= 2,
          italic: level === 3,
          underline: level === 4,
        };
        bodyElements.push(
          `<w:p><w:pPr><w:pStyle w:val="${styleId}"/><w:outlineLvl w:val="${level - 1}"/></w:pPr>${buildRunXml(displayTitle, runFlags)}</w:p>`,
        );
        break;
      }

      case 'unnumbered_heading': {
        const plainTitle = stripManualNumbering(stripHtmlTags(block.content));
        if (!plainTitle) break;
        const upperTitle = plainTitle.toUpperCase();
        currentSectionLabel = `Seção "${upperTitle}"`;
        bodyElements.push(
          `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:outlineLvl w:val="0"/></w:pPr>${buildRunXml(upperTitle, { bold: true })}</w:p>`,
        );
        break;
      }

      case 'paragraph': {
        const plainText = stripHtmlTags(block.content);
        const hasInlineSpecial = /<(?:cite|span)\b[^>]*data-(?:cite-id|inline-math)=/i.test(
          block.content,
        );
        if (!plainText && !hasInlineSpecial) break;
        const runsXml = richHtmlToDocxInlineXml(block.content, ctx);
        bodyElements.push(`<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${runsXml}</w:p>`);
        break;
      }

      case 'bullet': {
        const plainText = stripHtmlTags(block.content);
        if (!plainText) break;
        const runsXml = richHtmlToDocxInlineXml(block.content, ctx);
        bodyElements.push(
          `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${runsXml}</w:p>`,
        );
        break;
      }

      case 'numbered': {
        const plainText = stripHtmlTags(block.content);
        if (!plainText) break;
        if (activeNumberedNumId === null) {
          numberedListGroupCount += 1;
          activeNumberedNumId = 1 + numberedListGroupCount;
        }
        const cleanedContent = block.content.replace(/^(\s*<p[^>]*>)?\s*\d+[.)]\s+/i, '$1');
        const runsXml = richHtmlToDocxInlineXml(cleanedContent, ctx);
        bodyElements.push(
          `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="${activeNumberedNumId}"/></w:numPr></w:pPr>${runsXml}</w:p>`,
        );
        break;
      }

      case 'quote_long': {
        const plainText = stripHtmlTags(block.content);
        if (!plainText) break;
        const bodyRuns = richHtmlToDocxInlineXml(block.content, ctx, { sizeHalfPt: smallSz });

        let refRuns = '';
        const authorMeta = block.meta?.author?.trim();
        const yearMeta = block.meta?.year?.trim();
        const pageMeta = block.meta?.page?.trim();

        if (authorMeta) {
          const { surnames } = parseCitationAuthors(authorMeta);
          const primary = surnames[0] || getPrimarySurname(authorMeta);
          const matchedRef = orderedRefs.find(
            (r) =>
              getPrimarySurname(r.authors) === primary &&
              (!yearMeta || r.year?.trim() === yearMeta),
          ) ?? orderedRefs.find((r) => getPrimarySurname(r.authors) === primary);

          if (!matchedRef && primary && !registeredSurnames.has(primary)) {
            const missingLabel = `(${primary}, ${yearMeta || 's.d.'})`;
            missingCitations.push({
              citeId: `quote_${block.id}`,
              label: missingLabel,
              location: currentSectionLabel,
              blockId: block.id,
            });
          }

          if (layout.citationFormat === 'ieee_numeric' || layout.citationFormat === 'superscript') {
            const idx = (matchedRef ? refIndexMap.get(matchedRef.id) : undefined) ?? 1;
            if (layout.citationFormat === 'ieee_numeric') {
              const pageSuffix = pageMeta ? `, p. ${pageMeta}` : '';
              refRuns = buildRunXml(` [${idx}${pageSuffix}]`, { sizeHalfPt: smallSz });
            } else {
              refRuns =
                buildRunXml(' ', { sizeHalfPt: smallSz }) +
                buildRunXml(String(idx), { sizeHalfPt: smallSz, superscript: true });
            }
          } else {
            const formattedCite = formatCitationReference(
              authorMeta,
              yearMeta,
              pageMeta,
              layout.citationFormat,
            );
            if (formattedCite) {
              refRuns = buildTextRunsWithLatinItalics(` (${formattedCite})`, {
                sizeHalfPt: smallSz,
              });
            }
          }
        }

        bodyElements.push(
          `<w:p><w:pPr><w:pStyle w:val="Quote"/></w:pPr>${bodyRuns}${refRuns}</w:p>`,
        );
        break;
      }

      case 'equation': {
        const rawExpr = block.content.trim();
        if (!rawExpr) break;

        const isNumbered = block.meta?.equationNumbered !== false;
        if (isNumbered) numberedEquationCount += 1;
        const eqIdx = ++equationTotalCounter.count;
        const eqNumberLabel = isNumbered ? `(${numberedEquationCount})` : '';

        const mathRes = convertMathToOmml(rawExpr, true);
        const centerTab = Math.round(layout.usableWidthTwips / 2);
        const rightTab = layout.usableWidthTwips;

        if (mathRes.ok) {
          if (isNumbered) {
            bodyElements.push(
              `<w:p><w:pPr><w:tabs><w:tab w:val="center" w:pos="${centerTab}"/><w:tab w:val="right" w:pos="${rightTab}"/></w:tabs><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${mathRes.omml}<w:r><w:tab/>${escapeXml(eqNumberLabel) ? `<w:t>${escapeXml(eqNumberLabel)}</w:t>` : ''}</w:r></w:p>`,
            );
          } else {
            bodyElements.push(
              `<w:p><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${mathRes.omml}</w:p>`,
            );
          }
        } else {
          failedEquations.push({
            index: eqIdx,
            location: `${currentSectionLabel} (bloco de equação #${eqIdx})`,
            expression: mathRes.rawCode,
            blockId: block.id,
          });
          const fallbackRun = buildRunXml(mathRes.rawCode, { code: true });
          const numRun = isNumbered ? `<w:r><w:tab/><w:t>${escapeXml(eqNumberLabel)}</w:t></w:r>` : '';
          bodyElements.push(
            `<w:p><w:pPr><w:tabs><w:tab w:val="right" w:pos="${rightTab}"/></w:tabs><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${fallbackRun}${numRun}</w:p>`,
          );
        }
        break;
      }

      case 'table':
      case 'box': {
        const isBox = block.type === 'box';
        const itemNum = isBox ? ++boxCount : ++tableCount;
        const labelPrefix = isBox ? labels.box : labels.table;
        const caption = (
          block.meta?.caption?.trim() || (isBox ? 'Quadro comparativo' : 'Tabela de dados')
        ).replace(/\.+$/, '');
        const source = (block.meta?.source?.trim() || 'do autor').replace(/\.+$/, '');
        const headers = block.meta?.headers?.length
          ? block.meta.headers
          : ['Coluna 1', 'Coluna 2'];
        const rows = block.meta?.rows?.length ? block.meta.rows : [['Dado 1', 'Dado 2']];

        // 1. Legenda acima no estilo nativo "Caption" ("Legenda")
        bodyElements.push(
          `<w:p><w:pPr><w:pStyle w:val="Caption"/></w:pPr>${buildRunXml(`${labelPrefix} ${itemNum} – ${caption}`, { bold: true, sizeHalfPt: smallSz })}</w:p>`,
        );

        // 2. Tabela nativa e editável do Word (<w:tbl>)
        const colCount = Math.max(1, headers.length);
        const colWidthTwips = Math.floor(layout.usableWidthTwips / colCount);
        const gridCols = Array(colCount)
          .fill(`<w:gridCol w:w="${colWidthTwips}"/>`)
          .join('');

        // Na ABNT/IBGE, Tabela é aberta nas laterais e Quadro é fechado nos 4 lados
        const sideBorder = isBox
          ? '<w:left w:val="single" w:sz="4" w:space="0" w:color="8C8C8C"/><w:right w:val="single" w:sz="4" w:space="0" w:color="8C8C8C"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="8C8C8C"/>'
          : '<w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/>';

        const tblBorders = `<w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="666666"/>${sideBorder}<w:bottom w:val="single" w:sz="6" w:space="0" w:color="666666"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/></w:tblBorders>`;

        const headerCellsXml = headers
          .map(
            (h) =>
              `<w:tc><w:tcPr><w:tcW w:w="${colWidthTwips}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F0F0F0"/></w:tcPr><w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="left"/></w:pPr>${buildRunXml(h.trim(), { bold: true, sizeHalfPt: smallSz })}</w:p></w:tc>`,
          )
          .join('');

        const headerRowXml = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${headerCellsXml}</w:tr>`;

        const bodyRowsXml = rows
          .map((row) => {
            const cells = headers
              .map((_, colIdx) => {
                const cellVal = (row[colIdx] ?? '').trim();
                return `<w:tc><w:tcPr><w:tcW w:w="${colWidthTwips}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:before="60" w:after="60" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="left"/></w:pPr>${buildTextRunsWithLatinItalics(cellVal, { sizeHalfPt: smallSz })}</w:p></w:tc>`;
              })
              .join('');
            return `<w:tr>${cells}</w:tr>`;
          })
          .join('');

        bodyElements.push(
          `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${tblBorders}<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>${headerRowXml}${bodyRowsXml}</w:tbl>`,
        );

        // 3. Fonte abaixo
        bodyElements.push(
          `<w:p><w:pPr><w:spacing w:before="60" w:after="160" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(`${labels.source}: ${source}.`, { sizeHalfPt: smallSz })}</w:p>`,
        );
        break;
      }

      case 'image': {
        const figNum = ++figureCount;
        const caption = (block.meta?.caption?.trim() || 'Sem legenda').replace(/\.+$/, '');
        const source = (block.meta?.source?.trim() || 'do autor').replace(/\.+$/, '');
        const widthPct = Math.min(100, Math.max(10, Number(block.meta?.imageWidthPct) || 80));
        const rawImages = getBlockImages(block);

        // 1. Legenda acima no estilo nativo "Caption" ("Legenda"): "Figura 1 – …"
        bodyElements.push(
          `<w:p><w:pPr><w:pStyle w:val="Caption"/></w:pPr>${buildRunXml(`${labels.figure} ${figNum} – ${caption}`, { bold: true, sizeHalfPt: smallSz })}</w:p>`,
        );

        if (rawImages.length === 0) {
          missingImages.push({ figureNumber: figNum, caption, blockId: block.id });
          bodyElements.push(
            `<w:p><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml('[imagem indisponível]', { italic: true })}</w:p>`,
          );
        } else if (rawImages.length === 1) {
          const item = rawImages[0];
          const validated = validateAndParseImageDataUrl(item.dataUrl);
          if (!validated) {
            missingImages.push({ figureNumber: figNum, caption, blockId: block.id });
            bodyElements.push(
              `<w:p><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml('[imagem indisponível]', { italic: true })}</w:p>`,
            );
          } else {
            const rId = registerMedia(validated);
            const maxWidthEmu = layout.usableWidthEmu;
            const targetWidthEmu = Math.round(layout.usableWidthEmu * (widthPct / 100));
            const maxHeightEmu = Math.round(layout.usableHeightEmu * 0.75);
            const { cx, cy } = computeImageExtentEmu(
              validated.widthPx,
              validated.heightPx,
              maxWidthEmu,
              maxHeightEmu,
              block.meta?.imageWidthPct ? targetWidthEmu : undefined,
            );
            const drawingXml = buildDrawingXml(
              rId,
              nextDocPrId++,
              `Figura_${figNum}`,
              cx,
              cy,
              caption,
            );
            bodyElements.push(
              `<w:p><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${drawingXml}</w:p>`,
            );
            if (item.label?.trim()) {
              bodyElements.push(
                `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(item.label.trim(), { sizeHalfPt: smallSz })}</w:p>`,
              );
            }
          }
        } else {
          // Figura composta com 2 a 4 imagens agrupadas na mesma disposição do PDF
          const imgLayout = block.meta?.imageLayout ?? 'auto';
          const colCount =
            imgLayout === 'stack'
              ? 1
              : imgLayout === 'grid_2x2'
                ? 2
                : imgLayout === 'row'
                  ? rawImages.length
                  : rawImages.length === 3
                    ? 3
                    : 2;

          const colWidthTwips = Math.floor((layout.usableWidthTwips * (widthPct / 100)) / colCount);
          const maxCellWidthEmu = Math.floor(
            (layout.usableWidthEmu * (widthPct / 100)) / colCount,
          );
          const maxCellHeightEmu = Math.round(layout.usableHeightEmu * 0.5);

          let hasReportedMissingForBlock = false;
          const cellElements: string[] = rawImages.map((item, idx) => {
            const letter = String.fromCharCode(97 + idx);
            const rawSubLabel = item.label?.trim();
            const subLabel = rawSubLabel
              ? rawSubLabel.startsWith('(')
                ? rawSubLabel
                : `(${letter}) ${rawSubLabel}`
              : '';

            const validated = validateAndParseImageDataUrl(item.dataUrl);
            let imgParaXml: string;
            if (!validated) {
              if (!hasReportedMissingForBlock) {
                hasReportedMissingForBlock = true;
                missingImages.push({ figureNumber: figNum, caption, blockId: block.id });
              }
              imgParaXml = `<w:p><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml('[imagem indisponível]', { italic: true })}</w:p>`;
            } else {
              const rId = registerMedia(validated);
              const { cx, cy } = computeImageExtentEmu(
                validated.widthPx,
                validated.heightPx,
                maxCellWidthEmu,
                maxCellHeightEmu,
              );
              const drawingXml = buildDrawingXml(
                rId,
                nextDocPrId++,
                `Figura_${figNum}_${idx + 1}`,
                cx,
                cy,
                subLabel || caption,
              );
              imgParaXml = `<w:p><w:pPr><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${drawingXml}</w:p>`;
            }

            const subLabelParaXml = subLabel
              ? `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(subLabel, { sizeHalfPt: smallSz })}</w:p>`
              : '';

            return `<w:tc><w:tcPr><w:tcW w:w="${colWidthTwips}" w:type="dxa"/></w:tcPr>${imgParaXml}${subLabelParaXml}</w:tc>`;
          });

          const gridRowsXml: string[] = [];
          for (let r = 0; r < cellElements.length; r += colCount) {
            const rowCells = cellElements.slice(r, r + colCount);
            while (rowCells.length < colCount) {
              rowCells.push(
                `<w:tc><w:tcPr><w:tcW w:w="${colWidthTwips}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`,
              );
            }
            gridRowsXml.push(`<w:tr>${rowCells.join('')}</w:tr>`);
          }

          const gridColsXml = Array(colCount)
            .fill(`<w:gridCol w:w="${colWidthTwips}"/>`)
            .join('');
          const noBorders =
            '<w:tblBorders><w:top w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:left w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:bottom w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:right w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideH w:val="none" w:sz="0" w:space="0" w:color="auto"/><w:insideV w:val="none" w:sz="0" w:space="0" w:color="auto"/></w:tblBorders>';

          bodyElements.push(
            `<w:tbl><w:tblPr><w:jc w:val="center"/>${noBorders}</w:tblPr><w:tblGrid>${gridColsXml}</w:tblGrid>${gridRowsXml.join('')}</w:tbl>`,
          );
        }

        // 3. Fonte abaixo
        bodyElements.push(
          `<w:p><w:pPr><w:spacing w:before="60" w:after="160" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(`${labels.source}: ${source}.`, { sizeHalfPt: smallSz })}</w:p>`,
        );
        break;
      }

      case 'code': {
        const rawCode = block.content.trim();
        if (!rawCode) break;
        const caption = block.meta?.caption?.trim().replace(/\.+$/, '');
        const source = block.meta?.source?.trim().replace(/\.+$/, '');

        if (caption) {
          bodyElements.push(
            `<w:p><w:pPr><w:pStyle w:val="Caption"/></w:pPr>${buildRunXml(`Algoritmo – ${caption}`, { bold: true, sizeHalfPt: smallSz })}</w:p>`,
          );
        }

        const codeLines = rawCode.split(/\r?\n/);
        const lineRuns = codeLines
          .map((line, i) => buildRunXml(line, { code: true, sizeHalfPt: smallSz }) + (i < codeLines.length - 1 ? '<w:r><w:br/></w:r>' : ''))
          .join('');

        bodyElements.push(
          `<w:p><w:pPr><w:spacing w:before="80" w:after="80" w:line="240" w:lineRule="auto"/><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:ind w:left="240" w:right="240" w:firstLine="0"/><w:jc w:val="left"/></w:pPr>${lineRuns}</w:p>`,
        );

        if (source) {
          bodyElements.push(
            `<w:p><w:pPr><w:spacing w:before="40" w:after="140" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr>${buildRunXml(`${labels.source}: ${source}.`, { sizeHalfPt: smallSz })}</w:p>`,
          );
        }
        break;
      }

      case 'footnote': {
        const plainText = stripHtmlTags(block.content);
        if (!plainText) break;
        const runsXml = richHtmlToDocxInlineXml(block.content, ctx, { sizeHalfPt: smallSz });
        bodyElements.push(
          `<w:p><w:pPr><w:spacing w:after="80" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="both"/></w:pPr>${buildRunXml('Nota: ', { bold: true, sizeHalfPt: smallSz })}${runsXml}</w:p>`,
        );
        break;
      }

      case 'pagebreak': {
        bodyElements.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
        break;
      }

      case 'raw_typst': {
        const raw = block.content.trim();
        if (!raw) break;
        bodyElements.push(
          `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${buildRunXml(raw)}</w:p>`,
        );
        break;
      }
    }
  }

  // 4. Seção de Referências Bibliográficas (Fonte Única de Verdade com o PDF)
  if (orderedRefs.length > 0) {
    const entryFormat = resolveReferenceEntryFormat(cfg, layout.effectiveType);
    const refHeadingTitle =
      layout.effectiveType === 'ieee' || layout.effectiveType === 'sbc'
        ? labels.references
        : labels.references.toUpperCase();

    bodyElements.push(
      `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:outlineLvl w:val="0"/></w:pPr>${buildRunXml(refHeadingTitle, { bold: true })}</w:p>`,
    );

    orderedRefs.forEach((ref, idx) => {
      const refNum = idx + 1;
      const typstRef = transpileReference(ref, cfg, entryFormat);
      const refRuns = typstReferenceMarkupToDocxRuns(typstRef);

      let prefixRun = '';
      if (layout.citationFormat === 'ieee_numeric') {
        prefixRun = buildRunXml(`[${refNum}] `);
      } else if (layout.citationFormat === 'superscript') {
        prefixRun = buildRunXml(`${refNum}. `);
      }

      bodyElements.push(
        `<w:p><w:pPr><w:pStyle w:val="ReferenceItem"/><w:spacing w:before="0" w:after="${layout.referenceSpacingAfterTwips}" w:line="240" w:lineRule="auto"/><w:ind w:firstLine="0"/><w:jc w:val="${layout.referenceAlignment}"/></w:pPr>${prefixRun}${refRuns}</w:p>`,
      );
    });
  }

  // 5. Elementos Pós-Textuais Opcionais (Glossário, Apêndices, Anexos)
  const canRenderPostTextuals =
    layout.effectiveType !== 'poster' &&
    layout.effectiveType !== 'ieee' &&
    layout.effectiveType !== 'sbc';

  if (canRenderPostTextuals) {
    if (m.glossary?.trim()) {
      bodyElements.push(
        `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:outlineLvl w:val="0"/></w:pPr>${buildRunXml(labels.glossary, { bold: true })}</w:p>`,
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${buildTextRunsWithLatinItalics(m.glossary.trim())}</w:p>`,
      );
    }
    if (m.appendices?.trim()) {
      bodyElements.push(
        `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:outlineLvl w:val="0"/></w:pPr>${buildRunXml(labels.appendices, { bold: true })}</w:p>`,
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${buildTextRunsWithLatinItalics(m.appendices.trim())}</w:p>`,
      );
    }
    if (m.annexes?.trim()) {
      bodyElements.push(
        `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:outlineLvl w:val="0"/></w:pPr>${buildRunXml(labels.annexes, { bold: true })}</w:p>`,
        `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${buildTextRunsWithLatinItalics(m.annexes.trim())}</w:p>`,
      );
    }
  }

  // Garante ao menos um parágrafo vazio para documentos em branco abrirem sem erro no Word/LibreOffice
  if (bodyElements.length === 0) {
    bodyElements.push('<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr></w:p>');
  }

  // 6. Propriedades de página e seção (<w:sectPr>)
  const orientAttr = layout.orientation === 'landscape' ? ' w:orient="landscape"' : '';
  const colsXml =
    layout.columns > 1
      ? `<w:cols w:num="${layout.columns}" w:space="708"/>`
      : '<w:cols w:space="708"/>';

  const sectPrXml = `<w:sectPr>
      <w:pgSz w:w="${layout.pageWidthTwips}" w:h="${layout.pageHeightTwips}"${orientAttr}/>
      <w:pgMar w:top="${layout.marginTopTwips}" w:right="${layout.marginRightTwips}" w:bottom="${layout.marginBottomTwips}" w:left="${layout.marginLeftTwips}" w:header="709" w:footer="709" w:gutter="0"/>
      ${colsXml}
    </w:sectPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    ${bodyElements.join('\n    ')}
    ${sectPrXml}
  </w:body>
</w:document>`;

  const docRelsItems = [
    '  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
    '  <Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>',
    '  <Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>',
    '  <Relationship Id="rIdFontTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>',
    ...mediaFiles.map(
      (mf) =>
        `  <Relationship Id="${mf.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mf.fileName}"/>`,
    ),
    ...hyperlinks.map(
      (hl) =>
        `  <Relationship Id="${hl.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeXml(hl.url)}" TargetMode="External"/>`,
    ),
  ];

  const documentRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${docRelsItems.join('\n')}
</Relationships>`;

  // 7. Monta os avisos consolidados de conversão (figuras ausentes, equações não convertidas, citações órfãs)
  const warnings: string[] = [];

  if (missingImages.length > 0) {
    const listStr = missingImages
      .map((img) => `Figura ${img.figureNumber} ("${img.caption}")`)
      .join(', ');
    warnings.push(`Imagens ausentes ou indisponíveis substituídas por "[imagem indisponível]": ${listStr}.`);
  }

  if (failedEquations.length > 0) {
    const locationsStr = failedEquations
      .map((eq) => `${eq.location}: "${eq.expression}"`)
      .join('; ');
    warnings.push(
      `${failedEquations.length} equações não puderam ser convertidas e saíram como texto: ${locationsStr}.`,
    );
  }

  if (missingCitations.length > 0) {
    const citesStr = missingCitations
      .map((c) => `"${c.label}" (${c.location})`)
      .join(', ');
    warnings.push(`Citações apontando para referências inexistentes: ${citesStr}.`);
  }

  // 8. Empacota o arquivo .docx via JSZip
  const zip = new JSZip();
  zip.file('[Content_Types].xml', buildContentTypesXml(mediaExtensions));
  zip.file('_rels/.rels', buildRootRelsXml());
  zip.file('docProps/core.xml', buildCorePropsXml(project));
  zip.file('docProps/app.xml', buildAppPropsXml());
  zip.file('word/document.xml', documentXml);
  zip.file('word/styles.xml', buildStylesXml(layout));
  zip.file('word/numbering.xml', buildNumberingXml(numberedListGroupCount));
  zip.file('word/settings.xml', buildSettingsXml());
  zip.file('word/fontTable.xml', buildFontTableXml(layout.fontName));
  zip.file('word/_rels/document.xml.rels', documentRelsXml);

  for (const mf of mediaFiles) {
    zip.file(`word/media/${mf.fileName}`, mf.bytes);
  }

  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const blob = new Blob([bytes as BlobPart], { type: DOCX_MIME_TYPE });
  const fileName = getDocxFileName(project.name);

  return {
    blob,
    bytes,
    fileName,
    warnings,
    missingImages,
    failedEquations,
    missingCitations,
  };
}

const EXPORT_TIMEOUT_MS = 30_000;

/**
 * Exporta um projeto para `.docx`.
 * - Se o navegador estiver explicitamente offline (`navigator.onLine === false`), falha com
 *   `DocxExportUnavailableError` (Cenário 6 de RDJ-01.1).
 * - Se `VITE_IMPORT_API_URL` estiver configurada, envia para `POST /export` no serviço de conversão
 *   (que processa em pasta temporária sem persistir dados); caso o serviço não responda, lança
 *   `DocxExportUnavailableError` para exibir a opção "Tentar novamente" sem baixar arquivo parcial.
 * - Caso contrário, gera o `.docx` localmente no navegador.
 */
export async function exportProjectToDocx(project: DocumentProject): Promise<DocxExportResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new DocxExportUnavailableError(
      'Você está offline. Conecte-se à internet e clique em "Tentar novamente" para exportar em .docx.',
    );
  }

  const localResult = await buildDocxArchive(project);
  const baseUrl = getImportApiUrl();
  if (!baseUrl) {
    return localResult;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXPORT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: localResult.fileName,
        docxBase64: uint8ToBase64(localResult.bytes),
        warnings: localResult.warnings,
      }),
      signal: controller.signal,
    });
  } catch {
    throw new DocxExportUnavailableError(
      'O serviço de conversão para .docx não está respondendo no momento. Verifique sua conexão e tente novamente.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let message = 'O serviço de conversão para .docx está indisponível no momento.';
    try {
      const errBody = (await response.json()) as { error?: string };
      if (errBody?.error) message = errBody.error;
    } catch {
      // mantém mensagem padrão
    }
    throw new DocxExportUnavailableError(message);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = (await response.json()) as {
      docxBase64?: string;
      warnings?: string[];
    };
    if (!data.docxBase64) {
      throw new DocxExportUnavailableError('Resposta incompleta do serviço de conversão.');
    }
    const serverBytes = base64ToUint8(data.docxBase64);
    if (serverBytes.byteLength === 0) {
      throw new DocxExportUnavailableError('O arquivo .docx retornado pelo serviço está vazio.');
    }
    return {
      ...localResult,
      bytes: serverBytes,
      blob: new Blob([serverBytes as BlobPart], { type: DOCX_MIME_TYPE }),
      warnings: data.warnings ?? localResult.warnings,
    };
  }

  const buf = await response.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new DocxExportUnavailableError('O arquivo .docx retornado pelo serviço está vazio.');
  }
  const serverBytes = new Uint8Array(buf);
  return {
    ...localResult,
    bytes: serverBytes,
    blob: new Blob([serverBytes as BlobPart], { type: DOCX_MIME_TYPE }),
  };
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
