import JSZip from 'jszip';
import { DocumentProject } from '@/types/document';
import { parseBackup } from '../db';
import { formatBytes, validateProjectQuota } from '../imageQuota';
import { ImportFailure, throwIfCancelled } from './errors';
import { DocumentImporterStrategy, ImportFileInput, ImportOptions, ImportResult } from './types';
import { findRedijaEntry, importFromRedijaZip } from './redijaZip';
import { pandocResponseToProject } from './pandoc/astToProject';
import { convertWithImportService } from './pandoc/client';

/** Limite de upload do serviço de importação (`MAX_UPLOAD_MB` do servidor). */
export const MAX_REMOTE_IMPORT_BYTES = 250 * 1024 * 1024;

const projectNameFrom = (fileName: string, fallback: string) =>
  fileName.replace(/\.[^.]+$/, '').trim() || fallback;

function assertNotEmpty(size: number | undefined): void {
  if (size === 0) {
    throw new ImportFailure(
      'O arquivo está vazio (0 bytes). Confira se ele foi salvo ou baixado por completo.',
    );
  }
}

function assertWithinUploadLimit(size: number | undefined): void {
  assertNotEmpty(size);
  if (size !== undefined && size > MAX_REMOTE_IMPORT_BYTES) {
    throw new ImportFailure(
      `O arquivo tem ${formatBytes(size)}, acima do limite de ${formatBytes(MAX_REMOTE_IMPORT_BYTES)} para importação. Comprima as imagens ou remova do .zip os arquivos que não fazem parte do trabalho.`,
    );
  }
}

function assertWithinQuota(project: DocumentProject): void {
  const quota = validateProjectQuota(project);
  if (!quota.valid) throw new ImportFailure(quota.error ?? 'O projeto excede o limite de imagens.');
}

async function readFileBytes(file: ImportFileInput, options: ImportOptions): Promise<ArrayBuffer> {
  assertNotEmpty(file.size);
  options.onProgress?.({ stage: 'reading' });
  const buffer = await file.arrayBuffer();
  throwIfCancelled(options.signal);
  assertNotEmpty(buffer.byteLength);
  return buffer;
}

/**
 * Converte o documento pelo serviço de importação (Pandoc, no Railway). Sem o serviço configurado
 * ou no ar, o erro (`ImportServiceUnavailableError`) chega ao usuário com a explicação.
 * `buffer` evita reler o arquivo quando ele já foi lido (ex.: .zip inspecionado antes).
 */
async function importRemote(
  file: ImportFileInput,
  options: ImportOptions,
  buffer?: ArrayBuffer,
): Promise<ImportResult> {
  assertWithinUploadLimit(file.size ?? buffer?.byteLength);
  // Um File (seletor de arquivos) vai direto para o envio, sem cópia em memória
  const body = file instanceof Blob ? file : new Blob([buffer ?? (await file.arrayBuffer())]);
  assertNotEmpty(body.size);
  assertWithinUploadLimit(body.size);

  const response = await convertWithImportService(file.name, body, options);
  throwIfCancelled(options.signal);
  options.onProgress?.({ stage: 'building' });
  const project = pandocResponseToProject(response, projectNameFrom(file.name, 'Projeto Importado'));
  assertWithinQuota(project);
  return { project, warnings: response.warnings ?? [] };
}

/** `.redija` ou `.json` com um backup do Redija: importação local. */
async function importBackup(file: ImportFileInput, options: ImportOptions): Promise<ImportResult> {
  const buffer = await readFileBytes(file, options);
  options.onProgress?.({ stage: 'building' });
  try {
    return { project: parseBackup(new TextDecoder('utf-8').decode(buffer)), warnings: [] };
  } catch (err) {
    throw new ImportFailure(err instanceof Error ? err.message : 'Arquivo de backup inválido.');
  }
}

/** Assinatura `PK` de um .zip: cabeçalho local, arquivo vazio ou zip dividido. */
function zipSignature(buffer: ArrayBuffer): 'zip' | 'empty' | 'invalid' {
  const head = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
  if (head[0] !== 0x50 || head[1] !== 0x4b) return 'invalid';
  if (head[2] === 0x05 && head[3] === 0x06) return 'empty';
  return (head[2] === 0x03 && head[3] === 0x04) || (head[2] === 0x07 && head[3] === 0x08)
    ? 'zip'
    : 'invalid';
}

async function openZip(buffer: ArrayBuffer): Promise<JSZip> {
  const signature = zipSignature(buffer);
  if (signature === 'invalid') {
    throw new ImportFailure(
      'O arquivo não é um .zip válido: ele pode estar corrompido ou ser de outro formato com a extensão trocada.',
    );
  }
  if (signature === 'empty') throw new ImportFailure('O .zip está vazio: não há arquivos dentro dele.');
  try {
    return await JSZip.loadAsync(buffer);
  } catch (err) {
    if (err instanceof Error && /encrypt/i.test(err.message)) {
      throw new ImportFailure('O .zip está protegido por senha. Compacte o projeto de novo, sem senha.');
    }
    throw new ImportFailure(
      'Não foi possível abrir o .zip: o arquivo está corrompido ou incompleto (o download pode ter sido interrompido).',
    );
  }
}

const remoteStrategy = (id: string, extensions: string[]): DocumentImporterStrategy => ({
  id,
  matches: (lowerName) => extensions.some((ext) => lowerName.endsWith(ext)),
  importFile: (file, options) => importRemote(file, options),
});

export const IMPORTER_STRATEGIES: DocumentImporterStrategy[] = [
  {
    id: 'redija',
    matches: (lowerName) => lowerName.endsWith('.redija'),
    importFile: importBackup,
  },
  remoteStrategy('docx', ['.docx']),
  {
    id: 'zip',
    matches: (lowerName) => lowerName.endsWith('.zip'),
    importFile: async (file, options) => {
      const buffer = await readFileBytes(file, options);
      const zip = await openZip(buffer);
      throwIfCancelled(options.signal);
      // Pacotes exportados pelo próprio Redija continuam 100% locais
      const redijaEntry = findRedijaEntry(zip);
      if (redijaEntry) {
        const project = await importFromRedijaZip(zip, redijaEntry, options);
        assertWithinQuota(project);
        return { project, warnings: [] };
      }
      // Overleaf (.tex) e projetos Typst (.typ) vão para o serviço de importação
      return importRemote(file, options, buffer);
    },
  },
  remoteStrategy('typst', ['.typ']),
  remoteStrategy('latex', ['.tex']),
  remoteStrategy('markdown', ['.md', '.markdown']),
  {
    // Backup salvo como .json (o parseBackup aceita o mesmo conteúdo do .redija)
    id: 'json',
    matches: (lowerName) => lowerName.endsWith('.json'),
    importFile: importBackup,
  },
];

/** Extensões aceitas pelo seletor de arquivos (mesma lista das estratégias). */
export const IMPORT_ACCEPT = '.redija,.docx,.zip,.typ,.tex,.md,.markdown,.json';

/**
 * Ponto de entrada unificado para importação de qualquer arquivo compatível via Strategy Registry.
 * `onProgress` informa a etapa atual; `signal` cancela (rejeita com `ImportCancelledError`).
 * Erros com mensagem para o usuário são `ImportFailure` (com `retriable`).
 */
export async function importDocumentFile(
  file: ImportFileInput,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const lowerName = file.name.toLowerCase().trim();
  const strategy = IMPORTER_STRATEGIES.find((s) => s.matches(lowerName));
  if (!strategy) {
    throw new ImportFailure(
      'Formato de arquivo não suportado. Envie um arquivo .docx (Word), .md (Markdown), .zip (RedijaApp, Overleaf ou Typst), .typ, .tex, .redija ou .json (backup do RedijaApp).',
    );
  }
  throwIfCancelled(options.signal);
  return await strategy.importFile(file, options);
}

export type {
  ImportFileInput,
  DocumentImporterStrategy,
  ImportOptions,
  ImportProgress,
  ImportResult,
  ImportStage,
} from './types';
export { sanitizeHtml } from './shared';
export {
  detectDocxTemplate,
  detectLatexTemplate,
  detectTypstTemplate,
} from './pandoc/templateDetection';
export { importFromRedijaZip } from './redijaZip';
export { pandocResponseToProject } from './pandoc/astToProject';
export {
  ImportCancelledError,
  ImportFailure,
  ImportServiceUnavailableError,
  isImportCancelled,
} from './errors';
