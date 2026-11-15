import JSZip from 'jszip';
import { DocumentProject } from '@/types/document';
import { parseBackup } from '../db';
import { DocumentImporterStrategy, ImportFileInput } from './types';
import { findRedijaEntry, importFromRedijaZip } from './redijaZip';
import { pandocResponseToProject } from './pandoc/astToProject';
import { convertWithImportService } from './pandoc/client';

const projectNameFrom = (fileName: string, fallback: string) =>
  fileName.replace(/\.[^.]+$/, '').trim() || fallback;

/**
 * Converte o documento pelo serviço de importação (Pandoc, no Railway). Sem o serviço configurado
 * ou no ar, o erro (`ImportServiceUnavailableError`) chega ao usuário com a explicação.
 */
async function importRemote(fileName: string, buffer: ArrayBuffer): Promise<DocumentProject> {
  const response = await convertWithImportService(fileName, buffer);
  if (response.warnings?.length) {
    console.warn('[importação] avisos do conversor:', response.warnings);
  }
  return pandocResponseToProject(response, projectNameFrom(fileName, 'Projeto Importado'));
}

const decode = (buffer: ArrayBuffer) => new TextDecoder('utf-8').decode(buffer);

const remoteStrategy = (id: string, extensions: string[]): DocumentImporterStrategy => ({
  id,
  matches: (lowerName) => extensions.some((ext) => lowerName.endsWith(ext)),
  importFile: async (file) => importRemote(file.name, await file.arrayBuffer()),
});

export const IMPORTER_STRATEGIES: DocumentImporterStrategy[] = [
  {
    id: 'redija',
    matches: (lowerName) => lowerName.endsWith('.redija'),
    importFile: async (file) => parseBackup(decode(await file.arrayBuffer())),
  },
  remoteStrategy('docx', ['.docx']),
  {
    id: 'zip',
    matches: (lowerName) => lowerName.endsWith('.zip'),
    importFile: async (file) => {
      const buffer = await file.arrayBuffer();
      // Pacotes exportados pelo próprio Redija continuam 100% locais
      const zip = await JSZip.loadAsync(buffer);
      const redijaEntry = findRedijaEntry(zip);
      if (redijaEntry) return importFromRedijaZip(zip, redijaEntry);
      // Overleaf (.tex) e projetos Typst (.typ) vão para o serviço de importação
      return importRemote(file.name, buffer);
    },
  },
  remoteStrategy('typst', ['.typ']),
  remoteStrategy('latex', ['.tex']),
  remoteStrategy('markdown', ['.md', '.markdown']),
];

/**
 * Ponto de entrada unificado para importação de qualquer arquivo compatível via Strategy Registry.
 */
export async function importDocumentFile(file: ImportFileInput): Promise<DocumentProject> {
  const lowerName = file.name.toLowerCase().trim();
  const strategy = IMPORTER_STRATEGIES.find((s) => s.matches(lowerName));
  if (!strategy) {
    throw new Error(
      'Formato de arquivo não suportado. Envie um arquivo .docx (Word), .md (Markdown), .zip (RedijaApp, Overleaf ou Typst), .typ, .tex ou .redija.',
    );
  }
  return await strategy.importFile(file);
}

export type { ImportFileInput, DocumentImporterStrategy } from './types';
export { sanitizeHtml } from './shared';
export {
  detectDocxTemplate,
  detectLatexTemplate,
  detectTypstTemplate,
} from './pandoc/templateDetection';
export { importFromRedijaZip } from './redijaZip';
export { pandocResponseToProject } from './pandoc/astToProject';
export { ImportServiceUnavailableError } from './pandoc/client';
