/// <reference lib="webworker" />
// =====================================================================
// RedijaApp — Web Worker do Compilador Typst WASM
// Executa a compilação de `main.typ` + `abnt.typ` fora da thread principal
// para manter a digitação sempre fluida a 60 fps.
// =====================================================================

import {
  createTypstCompiler,
  CompileFormatEnum,
  type TypstCompiler,
} from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';
import { loadFonts } from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import type { TypstDiagnostic } from './diagnostics';

export interface WorkerCompileRequest {
  id: number;
  type: 'compile-vector' | 'compile-pdf';
  files: Record<string, string>;
}

export interface WorkerCompileResponse {
  id: number;
  type: 'compile-vector' | 'compile-pdf';
  artifact?: Uint8Array;
  diagnostics: TypstDiagnostic[];
  compileTimeMs: number;
  error?: string;
}

const FONT_FILES = [
  'fonts/Tinos-Regular.ttf',
  'fonts/Tinos-Bold.ttf',
  'fonts/Tinos-Italic.ttf',
  'fonts/Tinos-BoldItalic.ttf',
];

let compilerPromise: Promise<TypstCompiler> | null = null;

function resolveFontUrls(): string[] {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const origin = self.location?.origin || '';
  return FONT_FILES.map((file) => `${origin}${normalizedBase}${file}`);
}

async function getCompiler(): Promise<TypstCompiler> {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      const instance = createTypstCompiler();
      await instance.init({
        getModule: () => compilerWasmUrl,
        beforeBuild: [
          loadFonts(resolveFontUrls(), {
            assets: false,
          }),
        ],
      });
      return instance;
    })();
  }
  return compilerPromise;
}

self.onmessage = async (event: MessageEvent<WorkerCompileRequest>) => {
  const { id, type, files } = event.data;
  const start = performance.now();

  try {
    const compiler = await getCompiler();

    for (const [name, content] of Object.entries(files)) {
      const virtualPath = name.startsWith('/') ? name : `/${name}`;
      compiler.addSource(virtualPath, content);
    }

    const format =
      type === 'compile-pdf' ? CompileFormatEnum.pdf : CompileFormatEnum.vector;

    const compileResult = await compiler.compile({
      mainFilePath: '/main.typ',
      format,
      diagnostics: 'full',
    });

    const compileTimeMs = Math.round(performance.now() - start);
    const artifact = compileResult.result;
    const diagnostics = (compileResult.diagnostics ?? []) as TypstDiagnostic[];

    const response: WorkerCompileResponse = {
      id,
      type,
      artifact,
      diagnostics,
      compileTimeMs,
    };

    if (artifact) {
      self.postMessage(response, [artifact.buffer]);
    } else {
      self.postMessage(response);
    }
  } catch (err) {
    const compileTimeMs = Math.round(performance.now() - start);
    const response: WorkerCompileResponse = {
      id,
      type,
      diagnostics: [],
      compileTimeMs,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};
