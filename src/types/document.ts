export type BlockType =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'paragraph'
  | 'quote_long'
  | 'image'
  | 'table'
  | 'footnote'
  | 'pagebreak'
  | 'bullet'
  | 'numbered';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  meta?: {
    author?: string;
    year?: string;
    page?: string;
    caption?: string;
    source?: string;
    url?: string;
    imageDataUrl?: string;
    imageMime?: string;
    headers?: string[];
    rows?: string[][];
  };
}

export interface DocumentMetadata {
  title: string;
  subtitle?: string;
  author: string;
  advisor: string;
  nature?: string;
  institution: string;
  course: string;
  location: string;
  year: string;
  abstract: string;
  keywords: string[];
  // Elementos pré-textuais opcionais (NBR 14724)
  dedicatory?: string;
  acknowledgments?: string;
  epigraph?: string;
  epigraphAuthor?: string;
  foreignAbstract?: string;
  foreignKeywords?: string[];
  includeFiguresList?: boolean;
  includeTablesList?: boolean;
}

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

export type ProjectTemplateType = 'tcc' | 'artigo' | 'relatorio' | 'projeto_pesquisa';

export interface DocumentProject {
  id: string;
  name: string;
  templateType?: ProjectTemplateType;
  metadata: DocumentMetadata;
  blocks: Block[];
  references: AcademicReference[];
  updatedAt: string;
}

export interface RedijaBackupFile {
  version: 1;
  exportedAt: string;
  project: DocumentProject;
}
