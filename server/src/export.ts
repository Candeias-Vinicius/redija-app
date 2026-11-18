import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { runPandoc } from './pandoc.ts';
import { ImportError } from './zip.ts';

export interface ExportRequestPayload {
  fileName?: string;
  docxBase64?: string;
  ast?: unknown;
  markdown?: string;
  warnings?: string[];
}

export interface ExportResponsePayload {
  fileName: string;
  docxBase64: string;
  warnings: string[];
}

/**
 * Processa a exportação para `.docx` usando uma pasta temporária exclusiva que é
 * obrigatoriamente removida no bloco `finally`, seguindo a mesma política de privacidade
 * e armazenamento zero de `POST /convert`.
 */
export async function processDocxExport(payload: ExportRequestPayload): Promise<ExportResponsePayload> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'redija-export-'));
  try {
    const rawName = Array.from(payload.fileName || 'projeto_redija.docx')
      .filter((ch) => ch.charCodeAt(0) >= 32)
      .join('');
    const safeFileName =
      rawName
        .replace(/[<>:"/\\|?*]+/g, '_')
        .trim() || 'projeto_redija.docx';
    const warnings = Array.isArray(payload.warnings) ? payload.warnings.map(String) : [];

    // Caminho 1: Pacote OOXML pré-montado pelo cliente (validado em pasta temporária sem persistência)
    if (typeof payload.docxBase64 === 'string' && payload.docxBase64.length > 0) {
      let bytes: Buffer;
      try {
        bytes = Buffer.from(payload.docxBase64, 'base64');
      } catch {
        throw new ImportError('Conteúdo base64 inválido para exportação .docx.', 400);
      }
      if (bytes.byteLength < 64) {
        throw new ImportError('Arquivo .docx inválido ou vazio.', 400);
      }

      // Verifica integridade estrutural do pacote OpenXML (ZIP com word/document.xml)
      let entries: Record<string, Uint8Array>;
      try {
        entries = unzipSync(new Uint8Array(bytes));
      } catch {
        throw new ImportError('Pacote .docx corrompido (ZIP inválido).', 422);
      }
      if (!entries['word/document.xml'] || !entries['[Content_Types].xml']) {
        throw new ImportError('Pacote .docx incompleto (word/document.xml ausente).', 422);
      }

      const tempOutPath = path.join(root, 'export.docx');
      await writeFile(tempOutPath, bytes);
      const verified = await readFile(tempOutPath);

      return {
        fileName: safeFileName.endsWith('.docx') ? safeFileName : `${safeFileName}.docx`,
        docxBase64: verified.toString('base64'),
        warnings,
      };
    }

    // Caminho 2: Conversão via Pandoc AST JSON ou Markdown para .docx na pasta temporária
    if (payload.ast && typeof payload.ast === 'object') {
      const inputJsonPath = path.join(root, 'input.json');
      const outputDocxPath = path.join(root, 'output.docx');
      await writeFile(inputJsonPath, JSON.stringify(payload.ast), 'utf8');
      await runPandoc(['-f', 'json', '-t', 'docx', '-o', 'output.docx', 'input.json'], { cwd: root });
      const docxBytes = await readFile(outputDocxPath);
      return {
        fileName: safeFileName.endsWith('.docx') ? safeFileName : `${safeFileName}.docx`,
        docxBase64: docxBytes.toString('base64'),
        warnings,
      };
    }

    if (typeof payload.markdown === 'string' && payload.markdown.trim()) {
      const inputMdPath = path.join(root, 'input.md');
      const outputDocxPath = path.join(root, 'output.docx');
      await writeFile(inputMdPath, payload.markdown, 'utf8');
      await runPandoc(['-f', 'markdown', '-t', 'docx', '-o', 'output.docx', 'input.md'], { cwd: root });
      const docxBytes = await readFile(outputDocxPath);
      return {
        fileName: safeFileName.endsWith('.docx') ? safeFileName : `${safeFileName}.docx`,
        docxBase64: docxBytes.toString('base64'),
        warnings,
      };
    }

    throw new ImportError('Envie docxBase64, ast ou markdown para exportar em .docx.', 400);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
