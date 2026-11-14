import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { resolveInside } from './pathSafety.ts';

export class ImportError extends Error {
  readonly status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

export interface ZipLimits {
  maxEntries: number;
  maxUnzippedBytes: number;
}

/**
 * Descompacta um .zip em `destDir` recusando zip bombs (tamanho declarado e real),
 * caminhos que escapam da pasta e excesso de arquivos. Devolve os caminhos relativos gravados.
 */
export async function safeUnzip(
  bytes: Uint8Array,
  destDir: string,
  limits: ZipLimits,
): Promise<string[]> {
  let entryCount = 0;
  let declaredTotal = 0;

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      filter: (file) => {
        if (file.name.endsWith('/')) return false;
        if (file.name.startsWith('__MACOSX/') || file.name.split('/').pop()?.startsWith('._')) {
          return false;
        }
        entryCount += 1;
        declaredTotal += file.originalSize;
        if (entryCount > limits.maxEntries) {
          throw new ImportError(`O .zip tem arquivos demais (limite: ${limits.maxEntries}).`, 413);
        }
        if (declaredTotal > limits.maxUnzippedBytes) {
          throw new ImportError('O conteúdo descompactado do .zip é grande demais.', 413);
        }
        return true;
      },
    });
  } catch (err) {
    if (err instanceof ImportError) throw err;
    throw new ImportError('Não foi possível abrir o .zip: arquivo corrompido ou em formato não suportado.');
  }

  const written: string[] = [];
  let realTotal = 0;
  for (const [name, data] of Object.entries(entries)) {
    realTotal += data.byteLength;
    if (realTotal > limits.maxUnzippedBytes) {
      throw new ImportError('O conteúdo descompactado do .zip é grande demais.', 413);
    }
    const target = resolveInside(destDir, name);
    if (!target) {
      throw new ImportError(`O .zip contém um caminho inválido: ${name}`);
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
    written.push(name);
  }
  return written;
}
