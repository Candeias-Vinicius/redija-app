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

  // Configuração do Template
  const rawConfig = (data.templateConfig && typeof data.templateConfig === 'object'
    ? data.templateConfig
    : {}) as Partial<TemplateConfig>;

  const templateConfig: TemplateConfig = {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...rawConfig,
  };

  // Blocos de Conteúdo
  let blocks: Block[] = [];
  if (Array.isArray(data.blocks)) {
    blocks = data.blocks
      .filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
      .map((b) => ({
        id: typeof b.id === 'string' && b.id ? b.id : crypto.randomUUID(),
        type: (typeof b.type === 'string' ? b.type : 'paragraph') as Block['type'],
        content: typeof b.content === 'string' ? b.content : '',
        updatedAt: typeof b.updatedAt === 'number' ? b.updatedAt : Date.now(),
        meta: b.meta && typeof b.meta === 'object' ? (b.meta as Block['meta']) : undefined,
      }));
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

  return {
    id,
    name,
    templateType,
    templateConfig,
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
