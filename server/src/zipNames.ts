import { crc32 } from 'node:zlib';
import { strFromU8 } from 'fflate';

/**
 * Nomes de arquivo dentro de um .zip.
 *
 * O fflate decodifica como Latin-1 todo nome sem a flag UTF-8 (bit 11 do cabeçalho). Só que os
 * compactadores nativos não marcam essa flag: o Finder do macOS grava UTF-8 (em NFD) e o Explorer
 * do Windows grava na code page OEM (CP850 em pt-BR). Sem correção, `capitulos/introdução.tex` vira
 * `capitulos/introducÌ§aÌo.tex` no disco, o `\input{capitulos/introdução}` não acha o arquivo e o
 * capítulo some sem erro. Este módulo lê o diretório central do .zip para decodificar cada nome
 * pela regra certa.
 */

/** CP850 (code page OEM do Windows em pt-BR), bytes 0x80–0xFF, gerada a partir do codec `cp850`. */
const CP850_HIGH =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´­±‗¾¶§÷¸°¨·¹³²■ ';

const UTF8_FLAG = 0x0800;
const ENCRYPTED_FLAG = 0x0001;
/** Extra field "Info-ZIP Unicode Path": nome em UTF-8 gravado por 7-Zip, WinRAR e Info-ZIP. */
const UNICODE_PATH_EXTRA = 0x7075;

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;

const strictUtf8 = new TextDecoder('utf-8', { fatal: true });

export function decodeCp850(raw: Uint8Array): string {
  let out = '';
  for (const byte of raw) out += byte < 0x80 ? String.fromCharCode(byte) : CP850_HIGH[byte - 0x80];
  return out;
}

function unicodePathFromExtra(extra: Uint8Array, rawName: Uint8Array): string | null {
  const view = new DataView(extra.buffer, extra.byteOffset, extra.byteLength);
  for (let i = 0; i + 4 <= extra.length; ) {
    const id = view.getUint16(i, true);
    const size = view.getUint16(i + 2, true);
    const start = i + 4;
    if (start + size > extra.length) return null;
    // Versão 1 + CRC-32 do nome do cabeçalho: se o nome mudou depois, o extra field está velho
    if (id === UNICODE_PATH_EXTRA && size >= 5 && extra[start] === 1) {
      if (view.getUint32(start + 1, true) === crc32(rawName)) {
        try {
          return strictUtf8.decode(extra.subarray(start + 5, start + size));
        } catch {
          return null;
        }
      }
    }
    i = start + size;
  }
  return null;
}

/**
 * Decodifica o nome de uma entrada a partir dos bytes do cabeçalho:
 * flag UTF-8 → UTF-8; senão o extra field Unicode Path; senão UTF-8 se os bytes forem UTF-8
 * válido (macOS, Linux); senão CP850 (Windows).
 */
export function decodeEntryName(rawName: Uint8Array, flags: number, extra: Uint8Array): string {
  if (flags & UTF8_FLAG) return strFromU8(rawName);
  const unicodePath = unicodePathFromExtra(extra, rawName);
  if (unicodePath !== null) return unicodePath;
  try {
    return strictUtf8.decode(rawName);
  } catch {
    return decodeCp850(rawName);
  }
}

/**
 * Caminho canônico: `\` vira `/` (o `Compress-Archive` do PowerShell 5.1 grava `\`), forma NFC
 * (o macOS grava acentos decompostos, NFD, enquanto o `\input{}` digitado no editor está em NFC)
 * e sem `./` no início.
 */
export function normalizeEntryPath(name: string): string {
  return name.replace(/\\/g, '/').normalize('NFC').replace(/^(?:\.\/)+/, '');
}

const JUNK_DIRS = new Set(['__macosx', '.git', '.svn', '.hg']);
const JUNK_FILES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini', '.git']);

/**
 * Arquivos que o sistema operacional ou o controle de versão colocam no .zip e que não fazem parte
 * do documento: `__MACOSX/`, `._*` (AppleDouble), `.DS_Store`, `Thumbs.db`, `desktop.ini`, `.git/`.
 * Ficam fora da contagem de arquivos (um `.git/` passa fácil do limite) e não são extraídos.
 */
export function isJunkEntry(name: string): boolean {
  const parts = name.toLowerCase().split('/').filter(Boolean);
  const base = parts.pop() ?? '';
  return base.startsWith('._') || JUNK_FILES.has(base) || parts.some((part) => JUNK_DIRS.has(part));
}

export interface CentralDirectoryInfo {
  /** Nome como o fflate o entrega → nome decodificado corretamente (ainda sem normalizar). */
  names: Map<string, string>;
  /** Nomes (como o fflate os entrega) das entradas protegidas por senha. */
  encrypted: Set<string>;
}

/**
 * Lê o diretório central (inclusive ZIP64) para obter os bytes brutos e as flags de cada nome.
 * Devolve `null` se a estrutura não puder ser lida: aí os nomes do fflate são usados como estão.
 */
export function readCentralDirectory(bytes: Uint8Array): CentralDirectoryInfo | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = (offset: number) => view.getUint16(offset, true);
    const u32 = (offset: number) => view.getUint32(offset, true);

    let eocd = -1;
    const lowest = Math.max(0, bytes.length - 22 - 0xffff);
    for (let i = bytes.length - 22; i >= lowest; i--) {
      if (u32(i) === EOCD_SIGNATURE) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) return null;

    let count = u16(eocd + 10);
    let offset = u32(eocd + 16);
    if ((count === 0xffff || offset === 0xffffffff) && eocd >= 20 && u32(eocd - 20) === ZIP64_LOCATOR_SIGNATURE) {
      const zip64Eocd = Number(view.getBigUint64(eocd - 20 + 8, true));
      if (u32(zip64Eocd) !== ZIP64_EOCD_SIGNATURE) return null;
      count = Number(view.getBigUint64(zip64Eocd + 32, true));
      offset = Number(view.getBigUint64(zip64Eocd + 48, true));
    }

    const names = new Map<string, string>();
    const encrypted = new Set<string>();
    let p = offset;
    for (let n = 0; n < count; n++) {
      if (p + 46 > bytes.length || u32(p) !== CENTRAL_HEADER_SIGNATURE) return null;
      const flags = u16(p + 8);
      const nameLength = u16(p + 28);
      const extraLength = u16(p + 30);
      const commentLength = u16(p + 32);
      const rawName = bytes.subarray(p + 46, p + 46 + nameLength);
      const extra = bytes.subarray(p + 46 + nameLength, p + 46 + nameLength + extraLength);
      // Mesma decodificação que o fflate aplica: é a chave que ele usa no resultado
      const fflateName = strFromU8(rawName, !(flags & UTF8_FLAG));
      names.set(fflateName, decodeEntryName(rawName, flags, extra));
      if (flags & ENCRYPTED_FLAG) encrypted.add(fflateName);
      p += 46 + nameLength + extraLength + commentLength;
    }
    return { names, encrypted };
  } catch {
    return null;
  }
}
