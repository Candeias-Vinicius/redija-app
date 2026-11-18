import 'fake-indexeddb/auto';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/core/storage/db';
import {
  extractTemplateThumbnail,
  listTarFiles,
  parseTemplateThumbnailPath,
} from '../packageThumbnail';
import { getUniversePackageThumbnail } from '../universeResolver';

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6]);
const encoder = new TextEncoder();

function header(name: string, size: number, type = '0'): Uint8Array {
  const block = new Uint8Array(512);
  block.set(encoder.encode(name).subarray(0, 100), 0);
  block.set(encoder.encode('0000644\0'), 100);
  block.set(encoder.encode(`${size.toString(8).padStart(11, '0')}\0`), 124);
  block.set(encoder.encode(type), 156);
  block.set(encoder.encode('ustar\0'), 257);
  block.set(encoder.encode('00'), 263);
  // checksum (soma dos bytes com o campo preenchido por espaços)
  block.fill(0x20, 148, 156);
  const sum = block.reduce((acc, b) => acc + b, 0);
  block.set(encoder.encode(`${sum.toString(8).padStart(6, '0')}\0 `), 148);
  return block;
}

function pad(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(Math.ceil(data.length / 512) * 512);
  out.set(data);
  return out;
}

/** Monta um .tar (ustar) com suporte a nome longo via cabeçalho PAX. */
function makeTar(entries: Record<string, Uint8Array | string>): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const [name, content] of Object.entries(entries)) {
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    if (name.length > 100) {
      const record = ` path=${name}\n`;
      let len = record.length;
      len += String(len + String(len).length).length;
      const pax = encoder.encode(`${len}${record}`);
      parts.push(header('PaxHeader', pax.length, 'x'), pad(pax));
    }
    parts.push(header(name.slice(0, 100), data.length), pad(data));
  }
  parts.push(new Uint8Array(1024));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const tar = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    tar.set(p, offset);
    offset += p.length;
  }
  return tar;
}

const TEMPLATE_TOML = `[package]
name = "meu-modelo"
version = "0.1.0"
entrypoint = "lib.typ"

[template]
path = "template"
entrypoint = "main.typ"
thumbnail = "assets/capa.png"

[tool.outro]
thumbnail = "nao-e-esta.png"
`;

describe('Capa (thumbnail) dos modelos do Typst Universe', () => {
  it('lê o caminho da capa só da seção [template] do typst.toml', () => {
    expect(parseTemplateThumbnailPath(TEMPLATE_TOML)).toBe('assets/capa.png');
    expect(parseTemplateThumbnailPath("[template]\nthumbnail = './thumb.webp'")).toBe('thumb.webp');
    expect(parseTemplateThumbnailPath('[package]\nthumbnail = "x.png"')).toBeNull();
  });

  it('lista arquivos do .tar, inclusive com prefixo ./ e nomes longos (PAX)', () => {
    const longName = `template/${'pasta-com-nome-bem-comprido/'.repeat(4)}capa.png`;
    const files = listTarFiles(makeTar({ './typst.toml': 'x', [longName]: PNG }));
    expect([...files.keys()]).toEqual(['typst.toml', longName]);
    expect(files.get(longName)).toEqual(PNG);
  });

  it('extrai a imagem declarada no typst.toml de um .tar.gz', async () => {
    const tarGz = gzipSync(makeTar({ 'typst.toml': TEMPLATE_TOML, 'lib.typ': '', 'assets/capa.png': PNG }));
    expect(await extractTemplateThumbnail(new Uint8Array(tarGz))).toEqual({ bytes: PNG, mime: 'image/png' });
  });

  it('retorna null para pacotes sem capa ou com arquivo que não é imagem', async () => {
    const semCapa = gzipSync(makeTar({ 'typst.toml': '[package]\nname = "lib"' }));
    expect(await extractTemplateThumbnail(new Uint8Array(semCapa))).toBeNull();

    const naoImagem = gzipSync(
      makeTar({ 'typst.toml': TEMPLATE_TOML, 'assets/capa.png': '<svg onload="alert(1)"/>' }),
    );
    expect(await extractTemplateThumbnail(new Uint8Array(naoImagem))).toBeNull();
  });

  describe('cache junto do pacote', () => {
    const PACKAGE_ID = '@preview/meu-modelo:0.1.0';
    const tarGz = new Uint8Array(
      gzipSync(makeTar({ 'typst.toml': TEMPLATE_TOML, 'assets/capa.png': PNG })),
    );

    beforeEach(async () => {
      await db.universePackages.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('baixa o pacote uma vez, guarda a capa no cache e não baixa de novo', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () => new Response(tarGz as BodyInit, { status: 200 }));

      const [a, b] = await Promise.all([
        getUniversePackageThumbnail(PACKAGE_ID),
        getUniversePackageThumbnail(PACKAGE_ID),
      ]);
      expect(a).toEqual({ bytes: PNG, mime: 'image/png' });
      expect(b).toEqual(a);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const cached = await db.universePackages.get(PACKAGE_ID);
      expect(cached?.tarGzBytes).toBeDefined();
      expect(cached?.thumbnail).toEqual({ bytes: PNG, mime: 'image/png' });

      expect(await getUniversePackageThumbnail(PACKAGE_ID)).toEqual(a);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('sem conexão não guarda nada, para tentar de novo depois', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'));
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      expect(await getUniversePackageThumbnail(PACKAGE_ID)).toBeNull();
      expect(await db.universePackages.get(PACKAGE_ID)).toBeUndefined();
    });
  });
});
