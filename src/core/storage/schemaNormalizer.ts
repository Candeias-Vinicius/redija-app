// =====================================================================
// RedijaApp: Normalizador e Validador de Schema de Projetos
// Blindagem contra regressão de dados e retrocompatibilidade com versões antigas.
// =====================================================================

import {
  DocumentProject,
  DocumentMetadata,
  Block,
  AcademicReference,
  TemplateConfig,
  DEFAULT_TEMPLATE_CONFIG,
  ProjectTemplateType,
  NormPresetId,
  SidebarConfig,
  FontFamilyId,
  CitationFormat,
  ReferenceHighlight,
  ReferenceAlignment,
  ReferenceSpacing,
  PaperSize,
  PageOrientation,
  DocumentLanguage,
  BodyAlignment,
  PageNumberingPosition,
  HeadingNumberingStyle,
  ReferenceOrdering,
  ReferenceEntryFormat,
  BibliographyEngine,
  CslStyle,
} from '@/types/document';
import {
  VALID_FONT_FAMILY_IDS,
  sanitizeCustomFontFamily,
} from '@/core/typst/fontCatalog';

/**
 * Normaliza e valida um objeto desconhecido para o schema DocumentProject estrito.
 * Preenche lacunas de dados antigos com padrões seguros da ABNT.
 */
export function normalizeProject(raw: unknown): DocumentProject {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Formato de projeto inválido: esperado um objeto estruturado.');
  }

  const data = raw as Record<string, unknown>;

  // ID do projeto
  const id =
    typeof data.id === 'string' && data.id.trim()
      ? data.id.trim()
      : crypto.randomUUID();

  // Nome do projeto
  const name =
    typeof data.name === 'string' && data.name.trim()
      ? data.name.trim()
      : 'Trabalho Acadêmico sem Título';

  // Template Type
  const validTemplates: ProjectTemplateType[] = [
    'tcc',
    'artigo',
    'relatorio',
    'projeto_pesquisa',
    'em_branco',
    'sbc',
    'ieee',
    'poster',
    'universe_custom',
  ];
  const templateType: ProjectTemplateType =
    typeof data.templateType === 'string' &&
    validTemplates.includes(data.templateType as ProjectTemplateType)
      ? (data.templateType as ProjectTemplateType)
      : 'tcc';

  // Metadados
  const rawMeta = (data.metadata && typeof data.metadata === 'object' ? data.metadata : {}) as Record<
    string,
    unknown
  >;

  const DEMO_TCC_TITLE =
    'Desenvolvimento de uma Plataforma Automatizada para Redação Científica em Conformidade com as Normas da ABNT';
  const rawTitle = typeof rawMeta.title === 'string' ? rawMeta.title : name;
  const rawAuthor = typeof rawMeta.author === 'string' ? rawMeta.author : 'Nome do Autor';
  // Migra o nome do autor do documento de exemplo legado (antes usava o nome do mantenedor).
  const isLegacyDemoAuthor =
    rawTitle === DEMO_TCC_TITLE &&
    /^vin[ií]cius\s+candeias$/i.test(rawAuthor.trim());

  const metadata: DocumentMetadata = {
    title: rawTitle,
    subtitle: typeof rawMeta.subtitle === 'string' ? rawMeta.subtitle : '',
    author: isLegacyDemoAuthor ? 'Nome do Autor' : rawAuthor,
    advisor: typeof rawMeta.advisor === 'string' ? rawMeta.advisor : '',
    coadvisor: typeof rawMeta.coadvisor === 'string' ? rawMeta.coadvisor : undefined,
    nature: typeof rawMeta.nature === 'string' ? rawMeta.nature : '',
    institution:
      typeof rawMeta.institution === 'string' && rawMeta.institution
        ? rawMeta.institution
        : 'Nome da Instituição de Ensino',
    course: typeof rawMeta.course === 'string' ? rawMeta.course : '',
    location:
      typeof rawMeta.location === 'string' && rawMeta.location ? rawMeta.location : 'Cidade - UF',
    year:
      typeof rawMeta.year === 'string' && rawMeta.year
        ? rawMeta.year
        : String(new Date().getFullYear()),
    abstract: typeof rawMeta.abstract === 'string' ? rawMeta.abstract : '',
    keywords: Array.isArray(rawMeta.keywords)
      ? rawMeta.keywords.filter((k): k is string => typeof k === 'string')
      : [],
    includeApprovalPage: Boolean(rawMeta.includeApprovalPage),
    approvalDate: typeof rawMeta.approvalDate === 'string' ? rawMeta.approvalDate : undefined,
    committeeMembers: Array.isArray(rawMeta.committeeMembers)
      ? rawMeta.committeeMembers.filter((m): m is string => typeof m === 'string')
      : undefined,
    dedicatory: typeof rawMeta.dedicatory === 'string' ? rawMeta.dedicatory : undefined,
    acknowledgments:
      typeof rawMeta.acknowledgments === 'string' ? rawMeta.acknowledgments : undefined,
    epigraph: typeof rawMeta.epigraph === 'string' ? rawMeta.epigraph : undefined,
    epigraphAuthor:
      typeof rawMeta.epigraphAuthor === 'string' ? rawMeta.epigraphAuthor : undefined,
    foreignAbstract:
      typeof rawMeta.foreignAbstract === 'string' ? rawMeta.foreignAbstract : undefined,
    foreignKeywords: Array.isArray(rawMeta.foreignKeywords)
      ? rawMeta.foreignKeywords.filter((k): k is string => typeof k === 'string')
      : undefined,
    includeFiguresList: Boolean(rawMeta.includeFiguresList),
    includeTablesList: Boolean(rawMeta.includeTablesList),
    includeBoxesList: Boolean(rawMeta.includeBoxesList),
    abbreviations: typeof rawMeta.abbreviations === 'string' ? rawMeta.abbreviations : undefined,
    symbols: typeof rawMeta.symbols === 'string' ? rawMeta.symbols : undefined,
    glossary: typeof rawMeta.glossary === 'string' ? rawMeta.glossary : undefined,
    appendices: typeof rawMeta.appendices === 'string' ? rawMeta.appendices : undefined,
    annexes: typeof rawMeta.annexes === 'string' ? rawMeta.annexes : undefined,
    institutionLogoDataUrl:
      typeof rawMeta.institutionLogoDataUrl === 'string'
        ? rawMeta.institutionLogoDataUrl
        : undefined,
  };

  // Configuração do Template com validação estrita e coerção de tipos
  const rawConfig = (data.templateConfig && typeof data.templateConfig === 'object'
    ? data.templateConfig
    : {}) as Record<string, unknown>;

  const SAFE_PKG_REGEX = /^@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+:[0-9.]+$/;
  const SAFE_IDENT_REGEX = /^[a-zA-Z0-9_-]+$/;

  const validPresets: NormPresetId[] = [
    'abnt_classic',
    'abnt_2023',
    'article_2col',
    'apa_7',
    'sbc',
    'ieee',
    'poster',
    'universe_custom',
    'custom',
  ];

  const validCitationFormats: CitationFormat[] = [
    'abnt_upper',
    'abnt_titlecase',
    'ieee_numeric',
    'superscript',
    'author_date',
  ];
  const validHighlights: ReferenceHighlight[] = ['bold', 'italic', 'underline', 'none'];
  const validAlignments: ReferenceAlignment[] = ['left', 'justify'];
  const validSpacings: ReferenceSpacing[] = ['single_blank', 'compact', 'double'];

  const sanitizedPreset: NormPresetId =
    typeof rawConfig.preset === 'string' && validPresets.includes(rawConfig.preset as NormPresetId)
      ? (rawConfig.preset as NormPresetId)
      : DEFAULT_TEMPLATE_CONFIG.preset;

  const sanitizedFontFamily: FontFamilyId =
    typeof rawConfig.fontFamily === 'string' &&
    VALID_FONT_FAMILY_IDS.has(rawConfig.fontFamily as FontFamilyId)
      ? (rawConfig.fontFamily as FontFamilyId)
      : DEFAULT_TEMPLATE_CONFIG.fontFamily;

  const sanitizedCustomFont = sanitizeCustomFontFamily(
    typeof rawConfig.customFontFamily === 'string' ? rawConfig.customFontFamily : undefined,
  );

  const sanitizedCitationFormat: CitationFormat =
    typeof rawConfig.citationFormat === 'string' &&
    validCitationFormats.includes(rawConfig.citationFormat as CitationFormat)
      ? (rawConfig.citationFormat as CitationFormat)
      : rawConfig.citationStyle === 'titlecase'
        ? 'abnt_titlecase'
        : sanitizedPreset === 'ieee'
          ? 'ieee_numeric'
          : 'abnt_upper';

  const sanitizedCitationStyle: 'uppercase' | 'titlecase' =
    rawConfig.citationStyle === 'titlecase'
      ? 'titlecase'
      : rawConfig.citationStyle === 'uppercase'
        ? 'uppercase'
        : sanitizedCitationFormat === 'abnt_titlecase' || sanitizedCitationFormat === 'author_date'
          ? 'titlecase'
          : 'uppercase';

  const sanitizedHighlight: ReferenceHighlight =
    typeof rawConfig.referenceHighlight === 'string' &&
    validHighlights.includes(rawConfig.referenceHighlight as ReferenceHighlight)
      ? (rawConfig.referenceHighlight as ReferenceHighlight)
      : DEFAULT_TEMPLATE_CONFIG.referenceHighlight;

  const sanitizedAlignment: ReferenceAlignment =
    typeof rawConfig.referenceAlignment === 'string' &&
    validAlignments.includes(rawConfig.referenceAlignment as ReferenceAlignment)
      ? (rawConfig.referenceAlignment as ReferenceAlignment)
      : (DEFAULT_TEMPLATE_CONFIG.referenceAlignment ?? 'left');

  const sanitizedSpacing: ReferenceSpacing =
    typeof rawConfig.referenceSpacing === 'string' &&
    validSpacings.includes(rawConfig.referenceSpacing as ReferenceSpacing)
      ? (rawConfig.referenceSpacing as ReferenceSpacing)
      : (DEFAULT_TEMPLATE_CONFIG.referenceSpacing ?? 'single_blank');

  const clampFontSize = (raw: unknown): number => {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      return DEFAULT_TEMPLATE_CONFIG.fontSizePt;
    }
    const clamped = Math.min(24, Math.max(8, raw));
    return Math.round(clamped * 2) / 2;
  };

  const validBodyAlignments: BodyAlignment[] = ['justify', 'left'];
  const validPaperSizes: PaperSize[] = ['a4', 'letter', 'a5'];
  const validOrientations: PageOrientation[] = ['portrait', 'landscape'];
  const validLanguages: DocumentLanguage[] = ['pt', 'en', 'es'];
  const validPageNumberings: PageNumberingPosition[] = [
    'top_right',
    'bottom_center',
    'bottom_right',
    'none',
  ];
  const validHeadingNumberings: HeadingNumberingStyle[] = ['1.1', 'I.A', '1.', 'none'];
  const validRefOrderings: ReferenceOrdering[] = ['alphabetical', 'citation_order'];
  const validRefEntryFormats: ReferenceEntryFormat[] = ['auto', 'abnt', 'apa', 'ieee'];
  const validBibEngines: BibliographyEngine[] = ['redija_custom', 'typst_csl'];
  const validCslStyles: CslStyle[] = [
    'associacao-brasileira-de-normas-tecnicas',
    'apa',
    'ieee',
    'chicago-author-date',
    'vancouver',
    'harvard-cite-them-right',
  ];

  const sanitizedRunningHeader =
    typeof rawConfig.runningHeader === 'string'
      ? rawConfig.runningHeader.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120)
      : undefined;

  const templateConfig: TemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    preset: sanitizedPreset,
    fontFamily: sanitizedFontFamily,
    ...(sanitizedCustomFont ? { customFontFamily: sanitizedCustomFont } : {}),
    fontSizePt: clampFontSize(rawConfig.fontSizePt),
    lineSpacing:
      rawConfig.lineSpacing === '1.0' || rawConfig.lineSpacing === '2.0'
        ? rawConfig.lineSpacing
        : '1.5',
    paragraphIndentCm:
      typeof rawConfig.paragraphIndentCm === 'number' && Number.isFinite(rawConfig.paragraphIndentCm) && rawConfig.paragraphIndentCm >= 0
        ? rawConfig.paragraphIndentCm
        : DEFAULT_TEMPLATE_CONFIG.paragraphIndentCm,
    marginTopCm:
      typeof rawConfig.marginTopCm === 'number' && Number.isFinite(rawConfig.marginTopCm) && rawConfig.marginTopCm >= 0
        ? rawConfig.marginTopCm
        : DEFAULT_TEMPLATE_CONFIG.marginTopCm,
    marginLeftCm:
      typeof rawConfig.marginLeftCm === 'number' && Number.isFinite(rawConfig.marginLeftCm) && rawConfig.marginLeftCm >= 0
        ? rawConfig.marginLeftCm
        : DEFAULT_TEMPLATE_CONFIG.marginLeftCm,
    marginBottomCm:
      typeof rawConfig.marginBottomCm === 'number' && Number.isFinite(rawConfig.marginBottomCm) && rawConfig.marginBottomCm >= 0
        ? rawConfig.marginBottomCm
        : DEFAULT_TEMPLATE_CONFIG.marginBottomCm,
    marginRightCm:
      typeof rawConfig.marginRightCm === 'number' && Number.isFinite(rawConfig.marginRightCm) && rawConfig.marginRightCm >= 0
        ? rawConfig.marginRightCm
        : DEFAULT_TEMPLATE_CONFIG.marginRightCm,
    columns: rawConfig.columns === 2 ? 2 : 1,
    includeCoverPage:
      typeof rawConfig.includeCoverPage === 'boolean'
        ? rawConfig.includeCoverPage
        : DEFAULT_TEMPLATE_CONFIG.includeCoverPage,
    includeTitlePage:
      typeof rawConfig.includeTitlePage === 'boolean'
        ? rawConfig.includeTitlePage
        : DEFAULT_TEMPLATE_CONFIG.includeTitlePage,
    includeToc:
      typeof rawConfig.includeToc === 'boolean'
        ? rawConfig.includeToc
        : DEFAULT_TEMPLATE_CONFIG.includeToc,
    citationStyle: sanitizedCitationStyle,
    citationFormat: sanitizedCitationFormat,
    referenceHighlight: sanitizedHighlight,
    referenceAlignment: sanitizedAlignment,
    referenceSpacing: sanitizedSpacing,
    ...(typeof rawConfig.bodyAlignment === 'string' &&
    validBodyAlignments.includes(rawConfig.bodyAlignment as BodyAlignment)
      ? { bodyAlignment: rawConfig.bodyAlignment as BodyAlignment }
      : {}),
    ...(typeof rawConfig.paragraphSpacingEm === 'number' &&
    Number.isFinite(rawConfig.paragraphSpacingEm)
      ? {
          paragraphSpacingEm:
            Math.round(Math.min(3, Math.max(0, rawConfig.paragraphSpacingEm)) * 100) / 100,
        }
      : {}),
    ...(typeof rawConfig.paperSize === 'string' &&
    validPaperSizes.includes(rawConfig.paperSize as PaperSize)
      ? { paperSize: rawConfig.paperSize as PaperSize }
      : {}),
    ...(typeof rawConfig.pageOrientation === 'string' &&
    validOrientations.includes(rawConfig.pageOrientation as PageOrientation)
      ? { pageOrientation: rawConfig.pageOrientation as PageOrientation }
      : {}),
    ...(typeof rawConfig.documentLanguage === 'string' &&
    validLanguages.includes(rawConfig.documentLanguage as DocumentLanguage)
      ? { documentLanguage: rawConfig.documentLanguage as DocumentLanguage }
      : {}),
    ...(typeof rawConfig.pageNumbering === 'string' &&
    validPageNumberings.includes(rawConfig.pageNumbering as PageNumberingPosition)
      ? { pageNumbering: rawConfig.pageNumbering as PageNumberingPosition }
      : {}),
    ...(typeof rawConfig.hideFirstPageNumber === 'boolean'
      ? { hideFirstPageNumber: rawConfig.hideFirstPageNumber }
      : {}),
    ...(typeof rawConfig.romanPreTextual === 'boolean'
      ? { romanPreTextual: rawConfig.romanPreTextual }
      : {}),
    ...(sanitizedRunningHeader ? { runningHeader: sanitizedRunningHeader } : {}),
    ...(typeof rawConfig.headingNumbering === 'string' &&
    validHeadingNumberings.includes(rawConfig.headingNumbering as HeadingNumberingStyle)
      ? { headingNumbering: rawConfig.headingNumbering as HeadingNumberingStyle }
      : {}),
    ...(typeof rawConfig.h1PageBreak === 'boolean'
      ? { h1PageBreak: rawConfig.h1PageBreak }
      : {}),
    ...(typeof rawConfig.referenceOrdering === 'string' &&
    validRefOrderings.includes(rawConfig.referenceOrdering as ReferenceOrdering)
      ? { referenceOrdering: rawConfig.referenceOrdering as ReferenceOrdering }
      : {}),
    ...(typeof rawConfig.referenceEntryFormat === 'string' &&
    validRefEntryFormats.includes(rawConfig.referenceEntryFormat as ReferenceEntryFormat)
      ? { referenceEntryFormat: rawConfig.referenceEntryFormat as ReferenceEntryFormat }
      : {}),
    ...(typeof rawConfig.bibliographyEngine === 'string' &&
    validBibEngines.includes(rawConfig.bibliographyEngine as BibliographyEngine)
      ? { bibliographyEngine: rawConfig.bibliographyEngine as BibliographyEngine }
      : {}),
    ...(typeof rawConfig.cslStyle === 'string' &&
    validCslStyles.includes(rawConfig.cslStyle as CslStyle)
      ? { cslStyle: rawConfig.cslStyle as CslStyle }
      : {}),
    posterDimensions:
      rawConfig.posterDimensions === 'a1' || rawConfig.posterDimensions === 'a2'
        ? rawConfig.posterDimensions
        : rawConfig.posterDimensions === 'a0'
          ? 'a0'
          : undefined,
    posterOrientation:
      rawConfig.posterOrientation === 'landscape' ? 'landscape' : rawConfig.posterOrientation === 'portrait' ? 'portrait' : undefined,
    posterColumns:
      rawConfig.posterColumns === 2 || rawConfig.posterColumns === 3
        ? rawConfig.posterColumns
        : undefined,
    posterTheme:
      rawConfig.posterTheme === 'blue' ||
      rawConfig.posterTheme === 'classic_dark' ||
      rawConfig.posterTheme === 'clean' ||
      rawConfig.posterTheme === 'emerald'
        ? rawConfig.posterTheme
        : undefined,
    universePackage:
      typeof rawConfig.universePackage === 'string' && SAFE_PKG_REGEX.test(rawConfig.universePackage.trim())
        ? rawConfig.universePackage.trim()
        : undefined,
    universeEntrypoint:
      typeof rawConfig.universeEntrypoint === 'string' && SAFE_IDENT_REGEX.test(rawConfig.universeEntrypoint.trim())
        ? rawConfig.universeEntrypoint.trim()
        : undefined,
  };

  // Blocos de Conteúdo
  let blocks: Block[] = [];
  if (Array.isArray(data.blocks)) {
    const validBlockTypes: Block['type'][] = [
      'paragraph',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'unnumbered_heading',
      'bullet',
      'numbered',
      'quote_long',
      'equation',
      'code',
      'raw_typst',
      'image',
      'table',
      'box',
      'footnote',
      'pagebreak',
    ];

    blocks = data.blocks
      .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
      .map((b) => {
        const rawMeta = (b.meta && typeof b.meta === 'object' ? b.meta : undefined) as Record<string, unknown> | undefined;
        let sanitizedMeta: Block['meta'] = undefined;
        if (rawMeta) {
          sanitizedMeta = {
            author: typeof rawMeta.author === 'string' ? rawMeta.author : undefined,
            year: typeof rawMeta.year === 'string' ? rawMeta.year : undefined,
            page: typeof rawMeta.page === 'string' ? rawMeta.page : undefined,
            caption: typeof rawMeta.caption === 'string' ? rawMeta.caption : undefined,
            source: typeof rawMeta.source === 'string' ? rawMeta.source : undefined,
            imageDataUrl: typeof rawMeta.imageDataUrl === 'string' ? rawMeta.imageDataUrl : undefined,
            imageMime: typeof rawMeta.imageMime === 'string' ? rawMeta.imageMime : undefined,
            imageWidthPct:
              rawMeta.imageWidthPct === 50 || rawMeta.imageWidthPct === 75 || rawMeta.imageWidthPct === 100
                ? rawMeta.imageWidthPct
                : typeof rawMeta.imageWidthPct === 'number' && Number.isFinite(rawMeta.imageWidthPct)
                  ? (Math.min(100, Math.max(10, Math.round(rawMeta.imageWidthPct))) as 50 | 75 | 100)
                  : undefined,
            language:
              typeof rawMeta.language === 'string' && /^[a-zA-Z0-9_-]+$/.test(rawMeta.language.trim())
                ? rawMeta.language.trim()
                : undefined,
            headers: Array.isArray(rawMeta.headers)
              ? rawMeta.headers.filter((h): h is string => typeof h === 'string')
              : undefined,
            rows: Array.isArray(rawMeta.rows)
              ? rawMeta.rows
                  .filter((row): row is unknown[] => Array.isArray(row))
                  .map((row) => row.map((cell) => (typeof cell === 'string' ? cell : String(cell ?? ''))))
              : undefined,
          };
        }

        return {
          id: typeof b.id === 'string' && b.id ? b.id : crypto.randomUUID(),
          type: (typeof b.type === 'string' && validBlockTypes.includes(b.type as Block['type'])
            ? b.type
            : 'paragraph') as Block['type'],
          content: typeof b.content === 'string' ? b.content : '',
          updatedAt: typeof b.updatedAt === 'number' && Number.isFinite(b.updatedAt) ? b.updatedAt : Date.now(),
          meta: sanitizedMeta,
        };
      });
  }

  // Referências Bibliográficas
  let references: AcademicReference[] = [];
  if (Array.isArray(data.references)) {
    references = data.references
      .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === 'object'))
      .map((r) => ({
        id: typeof r.id === 'string' && r.id ? r.id : crypto.randomUUID(),
        type: typeof r.type === 'string' ? (r.type as AcademicReference['type']) : 'book',
        authors: typeof r.authors === 'string' ? r.authors : '',
        title: typeof r.title === 'string' ? r.title : '',
        subtitle: typeof r.subtitle === 'string' ? r.subtitle : undefined,
        edition: typeof r.edition === 'string' ? r.edition : undefined,
        city: typeof r.city === 'string' ? r.city : '',
        publisher: typeof r.publisher === 'string' ? r.publisher : '',
        year: typeof r.year === 'string' ? r.year : '',
        journal: typeof r.journal === 'string' ? r.journal : undefined,
        volume: typeof r.volume === 'string' ? r.volume : undefined,
        issue: typeof r.issue === 'string' ? r.issue : undefined,
        pages: typeof r.pages === 'string' ? r.pages : undefined,
        institution: typeof r.institution === 'string' ? r.institution : undefined,
        degree: typeof r.degree === 'string' ? r.degree : undefined,
        url: typeof r.url === 'string' ? r.url : undefined,
        accessDate: typeof r.accessDate === 'string' ? r.accessDate : undefined,
        doi: typeof r.doi === 'string' ? r.doi : undefined,
      }));
  }

  // Data de atualização e lixeira
  const updatedAt =
    typeof data.updatedAt === 'string' && !Number.isNaN(new Date(data.updatedAt).getTime())
      ? data.updatedAt
      : new Date().toISOString();

  const deletedAt =
    typeof data.deletedAt === 'string' && !Number.isNaN(new Date(data.deletedAt).getTime())
      ? data.deletedAt
      : null;

  // Configuração opcional da aba lateral (Sidebar)
  let sidebarConfig: SidebarConfig | undefined = undefined;
  if (data.sidebarConfig && typeof data.sidebarConfig === 'object') {
    const rawSb = data.sidebarConfig as Record<string, unknown>;
    const sanitizedEnabled = Array.isArray(rawSb.enabledFieldIds)
      ? rawSb.enabledFieldIds
          .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
          .map((f) => f.trim())
      : undefined;
    const sanitizedHidden = Array.isArray(rawSb.hiddenFieldIds)
      ? rawSb.hiddenFieldIds
          .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
          .map((f) => f.trim())
      : undefined;
    sidebarConfig = {
      isCustomized: Boolean(rawSb.isCustomized),
      ...(sanitizedEnabled ? { enabledFieldIds: sanitizedEnabled } : {}),
      ...(sanitizedHidden ? { hiddenFieldIds: sanitizedHidden } : {}),
    };
  }

  return {
    id,
    name,
    templateType,
    templateConfig,
    ...(sidebarConfig ? { sidebarConfig } : {}),
    metadata,
    blocks,
    references,
    updatedAt,
    deletedAt,
    ownerEmail: typeof data.ownerEmail === 'string' ? data.ownerEmail : undefined,
    driveFileId: typeof data.driveFileId === 'string' ? data.driveFileId : undefined,
    driveSyncedAt: typeof data.driveSyncedAt === 'string' ? data.driveSyncedAt : undefined,
    isSharedWithMe: Boolean(data.isSharedWithMe),
    sharedBy:
      data.sharedBy && typeof data.sharedBy === 'object'
        ? (data.sharedBy as DocumentProject['sharedBy'])
        : undefined,
  };
}
