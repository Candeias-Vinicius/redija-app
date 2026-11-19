import { DocumentProject } from '@/types/document';

export interface ImportFileInput {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
  /** Tamanho em bytes, quando conhecido (um `File` do seletor já traz). */
  size?: number;
}

/**
 * Etapas da importação, na ordem em que acontecem. Nem todo formato passa por todas:
 * `.redija` local não envia nada; `.zip` do Redija descompacta no navegador.
 * `saving` e `opening` são da aplicação (gravar no IndexedDB e abrir o editor), não do importador.
 */
export type ImportStage =
  | 'reading'
  | 'extracting'
  | 'uploading'
  | 'converting'
  | 'downloading'
  | 'building'
  | 'saving'
  | 'opening';

export interface ImportProgress {
  stage: ImportStage;
  /** Bytes já processados na etapa (envio/recebimento). */
  loaded?: number;
  /** Total de bytes da etapa, quando conhecido. */
  total?: number;
  /** Porcentagem (0–100) quando a etapa informa diretamente (ex.: descompactação). */
  percent?: number;
}

export interface ImportOptions {
  onProgress?: (progress: ImportProgress) => void;
  /** Cancela a importação: a promessa rejeita com `ImportCancelledError`. */
  signal?: AbortSignal;
}

export interface ImportResult {
  project: DocumentProject;
  /** Avisos para o usuário (ex.: figuras em PDF/EPS que não puderam ser importadas). */
  warnings: string[];
}

export interface DocumentImporterStrategy {
  readonly id: string;
  matches(lowerFileName: string): boolean;
  importFile(file: ImportFileInput, options: ImportOptions): Promise<ImportResult>;
}
