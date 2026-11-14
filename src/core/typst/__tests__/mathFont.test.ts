import fs from 'node:fs';
import path from 'node:path';
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
import { BUNDLED_FONT_FILES } from '../fontCatalog';
import {
  createTypstMemoryAccessModel,
  splitCompileFiles,
  WorkerPackageRegistry,
} from '../packageRegistry';
import { generateTypstFiles } from '@/core/transpiler/typstGenerator';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import type { FontFamilyId } from '@/types/document';

/**
 * Regressão: qualquer matemática (bloco `equation` ou `<span data-inline-math>`)
 * falhava com "no font could be found" porque nenhuma fonte OpenType com tabela
 * MATH era embutida. Usa exatamente a lista de fontes que o Web Worker carrega.
 */
describe('Compilação de equações com as fontes embutidas do worker', () => {
  let compiler: TypstCompiler;
  let registry: WorkerPackageRegistry;

  beforeAll(async () => {
    const repoRoot = path.resolve(import.meta.dirname, '../../../../');
    const wasmPath = path.join(
      repoRoot,
      'node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm',
    );
    const baseFonts = BUNDLED_FONT_FILES.map(
      (f) => new Uint8Array(fs.readFileSync(path.join(repoRoot, 'public', f))),
    );

    const accessModel = createTypstMemoryAccessModel();
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

  it.each<FontFamilyId>(['serif', 'sans'])(
    'compila bloco equation e matemática inline sem diagnósticos (fonte %s)',
    async (fontFamily) => {
      const project = createProjectFromTemplate('artigo', 'Teste Matemática');
      project.templateConfig = { ...project.templateConfig!, fontFamily };
      project.blocks = [
        { id: 'h', type: 'h1', content: 'Introdução' },
        {
          id: 'p',
          type: 'paragraph',
          content:
            '<p>Seja <span data-inline-math="true" data-math="a^2 + b^2 = c^2">a^2 + b^2 = c^2</span> a relação.</p>',
        },
        { id: 'eq', type: 'equation', content: 'x^2 + 1' },
      ];

      const files = generateTypstFiles(project);
      expect(files['main.typ']).toContain('$ x^2 + 1 $');
      expect(files['main.typ']).toContain('$a^2 + b^2 = c^2$');

      const { sourceFiles, packageFiles } = splitCompileFiles(files);
      registry.setRequestPackages(undefined, packageFiles);
      compiler.resetShadow();
      for (const [name, content] of Object.entries(sourceFiles)) {
        compiler.addSource(name.startsWith('/') ? name : `/${name}`, content);
      }

      const res = await compiler.compile({
        mainFilePath: '/main.typ',
        format: CompileFormatEnum.pdf,
        diagnostics: 'full',
      });

      // Avisos "unknown font family" vêm das pilhas de fallback (Times New Roman etc.)
      // e não têm relação com matemática; qualquer outro diagnóstico é falha.
      const relevant = (res.diagnostics ?? []).filter(
        (d) => !/^unknown font family/.test(d.message),
      );
      expect(relevant).toEqual([]);
      expect(res.result).toBeInstanceOf(Uint8Array);
      expect(res.result!.byteLength).toBeGreaterThan(1000);
    },
  );
});
