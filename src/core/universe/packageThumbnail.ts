// =====================================================================
// RedijaApp — Capa dos modelos do Typst Universe
// O `.tar.gz` de um pacote-modelo traz `[template] thumbnail = "..."` no `typst.toml`.
// Aqui lemos o arquivo (gzip + tar) só para achar essa imagem, sem depender de bibliotecas.
// =====================================================================

export interface UniverseThumbnail {
  bytes: Uint8Array;
  mime: 'image/png' | 'image/webp' | 'image/jpeg';
}

/** Capas maiores que isso são ignoradas (o Typst Universe recomenda imagens pequenas). */
const MAX_THUMBNAIL_BYTES = 4 * 1024 * 1024;
const BLOCK = 512;
const decoder = new TextDecoder();

export async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readString(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.subarray(start, start + length);
  const end = slice.indexOf(0);
  return decoder.decode(end >= 0 ? slice.subarray(0, end) : slice);
}

function readSize(header: Uint8Array): number {
  // Tamanhos muito grandes usam codificação base-256 (bit mais alto ligado)
  if (header[124] & 0x80) {
    let value = 0;
    for (let i = 125; i < 136; i++) value = value * 256 + header[i];
    return value;
  }
  const text = readString(header, 124, 12).trim();
  return text ? parseInt(text, 8) || 0 : 0;
}

function readPaxPath(data: Uint8Array): string | null {
  const text = decoder.decode(data);
  let pos = 0;
  while (pos < text.length) {
    const space = text.indexOf(' ', pos);
    if (space < 0) break;
    const length = parseInt(text.slice(pos, space), 10);
    if (!length) break;
    const record = text.slice(space + 1, pos + length - 1);
    const eq = record.indexOf('=');
    if (eq > 0 && record.slice(0, eq) === 'path') return record.slice(eq + 1);
    pos += length;
  }
  return null;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^(\.\/|\/)+/, '');
}

/** Lista os arquivos comuns de um `.tar` (ustar, com nomes longos GNU e PAX). */
export function listTarFiles(tar: Uint8Array): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  let offset = 0;
  let pendingName: string | null = null;

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (header.every((b) => b === 0)) break;

    const size = readSize(header);
    const type = header[156] === 0 ? '0' : String.fromCharCode(header[156]);
    const dataStart = offset + BLOCK;
    const data = tar.subarray(dataStart, Math.min(dataStart + size, tar.length));
    offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;

    if (type === 'L') {
      pendingName = readString(data, 0, data.length);
      continue;
    }
    if (type === 'x') {
      pendingName = readPaxPath(data) ?? pendingName;
      continue;
    }
    if (type === 'g') continue;

    let name = readString(header, 0, 100);
    if (readString(header, 257, 6).startsWith('ustar')) {
      const prefix = readString(header, 345, 155);
      if (prefix) name = `${prefix}/${name}`;
    }
    if (pendingName) name = pendingName;
    pendingName = null;

    if (type === '0' || type === '7') files.set(normalizePath(name), data);
  }
  return files;
}

/** Lê `thumbnail` da seção `[template]` de um `typst.toml`. */
export function parseTemplateThumbnailPath(toml: string): string | null {
  let inTemplate = false;
  for (const rawLine of toml.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('[')) {
      inTemplate = /^\[\s*template\s*\]/.test(line);
      continue;
    }
    if (!inTemplate) continue;
    const match = line.match(/^thumbnail\s*=\s*(?:"([^"]*)"|'([^']*)')/);
    if (match) return normalizePath(match[1] ?? match[2] ?? '') || null;
  }
  return null;
}

function detectImageMime(bytes: Uint8Array): UniverseThumbnail['mime'] | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (
    bytes.length > 12 &&
    readString(bytes, 0, 4) === 'RIFF' &&
    readString(bytes, 8, 4) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  return null;
}

/**
 * Extrai a capa de um pacote-modelo a partir do `.tar.gz`. Retorna `null` se o pacote não é um
 * modelo, não declara capa ou a imagem não é PNG/WebP/JPEG válida.
 */
export async function extractTemplateThumbnail(
  tarGzBytes: Uint8Array,
): Promise<UniverseThumbnail | null> {
  const files = listTarFiles(await gunzip(tarGzBytes));

  // Normalmente os arquivos ficam na raiz; aceita também uma pasta única de topo.
  let base = '';
  let toml = files.get('typst.toml');
  if (!toml) {
    const nested = [...files.keys()].find((p) => /^[^/]+\/typst\.toml$/.test(p));
    if (nested) {
      base = nested.slice(0, -'typst.toml'.length);
      toml = files.get(nested);
    }
  }
  if (!toml) return null;

  const thumbnailPath = parseTemplateThumbnailPath(decoder.decode(toml));
  if (!thumbnailPath || thumbnailPath.split('/').includes('..')) return null;

  const image = files.get(`${base}${thumbnailPath}`);
  if (!image || image.length === 0 || image.length > MAX_THUMBNAIL_BYTES) return null;
  const mime = detectImageMime(image);
  return mime ? { bytes: image.slice(), mime } : null;
}
