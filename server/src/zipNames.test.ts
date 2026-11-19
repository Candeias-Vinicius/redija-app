import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { crc32 } from 'node:zlib';
import { decodeTextSource } from './convert.ts';
import { ImportError, safeUnzip } from './zip.ts';
import { decodeCp850, isJunkEntry, normalizeEntryPath } from './zipNames.ts';

interface RawEntry {
  /** Bytes do nome exatamente como o compactador os grava. */
  name: Uint8Array;
  data?: Uint8Array;
  flags?: number;
  extra?: Uint8Array;
}

/**
 * Monta um .zip (entradas sem compressão) com bytes de nome e flags arbitrários. O fflate sempre
 * liga a flag UTF-8, então não serve para reproduzir os zips do Finder e do Explorer.
 */
function rawZip(entries: RawEntry[]): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { name, data = new Uint8Array(), flags = 0, extra = new Uint8Array() } of entries) {
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(extra.length, 28);
    const localRecord = Buffer.concat([local, name, extra, data]);
    locals.push(localRecord);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(extra.length, 30);
    central.writeUInt32LE(offset, 42);
    centrals.push(Buffer.concat([central, name, extra]));
    offset += localRecord.length;
  }
  const directory = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(directory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, eocd]));
}

const utf8 = (s: string) => new TextEncoder().encode(s);
const cp850 = (s: string) => {
  const table = decodeCp850(Uint8Array.from({ length: 128 }, (_, i) => 0x80 + i));
  return Uint8Array.from([...s].map((ch) => (ch.charCodeAt(0) < 0x80 ? ch.charCodeAt(0) : 0x80 + table.indexOf(ch))));
};
const UTF8_FLAG = 0x0800;
const limits = { maxEntries: 50, maxUnzippedBytes: 1024 * 1024 };

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'redija-zipnames-'));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('safeUnzip lê nomes do Finder do macOS (UTF-8 em NFD, sem flag) e ignora .DS_Store e __MACOSX', async () => {
  const nfd = (s: string) => utf8(s.normalize('NFD'));
  const zip = rawZip([
    { name: nfd('Meu TCC/main.tex'), data: utf8('\\input{capitulos/introdução}') },
    { name: nfd('Meu TCC/capitulos/introdução.tex'), data: utf8('Introdução') },
    { name: nfd('Meu TCC/.DS_Store'), data: utf8('lixo') },
    { name: nfd('__MACOSX/Meu TCC/._main.tex'), data: utf8('lixo') },
  ]);
  await withTempDir(async (dir) => {
    const files = await safeUnzip(zip, dir, limits);
    assert.deepEqual(files.sort(), ['Meu TCC/capitulos/introdução.tex', 'Meu TCC/main.tex']);
    // O nome no disco bate com o \input{} digitado (NFC)
    assert.equal(await readFile(path.join(dir, 'Meu TCC/capitulos/introdução.tex'), 'utf8'), 'Introdução');
  });
});

test('safeUnzip lê nomes do Explorer do Windows (code page CP850, sem flag)', async () => {
  const zip = rawZip([
    { name: cp850('capitulos/introdução.tex'), data: utf8('a') },
    { name: cp850('figuras/gráfico de pressão.png'), data: utf8('b') },
  ]);
  await withTempDir(async (dir) => {
    const files = await safeUnzip(zip, dir, limits);
    assert.deepEqual(files.sort(), ['capitulos/introdução.tex', 'figuras/gráfico de pressão.png']);
  });
});

test('safeUnzip aceita "\\" como separador (Compress-Archive do PowerShell 5.1)', async () => {
  const zip = rawZip([{ name: utf8('capitulos\\introdução.tex'), flags: UTF8_FLAG, data: utf8('a') }]);
  await withTempDir(async (dir) => {
    assert.deepEqual(await safeUnzip(zip, dir, limits), ['capitulos/introdução.tex']);
  });
});

test('safeUnzip continua recusando caminhos que escapam da pasta, com "/" ou "\\"', async () => {
  for (const name of ['..\\..\\etc\\cron.d\\x', '../fora.tex', '\\raiz.tex']) {
    const zip = rawZip([{ name: utf8(name), flags: UTF8_FLAG, data: utf8('x') }]);
    await withTempDir(async (dir) => {
      await assert.rejects(safeUnzip(zip, dir, limits), ImportError);
    });
  }
});

test('safeUnzip usa o extra field Unicode Path (7-Zip, WinRAR) só quando o CRC confere', async () => {
  const legacy = cp850('introdu?ao.tex');
  const unicodePath = (crc: number) => {
    const target = utf8('introdução.tex');
    const header = Buffer.alloc(9);
    header.writeUInt16LE(0x7075, 0);
    header.writeUInt16LE(5 + target.length, 2);
    header.writeUInt8(1, 4);
    header.writeUInt32LE(crc, 5);
    return new Uint8Array(Buffer.concat([header, target]));
  };
  await withTempDir(async (dir) => {
    const valid = rawZip([{ name: legacy, extra: unicodePath(crc32(legacy)), data: utf8('a') }]);
    assert.deepEqual(await safeUnzip(valid, dir, limits), ['introdução.tex']);
  });
  await withTempDir(async (dir) => {
    const stale = rawZip([{ name: legacy, extra: unicodePath(12345), data: utf8('a') }]);
    assert.deepEqual(await safeUnzip(stale, dir, limits), ['introdu?ao.tex']);
  });
});

test('safeUnzip não conta nem extrai a pasta .git (projetos versionados)', async () => {
  const gitObjects = Array.from({ length: 60 }, (_, i) => ({ name: utf8(`.git/objects/${i}`), data: utf8('x') }));
  const zip = rawZip([...gitObjects, { name: utf8('main.tex'), data: utf8('x') }]);
  await withTempDir(async (dir) => {
    assert.deepEqual(await safeUnzip(zip, dir, limits), ['main.tex']);
  });
});

test('safeUnzip explica quando o .zip está protegido por senha', async () => {
  const zip = rawZip([{ name: utf8('main.tex'), flags: 0x0001, data: utf8('cifrado') }]);
  await withTempDir(async (dir) => {
    await assert.rejects(safeUnzip(zip, dir, limits), /protegido por senha/);
  });
});

test('isJunkEntry e normalizeEntryPath', () => {
  assert.equal(isJunkEntry('__MACOSX/x/._a.tex'), true);
  assert.equal(isJunkEntry('proj/Thumbs.db'), true);
  assert.equal(isJunkEntry('proj/.git/HEAD'), true);
  assert.equal(isJunkEntry('proj/.gitignore'), false);
  assert.equal(isJunkEntry('proj/main.tex'), false);
  assert.equal(normalizeEntryPath('./a\\b.tex'), 'a/b.tex');
  assert.equal(normalizeEntryPath('introdução'.normalize('NFD')), 'introdução');
});

test('decodeTextSource converte Latin-1, UTF-16 e BOM para UTF-8', () => {
  assert.deepEqual(decodeTextSource(utf8('Introdução')), { text: 'Introdução', transcoded: false });
  assert.deepEqual(decodeTextSource(Buffer.from('Introdução', 'latin1')), { text: 'Introdução', transcoded: true });
  assert.deepEqual(decodeTextSource(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8('Olá')])), { text: 'Olá', transcoded: true });
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('Conclusão', 'utf16le')]);
  assert.deepEqual(decodeTextSource(utf16), { text: 'Conclusão', transcoded: true });
});
