import { DocumentProject } from '@/types/document';
import { parseBackup } from '../db';
import { DocumentImporterStrategy, ImportFileInput } from './types';
import { importFromDocx } from './docxParser';
import { parseLatexToProject } from './latexParser';
import { parseTypstToProject } from './typstParser';
import { importFromZip } from './zipOrchestrator';

export const IMPORTER_STRATEGIES: DocumentImporterStrategy[] = [
  {
    id: 'redija',
    matches: (lowerName) => lowerName.endsWith('.redija'),
    importFile: async (file) => {
      const buffer = await file.arrayBuffer();
      const jsonString = new TextDecoder('utf-8').decode(buffer);
      return parseBackup(jsonString);
    },
  },
  {
    id: 'docx',
    matches: (lowerName) => lowerName.endsWith('.docx'),
    importFile: async (file) => importFromDocx(await file.arrayBuffer(), file.name),
  },
  {
    id: 'zip',
    matches: (lowerName) => lowerName.endsWith('.zip'),
    importFile: async (file) => importFromZip(await file.arrayBuffer(), file.name),
  },
  {
    id: 'typst',
    matches: (lowerName) => lowerName.endsWith('.typ'),
    importFile: async (file) => {
      const buffer = await file.arrayBuffer();
      const typContent = new TextDecoder('utf-8').decode(buffer);
      const cleanName = file.name.replace(/\.typ$/i, '').trim() || 'Projeto Typst';
      return parseTypstToProject(typContent, cleanName, new Map());
    },
  },
  {
    id: 'latex',
    matches: (lowerName) => lowerName.endsWith('.tex'),
    importFile: async (file) => {
      const buffer = await file.arrayBuffer();
      const texContent = new TextDecoder('utf-8').decode(buffer);
      const cleanName = file.name.replace(/\.tex$/i, '').trim() || 'Projeto LaTeX';
      return parseLatexToProject(texContent, cleanName, new Map());
    },
  },
];

/**
 * Ponto de entrada unificado para importação de qualquer arquivo compatível via Strategy Registry.
 */
export async function importDocumentFile(file: ImportFileInput): Promise<DocumentProject> {
  const lowerName = file.name.toLowerCase().trim();
  const strategy = IMPORTER_STRATEGIES.find((s) => s.matches(lowerName));
  if (!strategy) {
    throw new Error(
      'Formato de arquivo não suportado. Envie um arquivo .docx (Word), .zip (RedijaApp, Overleaf ou Typst), .typ, .tex ou .redija.',
    );
  }
  return await strategy.importFile(file);
}

export type { ImportFileInput, DocumentImporterStrategy } from './types';
export { sanitizeHtml } from './shared';
export { detectLatexTemplate, parseLatexToProject } from './latexParser';
export { importFromDocx, detectDocxTemplate, parseDocxHtmlToProject } from './docxParser';
export { detectTypstTemplate, parseTypstToProject } from './typstParser';
export { importFromZip } from './zipOrchestrator';
