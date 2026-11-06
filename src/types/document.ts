export type BlockType = 
  | 'h1' 
  | 'h2' 
  | 'h3' 
  | 'paragraph' 
  | 'quote_long' 
  | 'image' 
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
}

export interface AcademicReference {
  id: string;
  authors: string;
  title: string;
  subtitle?: string;
  edition?: string;
  city: string;
  publisher: string;
  year: string;
  url?: string;
  accessDate?: string;
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
