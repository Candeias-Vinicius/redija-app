import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/core/storage/db';
import {
  buildVirtualUniversePackageFiles,
  parsePackageId,
  POPULAR_UNIVERSE_TEMPLATES,
  resolveProjectUniverseAssets,
  resolveUniversePackage,
} from '../universeResolver';

describe('Typst Universe Resolver & Virtual Packages', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    await db.universePackages.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('normaliza identificadores com e sem namespace/versão e usa charged-ieee:0.1.4 como padrão conhecido', () => {
    expect(parsePackageId('@preview/charged-ieee:0.1.4')).toEqual({
      namespace: 'preview',
      name: 'charged-ieee',
      version: '0.1.4',
      fullId: '@preview/charged-ieee:0.1.4',
    });
    expect(parsePackageId('modern-sbc:0.1.0')).toEqual({
      namespace: 'preview',
      name: 'modern-sbc',
      version: '0.1.0',
      fullId: '@preview/modern-sbc:0.1.0',
    });
    expect(parsePackageId('charged-ieee').fullId).toBe('@preview/charged-ieee:0.1.4');
    expect(POPULAR_UNIVERSE_TEMPLATES[0].id).toBe('@preview/charged-ieee:0.1.4');
  });

  it('gera pacote virtual completo com typst.toml e suporte offline a autores dicionário e touying', () => {
    const sbcFiles = buildVirtualUniversePackageFiles(
      { namespace: 'preview', name: 'modern-sbc', version: '0.1.0' },
      'sbc-article',
    );
    expect(sbcFiles['typst.toml']).toContain('name = "modern-sbc"');
    expect(sbcFiles['typst.toml']).toContain('entrypoint = "lib.typ"');
    expect(sbcFiles['lib.typ']).toContain('#let sbc-article(');
    expect(sbcFiles['lib.typ']).toContain('type(a) == dictionary');

    const touyingFiles = buildVirtualUniversePackageFiles(
      { namespace: 'preview', name: 'touying', version: '0.5.3' },
      'simple-theme',
    );
    expect(touyingFiles['typst.toml']).toContain('name = "touying"');
    expect(touyingFiles['themes/simple.typ']).toContain('#let simple-theme(');
    expect(touyingFiles['themes.typ']).toContain('#import "themes/simple.typ" as simple');
    expect(touyingFiles['lib.typ']).toContain('#import "themes.typ"');
  });

  it('baixa tarball gzip real, armazena tarGzBytes no IndexedDB e reutiliza do cache nas chamadas seguintes', async () => {
    const fakeGz = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0x01, 0x02, 0x03, 0x04]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => fakeGz.buffer.slice(0),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const first = await resolveUniversePackage('@preview/charged-ieee:0.1.4');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.tarGzBytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(first.tarGzBytes!.slice(0, 3))).toEqual([0x1f, 0x8b, 0x08]);

    // Segunda chamada deve vir do IndexedDB sem acionar rede
    const second = await resolveUniversePackage('@preview/charged-ieee:0.1.4');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.tarGzBytes).toBeInstanceOf(Uint8Array);

    const assets = await resolveProjectUniverseAssets('@preview/charged-ieee:0.1.4');
    expect(assets.packageArchives?.['@preview/charged-ieee:0.1.4']).toBeInstanceOf(Uint8Array);
  });

  it('ignora cache legado sem typst.toml nem tarGzBytes e atualiza para o tarball real', async () => {
    await db.universePackages.put({
      id: '@preview/charged-ieee:0.1.4',
      name: 'charged-ieee',
      version: '0.1.4',
      entrypoint: 'ieee',
      files: { '/@preview/charged-ieee:0.1.4/lib.typ': '// legado sem manifest' },
      downloadedAt: new Date().toISOString(),
    });

    const fakeGz = new Uint8Array([0x1f, 0x8b, 0x08, 0x00, 0xaa, 0xbb]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => fakeGz.buffer.slice(0),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const resolved = await resolveUniversePackage('@preview/charged-ieee:0.1.4');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resolved.tarGzBytes).toBeInstanceOf(Uint8Array);
  });

  it('fornece fallback virtual offline sem envenenar cache quando rede falha, e faz cache quando retorna 404', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network offline')) as unknown as typeof fetch;

    const offlineRes = await resolveUniversePackage('@preview/charged-ieee:0.1.4');
    expect(offlineRes.tarGzBytes).toBeUndefined();
    expect(offlineRes.files['/@preview/charged-ieee:0.1.4/typst.toml']).toContain(
      'name = "charged-ieee"',
    );
    expect(offlineRes.files['/@preview/charged-ieee:0.1.4/lib.typ']).toContain('#let ieee(');
    // Não persiste falha transitória offline para permitir download futuro ao reconectar
    expect(await db.universePackages.get('@preview/charged-ieee:0.1.4')).toBeUndefined();

    // 404 definitivo de template curado virtual deve salvar pacote virtual com manifest no IndexedDB
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const virtualRes = await resolveUniversePackage('@preview/modern-sbc:0.1.0');
    expect(virtualRes.files['/@preview/modern-sbc:0.1.0/typst.toml']).toContain(
      'name = "modern-sbc"',
    );
    expect(await db.universePackages.get('@preview/modern-sbc:0.1.0')).toBeDefined();
  });
});
