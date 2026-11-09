import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, it, expect, beforeAll } from 'vitest';
import {
  CompileFormatEnum,
  createTypstCompiler,
  type TypstCompiler,
} from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';
import {
  loadFonts,
  withAccessModel,
  withPackageRegistry,
} from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';
import abntTemplate from '@/core/templates/abnt.typ?raw';
import {
  createTypstMemoryAccessModel,
  splitCompileFiles,
  WorkerPackageRegistry,
} from '../packageRegistry';
import { generateTypstFiles } from '@/core/transpiler/typstGenerator';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';

/**
 * Cria um arquivo `.tar.gz` POSIX mínimo em memória para validar `context.untar` real no WASM.
 */
function buildMockTarGz(files: Record<string, string>): Uint8Array {
  const blocks: Uint8Array[] = [];
  const encoder = new TextEncoder();

  for (const [name, content] of Object.entries(files)) {
    const contentBytes = encoder.encode(content);
    const header = new Uint8Array(512);
    header.set(encoder.encode(name).slice(0, 100), 0);
    header.set(encoder.encode('0000644\0'), 100);
    header.set(encoder.encode('0000000\0'), 108);
    header.set(encoder.encode('0000000\0'), 116);
    const sizeOctal = contentBytes.byteLength.toString(8).padStart(11, '0') + '\0';
    header.set(encoder.encode(sizeOctal), 124);
    header.set(encoder.encode('00000000000\0'), 136);
    // Checksum field inicializado com espaços
    header.fill(0x20, 148, 156);
    header[156] = 0x30; // '0' regular file
    header.set(encoder.encode('ustar\0'), 257);
    header.set(encoder.encode('00'), 263);

    let sum = 0;
    for (let i = 0; i < 512; i++) {
      sum += header[i];
    }
    const chksumStr = sum.toString(8).padStart(6, '0') + '\0 ';
    header.set(encoder.encode(chksumStr), 148);

    blocks.push(header);
    const paddedLen = Math.ceil(contentBytes.byteLength / 512) * 512;
    const dataBlock = new Uint8Array(paddedLen);
    dataBlock.set(contentBytes, 0);
    if (paddedLen > 0) {
      blocks.push(dataBlock);
    }
  }

  // Dois blocos de zeros encerrando o arquivo tar
  blocks.push(new Uint8Array(1024));

  const totalLen = blocks.reduce((acc, b) => acc + b.byteLength, 0);
  const tar = new Uint8Array(totalLen);
  let offset = 0;
  for (const b of blocks) {
    tar.set(b, offset);
    offset += b.byteLength;
  }

  return new Uint8Array(zlib.gzipSync(tar));
}

describe('Typst WASM WorkerPackageRegistry & AccessModel', () => {
  let compiler: TypstCompiler;
  let accessModel: ReturnType<typeof createTypstMemoryAccessModel>;
  let registry: WorkerPackageRegistry;

  beforeAll(async () => {
    const repoRoot = path.resolve(import.meta.dirname, '../../../../');
    const wasmPath = path.join(
      repoRoot,
      'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
    );
    const fontDir = path.join(repoRoot, 'public/fonts');
    const baseFonts = fs
      .readdirSync(fontDir)
      .filter((f) => f.endsWith('.ttf') || f.endsWith('.otf'))
      .map((f) => new Uint8Array(fs.readFileSync(path.join(fontDir, f))));

    accessModel = createTypstMemoryAccessModel();
    registry = new WorkerPackageRegistry(accessModel);
    compiler = createTypstCompiler();

    await compiler.init({
      getModule: () => new Uint8Array(fs.readFileSync(wasmPath)),
      beforeBuild: [
        loadFonts(baseFonts, { assets: false }),
        withAccessModel(accessModel),
        withPackageRegistry(registry),
      ],
    });
  });

  it('separa arquivos regulares de arquivos de pacotes virtuais @preview', () => {
    const { sourceFiles, packageFiles } = splitCompileFiles({
      'main.typ': '#import "@preview/modern-sbc:0.1.0": *',
      'abnt.typ': abntTemplate,
      '/@preview/modern-sbc:0.1.0/typst.toml': '[package]\nname="modern-sbc"',
      '/@preview/modern-sbc:0.1.0/lib.typ': '#let sbc-article(body) = body',
    });

    expect(Object.keys(sourceFiles)).toEqual(['main.typ', 'abnt.typ']);
    expect(packageFiles['@preview/modern-sbc:0.1.0']).toBeDefined();
    expect(packageFiles['@preview/modern-sbc:0.1.0']['typst.toml']).toContain('modern-sbc');
    expect(accessModel.isFile('/abnt.typ')).toBe(false);
    expect(accessModel.isFile('/@memory/inexistente.typ')).toBe(false);
  });

  it('compila projetos Universe com tar.gz via context.untar no compilador WASM sem erro Dummy Registry', async () => {
    const tarGz = buildMockTarGz({
      'typst.toml': '[package]\nname = "charged-ieee"\nversion = "0.1.4"\nentrypoint = "lib.typ"\n',
      'lib.typ': `
#let ieee(title: "", authors: (), abstract: none, index-terms: (), paper-size: "a4", body) = {
  set page(paper: paper-size, margin: 2cm, columns: 2)
  set document(title: title, author: authors.map(a => a.name))
  align(center)[#strong[#title]]
  if abstract != none [Abstract: #abstract]
  body
}
`,
    });

    const project = createProjectFromTemplate('universe_custom', 'Teste IEEE Tarball');
    project.templateConfig = {
      ...project.templateConfig!,
      preset: 'universe_custom',
      universePackage: '@preview/charged-ieee:0.1.4',
      universeEntrypoint: 'ieee',
    };
    const files = generateTypstFiles(project);
    const { sourceFiles, packageFiles } = splitCompileFiles(files);

    registry.setRequestPackages(
      { '@preview/charged-ieee:0.1.4': tarGz },
      packageFiles,
    );
    compiler.resetShadow();
    for (const [name, content] of Object.entries(sourceFiles)) {
      compiler.addSource(name.startsWith('/') ? name : `/${name}`, content);
    }

    const res = await compiler.compile({
      mainFilePath: '/main.typ',
      format: CompileFormatEnum.vector,
      diagnostics: 'full',
    });

    const errors = (res.diagnostics ?? []).filter((d) => d.severity === 'error');
    expect(errors).toEqual([]);
    expect(res.result).toBeInstanceOf(Uint8Array);
    expect(res.result!.byteLength).toBeGreaterThan(100);
  });

  it('sintetiza e compila pacotes virtuais @preview/modern-sbc e @preview/touying no WASM offline', async () => {
    for (const [pkgId, entry] of [
      ['@preview/modern-sbc:0.1.0', 'sbc-article'],
      ['@preview/touying:0.5.3', 'simple-theme'],
    ] as const) {
      const project = createProjectFromTemplate('universe_custom', `Teste Offline ${pkgId}`);
      project.templateConfig = {
        ...project.templateConfig!,
        preset: 'universe_custom',
        universePackage: pkgId,
        universeEntrypoint: entry,
      };
      const files = generateTypstFiles(project);
      const { sourceFiles, packageFiles } = splitCompileFiles(files);

      registry.setRequestPackages(undefined, packageFiles);
      compiler.resetShadow();
      for (const [name, content] of Object.entries(sourceFiles)) {
        compiler.addSource(name.startsWith('/') ? name : `/${name}`, content);
      }

      const res = await compiler.compile({
        mainFilePath: '/main.typ',
        format: CompileFormatEnum.vector,
        diagnostics: 'full',
      });

      const errors = (res.diagnostics ?? []).filter((d) => d.severity === 'error');
      expect(errors).toEqual([]);
      expect(res.result).toBeInstanceOf(Uint8Array);
      expect(res.result!.byteLength).toBeGreaterThan(100);
    }
  });
});
