import { DocumentProject } from '@/types/document';

export interface ImportFileInput {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface DocumentImporterStrategy {
  readonly id: string;
  matches(lowerFileName: string): boolean;
  importFile(file: ImportFileInput): Promise<DocumentProject>;
}
