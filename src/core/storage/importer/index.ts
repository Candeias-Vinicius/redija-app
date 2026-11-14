import JSZip from 'jszip';
import { DocumentProject } from '@/types/document';
import { parseBackup } from '../db';
import { DocumentImporterStrategy, ImportFileInput } from './types';
import { importFromDocx } from './docxParser';
import { parseLatexToProject } from './latexParser';
import { parseTypstToProject } from './typstParser';
import { importFromZip } from './zipOrchestrator';
import { pandocResponseToProject } from './pandoc/astToProject';
import {
  convertWithImportService,
  ImportServiceUnavailableError,
  isRemoteImportEnabled,
} from './pandoc/client';

const projectNameFrom = (fileName: string, fallback: string) =>
  fileName.replace(/\.[^.]+$/, '').trim() || fallback;

/**
 * Importa via serviço Pandoc (Railway). Se o serviço não estiver configurado ou estiver fora do ar,
 * usa o parser local legado quando houver um para o formato.
 */
async function importRemoteOrLegacy(
  file: ImportFileInput,
  legacy: ((buffer: ArrayBuffer) => Promise<DocumentProject>) | null,
): Promise<DocumentProject> {
  const buffer = await file.arrayBuffer();
  if (isRemoteImportEnabled()) {
    try {
      const response = await convertWithImportService(file.name, buffer);
      if (response.warnings?.length) {
        console.warn('[importação] avisos do conversor:', response.warnings);
      }
      return pandocResponseToProject(response, projectNameFrom(file.name, 'Projeto Importado'));
    } catch (err) {
      if (!(err instanceof ImportServiceUnavailableError) || !legacy) throw err;
      console.warn('[importação] serviço indisponível, usando conversor local:', err.message);
    }
  }
  if (!legacy) {
    throw new Error(
      'A importação deste formato precisa do serviço de importação, que está indisponível no momento. Tente novamente em instantes.',
    );
  }
  return legacy(buffer);
}

const decode = (buffer: ArrayBuffer) => new TextDecoder('utf-8').decode(buffer);

export const IMPORTER_STRATEGIES: DocumentImporterStrategy[] = [
  {
    id: 'redija',
    matches: (lowerName) => lowerName.endsWith('.redija'),
    importFile: async (file) => parseBackup(decode(await file.arrayBuffer())),
  },
  {
    id: 'docx',
    matches: (lowerName) => lowerName.endsWith('.docx'),
    importFile: (file) => importRemoteOrLegacy(file, (buffer) => importFromDocx(buffer, file.name)),
  },
  {
    id: 'zip',
    matches: (lowerName) => lowerName.endsWith('.zip'),
    importFile: async (file) => {
      const buffer = await file.arrayBuffer();
      // Pacotes exportados pelo próprio Redija continuam 100% locais
      const zip = await JSZip.loadAsync(buffer);
      const hasRedijaBackup = Object.keys(zip.files).some((n) => n.toLowerCase().endsWith('.redija'));
      if (hasRedijaBackup || !isRemoteImportEnabled()) {
        return importFromZip(buffer, file.name);
      }
      return importRemoteOrLegacy(
        { name: file.name, arrayBuffer: async () => buffer },
        (b) => importFromZip(b, file.name),
      );
    },
  },
  {
    id: 'typst',
    matches: (lowerName) => lowerName.endsWith('.typ'),
    importFile: (file) =>
      importRemoteOrLegacy(file, async (buffer) =>
        parseTypstToProject(decode(buffer), projectNameFrom(file.name, 'Projeto Typst'), new Map()),
      ),
  },
  {
    id: 'latex',
    matches: (lowerName) => lowerName.endsWith('.tex'),
    importFile: (file) =>
      importRemoteOrLegacy(file, async (buffer) =>
        parseLatexToProject(decode(buffer), projectNameFrom(file.name, 'Projeto LaTeX'), new Map()),
      ),
  },
  {
    id: 'markdown',
    matches: (lowerName) => lowerName.endsWith('.md') || lowerName.endsWith('.markdown'),
    importFile: (file) => importRemoteOrLegacy(file, null),
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
      'Formato de arquivo não suportado. Envie um arquivo .docx (Word), .md (Markdown), .zip (RedijaApp, Overleaf ou Typst), .typ, .tex ou .redija.',
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
export { pandocResponseToProject } from './pandoc/astToProject';
