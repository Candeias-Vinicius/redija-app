import {
  AcademicReference,
  CitationFormat,
  CslStyle,
  DocumentMetadata,
  NormPresetId,
  ProjectTemplateType,
  ReferenceEntryFormat,
  TemplateConfig,
} from '@/types/document';
import { POPULAR_UNIVERSE_TEMPLATES } from '@/core/universe/universeResolver';

export type CustomizerTabId = 'presets' | 'typography' | 'page' | 'citations' | 'structure';

export const MODAL_TABS: Array<{ id: CustomizerTabId; label: string }> = [
  { id: 'presets', label: 'Normas & Presets' },
  { id: 'typography', label: 'Tipografia & Texto' },
  { id: 'page', label: 'Página & Cabeçalhos' },
  { id: 'citations', label: 'Citações & Referências' },
  { id: 'structure', label: 'Capa & Pôster' },
];

export const SAMPLE_PREVIEW_REF: AcademicReference = {
  id: 'preview-sample',
  type: 'book',
  authors: 'SILVA, Roberto',
  title: 'Engenharia de Software Moderna e Boas Práticas',
  city: 'São Paulo',
  publisher: 'Editora Acadêmica',
  year: '2023',
};

export interface TemplateCustomizerApplyPayload {
  config: TemplateConfig;
  metadata: DocumentMetadata;
  selectedTemplateType?: ProjectTemplateType;
}

export interface PresetInfo {
  id: NormPresetId;
  title: string;
  badge: string;
  description: string;
  config: Omit<TemplateConfig, 'preset'>;
}

export const PRESETS: PresetInfo[] = [
  {
    id: 'abnt_classic',
    title: 'ABNT Clássica (Monografia / TCC)',
    badge: 'NBR 14724 + 10520:2023',
    description:
      'Times New Roman/Serif 12pt, espaçamento 1,5, recuo 1,25 cm, margens 3/3/2/2 cm, citação oficial (Silva, 2023) NBR 10520:2023 e referências NBR 6023.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 12,
      lineSpacing: '1.5',
      paragraphIndentCm: 1.25,
      marginTopCm: 3,
      marginLeftCm: 3,
      marginBottomCm: 2,
      marginRightCm: 2,
      columns: 1,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'top_right',
      hideFirstPageNumber: true,
      romanPreTextual: false,
      headingNumbering: '1.1',
      h1PageBreak: true,
      includeCoverPage: true,
      includeTitlePage: true,
      includeToc: true,
      citationStyle: 'titlecase',
      citationFormat: 'abnt_titlecase',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'left',
      referenceSpacing: 'single_blank',
    },
  },
  {
    id: 'abnt_2023',
    title: 'ABNT Moderna Sans (Arial / Arimo)',
    badge: 'NBR 14724 Sans-Serif',
    description:
      'Configuração moderna em fonte sem serifa (Arial/Arimo) 12pt, citações NBR 10520:2023 (Silva, 2023) e margens ABNT 3/3/2/2 cm.',
    config: {
      fontFamily: 'sans',
      fontSizePt: 12,
      lineSpacing: '1.5',
      paragraphIndentCm: 1.25,
      marginTopCm: 3,
      marginLeftCm: 3,
      marginBottomCm: 2,
      marginRightCm: 2,
      columns: 1,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'top_right',
      hideFirstPageNumber: true,
      romanPreTextual: false,
      headingNumbering: '1.1',
      h1PageBreak: true,
      includeCoverPage: true,
      includeTitlePage: true,
      includeToc: true,
      citationStyle: 'titlecase',
      citationFormat: 'abnt_titlecase',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'left',
      referenceSpacing: 'single_blank',
    },
  },
  {
    id: 'article_1col',
    title: 'Artigo Científico ABNT (1 Coluna)',
    badge: 'NBR 6022 (Coluna Única)',
    description:
      'Diagramação corrida em coluna única conforme NBR 6022, sem capa nem folha de rosto, fonte 12pt, resumo e citações NBR 10520:2023.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 12,
      lineSpacing: '1.5',
      paragraphIndentCm: 1.25,
      marginTopCm: 3,
      marginLeftCm: 3,
      marginBottomCm: 2,
      marginRightCm: 2,
      columns: 1,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'top_right',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: '1.1',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'titlecase',
      citationFormat: 'abnt_titlecase',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'left',
      referenceSpacing: 'single_blank',
    },
  },
  {
    id: 'article_2col',
    title: 'Artigo Científico / Congresso (2 Colunas)',
    badge: 'NBR 6022 / Congresso',
    description:
      'Sem capa nem folha de rosto (inicia direto com título, autores e resumo na página 1) e corpo do texto diagramado em 2 colunas com fonte 10pt.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 10,
      lineSpacing: '1.0',
      paragraphIndentCm: 0.75,
      marginTopCm: 2.5,
      marginLeftCm: 2,
      marginBottomCm: 2,
      marginRightCm: 2,
      columns: 2,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'top_right',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: '1.1',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'titlecase',
      citationFormat: 'abnt_titlecase',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'italic',
      referenceAlignment: 'left',
      referenceSpacing: 'compact',
    },
  },
  {
    id: 'apa_7',
    title: 'Estilo Internacional (APA 7ª Edição)',
    badge: 'Psicologia / Internacional',
    description:
      'Margens uniformes de 2,54 cm (1 polegada), espaçamento duplo (2,0), recuo de 1,27 cm, citação (Silva, 2023) e destaque das referências em itálico.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 12,
      lineSpacing: '2.0',
      paragraphIndentCm: 1.27,
      marginTopCm: 2.54,
      marginLeftCm: 2.54,
      marginBottomCm: 2.54,
      marginRightCm: 2.54,
      columns: 1,
      paperSize: 'letter',
      pageOrientation: 'portrait',
      documentLanguage: 'en',
      bodyAlignment: 'left',
      pageNumbering: 'top_right',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: 'none',
      h1PageBreak: false,
      includeCoverPage: true,
      includeTitlePage: false,
      includeToc: true,
      citationStyle: 'titlecase',
      citationFormat: 'author_date',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'apa',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'italic',
      referenceAlignment: 'left',
      referenceSpacing: 'double',
    },
  },
  {
    id: 'sbc',
    title: 'SBC (Sociedade Brasileira de Computação)',
    badge: 'SBC Oficial',
    description:
      'Margens superior 3.5cm e laterais 3cm, coluna única, fonte 12pt com entrelinha simples, resumo bilíngue e afiliações institucionais no topo.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 12,
      lineSpacing: '1.0',
      paragraphIndentCm: 1.25,
      marginTopCm: 3.5,
      marginLeftCm: 3,
      marginBottomCm: 2.5,
      marginRightCm: 3,
      columns: 1,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'bottom_center',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: 'none',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'titlecase',
      citationFormat: 'abnt_titlecase',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'justify',
      referenceSpacing: 'single_blank',
    },
  },
  {
    id: 'ieee',
    title: 'IEEE Conference (Internacional)',
    badge: 'IEEE Padrão',
    description:
      'Padrão mundial em 2 colunas com margens compactas, abstract destacado em negrito itálico e referências numéricas [1] em ordem de citação.',
    config: {
      fontFamily: 'serif',
      fontSizePt: 10,
      lineSpacing: '1.0',
      paragraphIndentCm: 0.35,
      marginTopCm: 1.9,
      marginLeftCm: 1.57,
      marginBottomCm: 2.54,
      marginRightCm: 1.57,
      columns: 2,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'en',
      bodyAlignment: 'justify',
      pageNumbering: 'bottom_center',
      hideFirstPageNumber: false,
      romanPreTextual: false,
      headingNumbering: 'none',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'uppercase',
      citationFormat: 'ieee_numeric',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'ieee',
      referenceOrdering: 'citation_order',
      referenceHighlight: 'italic',
      referenceAlignment: 'left',
      referenceSpacing: 'compact',
    },
  },
  {
    id: 'poster',
    title: 'Pôster Acadêmico A0 (Banner)',
    badge: 'A0 / Simpósio',
    description:
      'Grande formato para apresentação em mostras e congressos, com banner superior institucional e grid de 3 colunas em caixas visuais.',
    config: {
      fontFamily: 'sans',
      fontSizePt: 22,
      lineSpacing: '1.5',
      paragraphIndentCm: 0,
      marginTopCm: 2.5,
      marginLeftCm: 2.5,
      marginBottomCm: 2.5,
      marginRightCm: 2.5,
      columns: 1,
      paperSize: 'a4',
      pageOrientation: 'portrait',
      documentLanguage: 'pt',
      bodyAlignment: 'justify',
      pageNumbering: 'none',
      hideFirstPageNumber: true,
      romanPreTextual: false,
      headingNumbering: 'none',
      h1PageBreak: false,
      includeCoverPage: false,
      includeTitlePage: false,
      includeToc: false,
      citationStyle: 'titlecase',
      citationFormat: 'abnt_titlecase',
      bibliographyEngine: 'redija_custom',
      referenceEntryFormat: 'abnt',
      referenceOrdering: 'alphabetical',
      referenceHighlight: 'bold',
      referenceAlignment: 'justify',
      referenceSpacing: 'compact',
      posterDimensions: 'a0',
      posterOrientation: 'portrait',
      posterColumns: 3,
      posterTheme: 'emerald',
    },
  },
];

export function resolveDraftTemplateType(
  cfg: TemplateConfig,
  baseType?: ProjectTemplateType,
): ProjectTemplateType {
  const p = cfg.preset;
  if (p === 'sbc' || p === 'ieee' || p === 'poster' || p === 'universe_custom') {
    return p;
  }
  if (p === 'abnt_classic' || p === 'abnt_2023' || p === 'apa_7') {
    if (
      !baseType ||
      baseType === 'sbc' ||
      baseType === 'ieee' ||
      baseType === 'poster' ||
      baseType === 'universe_custom'
    ) {
      return 'tcc';
    }
    return baseType;
  }
  if (p === 'article_2col') {
    if (
      !baseType ||
      baseType === 'sbc' ||
      baseType === 'ieee' ||
      baseType === 'poster' ||
      baseType === 'universe_custom'
    ) {
      return 'artigo';
    }
    return baseType;
  }
  return baseType ?? 'tcc';
}

export function resolveEffectiveCslStyle(
  config: TemplateConfig,
  effectiveCitationFormat: CitationFormat,
): CslStyle {
  if (config.cslStyle) return config.cslStyle;
  if (effectiveCitationFormat === 'ieee_numeric') return 'ieee';
  if (effectiveCitationFormat === 'author_date') return 'apa';
  return 'associacao-brasileira-de-normas-tecnicas';
}

export function resolvePreviewCitationStyle(
  config: TemplateConfig,
  effectiveEntryFormat: ReferenceEntryFormat,
  effectiveCitationFormat: CitationFormat,
): 'abnt' | 'apa' | 'ieee' {
  if (
    effectiveEntryFormat === 'abnt' ||
    effectiveEntryFormat === 'apa' ||
    effectiveEntryFormat === 'ieee'
  ) {
    return effectiveEntryFormat;
  }
  if (config.preset === 'ieee' || effectiveCitationFormat === 'ieee_numeric') {
    return 'ieee';
  }
  if (config.preset === 'apa_7' || effectiveCitationFormat === 'author_date') {
    return 'apa';
  }
  return 'abnt';
}

export function parseUniverseEntrypoint(
  trimmedPackage: string,
  fallbackEntrypoint?: string,
): string | undefined {
  const known = POPULAR_UNIVERSE_TEMPLATES.find(
    (t) => t.id.toLowerCase() === trimmedPackage.toLowerCase(),
  );
  if (known) return known.entrypoint;

  const pkgMatch = trimmedPackage.match(/^@?[a-zA-Z0-9_-]+\/([a-zA-Z0-9_-]+):[0-9.]+$/);
  return pkgMatch?.[1] ?? fallbackEntrypoint;
}
