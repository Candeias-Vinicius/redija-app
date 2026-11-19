import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { resolveInside } from './pathSafety.ts';
import { isJunkEntry, normalizeEntryPath, readCentralDirectory } from './zipNames.ts';

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
 *
 * Os nomes são decodificados pela regra de cada compactador (macOS, Windows, PowerShell; ver
 * `zipNames.ts`) e normalizados, e os arquivos de sistema (`__MACOSX/`, `.DS_Store`, `.git/`…)
 * são ignorados.
 */
export async function safeUnzip(
  bytes: Uint8Array,
  destDir: string,
  limits: ZipLimits,
): Promise<string[]> {
  let entryCount = 0;
  let declaredTotal = 0;
  const directory = readCentralDirectory(bytes);
  const entryPath = (fflateName: string) => normalizeEntryPath(directory?.names.get(fflateName) ?? fflateName);

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes, {
      filter: (file) => {
        const name = entryPath(file.name);
        if (name.endsWith('/') || isJunkEntry(name)) return false;
        if (directory?.encrypted.has(file.name)) {
          throw new ImportError('O .zip está protegido por senha. Compacte o projeto de novo, sem senha.');
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

  const written = new Set<string>();
  let realTotal = 0;
  for (const [fflateName, data] of Object.entries(entries)) {
    const name = entryPath(fflateName);
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
    written.add(name);
  }
  return [...written];
}
