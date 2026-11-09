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
} from '@/types/document';

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

  const metadata: DocumentMetadata = {
    title: typeof rawMeta.title === 'string' ? rawMeta.title : name,
    subtitle: typeof rawMeta.subtitle === 'string' ? rawMeta.subtitle : '',
    author: typeof rawMeta.author === 'string' ? rawMeta.author : 'Nome do Autor',
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

  const templateConfig: TemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    preset:
      typeof rawConfig.preset === 'string' && validPresets.includes(rawConfig.preset as NormPresetId)
        ? (rawConfig.preset as NormPresetId)
        : DEFAULT_TEMPLATE_CONFIG.preset,
    fontFamily: rawConfig.fontFamily === 'sans' ? 'sans' : 'serif',
    fontSizePt:
      rawConfig.fontSizePt === 10 || rawConfig.fontSizePt === 11 || rawConfig.fontSizePt === 12
        ? rawConfig.fontSizePt
        : DEFAULT_TEMPLATE_CONFIG.fontSizePt,
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
    citationStyle: rawConfig.citationStyle === 'titlecase' ? 'titlecase' : 'uppercase',
    referenceHighlight: rawConfig.referenceHighlight === 'italic' ? 'italic' : 'bold',
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
    sidebarConfig = {
      isCustomized: Boolean(rawSb.isCustomized),
      hiddenFieldIds: Array.isArray(rawSb.hiddenFieldIds)
        ? rawSb.hiddenFieldIds
            .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
            .map((f) => f.trim())
        : undefined,
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
