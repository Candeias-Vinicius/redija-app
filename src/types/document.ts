export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'unnumbered_heading'
  | 'paragraph'
  | 'quote_long'
  | 'equation'
  | 'code'
  | 'image'
  | 'table'
  | 'box'
  | 'footnote'
  | 'pagebreak'
  | 'bullet'
  | 'numbered';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  updatedAt?: number;
  meta?: {
    author?: string;
    year?: string;
    page?: string;
    caption?: string;
    source?: string;
    url?: string;
    imageDataUrl?: string;
    imageMime?: string;
    imageWidthPct?: 50 | 75 | 100;
    headers?: string[];
    rows?: string[][];
    language?: string;
    equationNumbered?: boolean;
  };
}

export interface DocumentMetadata {
  title: string;
  subtitle?: string;
  author: string;
  advisor: string;
  coadvisor?: string;
  nature?: string;
  institution: string;
  course: string;
  location: string;
  year: string;
  abstract: string;
  keywords: string[];
  // Folha de Aprovação (NBR 14724)
  includeApprovalPage?: boolean;
  approvalDate?: string;
  committeeMembers?: string[];
  // Elementos pré-textuais opcionais (NBR 14724)
  dedicatory?: string;
  acknowledgments?: string;
  epigraph?: string;
  epigraphAuthor?: string;
  foreignAbstract?: string;
  foreignKeywords?: string[];
  includeFiguresList?: boolean;
  includeTablesList?: boolean;
  includeBoxesList?: boolean;
  // Lista de Abreviaturas, Siglas e Símbolos (pré-textuais) e Glossário / Apêndices / Anexos (pós-textuais)
  abbreviations?: string;
  symbols?: string;
  glossary?: string;
  appendices?: string;
  annexes?: string;
  // Brasão / Logotipo da Instituição na capa (Data URL)
  institutionLogoDataUrl?: string;
}

export type NormPresetId =
  | 'abnt_classic'
  | 'abnt_2023'
  | 'article_2col'
  | 'apa_7'
  | 'sbc'
  | 'ieee'
  | 'poster'
  | 'universe_custom'
  | 'custom';

export interface TemplateConfig {
  preset: NormPresetId;
  fontFamily: 'serif' | 'sans';
  fontSizePt: 10 | 11 | 12;
  lineSpacing: '1.5' | '1.0' | '2.0';
  paragraphIndentCm: number;
  marginTopCm: number;
  marginLeftCm: number;
  marginBottomCm: number;
  marginRightCm: number;
  columns: 1 | 2;
  includeCoverPage: boolean;
  includeTitlePage: boolean;
  includeToc: boolean;
  citationStyle: 'uppercase' | 'titlecase';
  referenceHighlight: 'bold' | 'italic';

  // Configurações Específicas de Pôster Acadêmico A0/A1
  posterDimensions?: 'a0' | 'a1' | 'a2';
  posterOrientation?: 'portrait' | 'landscape';
  posterColumns?: 2 | 3;
  posterTheme?: 'emerald' | 'blue' | 'classic_dark' | 'clean';

  // Configurações de Conexão com o Typst Universe
  universePackage?: string;
  universeEntrypoint?: string;
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  preset: 'abnt_classic',
  fontFamily: 'serif',
  fontSizePt: 12,
  lineSpacing: '1.5',
  paragraphIndentCm: 1.25,
  marginTopCm: 3,
  marginLeftCm: 3,
  marginBottomCm: 2,
  marginRightCm: 2,
  columns: 1,
  includeCoverPage: true,
  includeTitlePage: true,
  includeToc: true,
  citationStyle: 'uppercase',
  referenceHighlight: 'bold',
};

export type ReferenceType = 'book' | 'article' | 'thesis' | 'website' | 'legislation';

export interface AcademicReference {
  id: string;
  type?: ReferenceType;
  authors: string;
  title: string;
  subtitle?: string;
  edition?: string;
  city: string;
  publisher: string;
  year: string;
  // Campos adicionais NBR 6023
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  institution?: string;
  degree?: string;
  url?: string;
  accessDate?: string;
  doi?: string;
}

export type ProjectTemplateType =
  | 'tcc'
  | 'artigo'
  | 'relatorio'
  | 'projeto_pesquisa'
  | 'em_branco'
  | 'sbc'
  | 'ieee'
  | 'poster'
  | 'universe_custom';

export interface DocumentProject {
  id: string;
  name: string;
  templateType?: ProjectTemplateType;
  templateConfig?: TemplateConfig;
  metadata: DocumentMetadata;
  blocks: Block[];
  references: AcademicReference[];
  updatedAt: string;
  deletedAt?: string | null;

  // Gestão de Usuário e Google Drive Sync
  ownerEmail?: string;
  driveFileId?: string;
  driveSyncedAt?: string;
  isSharedWithMe?: boolean;
  sharedBy?: {
    name?: string;
    email?: string;
    photoLink?: string;
  };
}

export interface RedijaBackupFile {
  version: 1;
  exportedAt: string;
  project: DocumentProject;
}
