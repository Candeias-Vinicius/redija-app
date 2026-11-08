/// <reference lib="webworker" />
// =====================================================================
// RedijaApp — Web Worker do Compilador e Renderizador Typst WASM
// Executa tanto a compilação quanto a renderização vetorial fora da
// thread principal para garantir digitação e UI sempre a 60 fps.
// =====================================================================

import {
  createTypstCompiler,
  CompileFormatEnum,
  type TypstCompiler,
} from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';
import {
  createTypstRenderer,
  type TypstRenderer,
  type RenderSession,
} from '@myriaddreamin/typst.ts/dist/esm/renderer.mjs';
import { loadFonts } from '@myriaddreamin/typst.ts/dist/esm/options.init.mjs';
import compilerWasmUrl from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import rendererWasmUrl from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
import type { TypstDiagnostic } from './diagnostics';

export interface PageDimension {
  pageOffset: number;
  width: number;
  height: number;
}

export interface WorkerCompileRequest {
  id: number;
  type: 'compile-vector' | 'compile-pdf';
  files: Record<string, string>;
  binaryFiles?: Record<string, Uint8Array>;
}

export interface WorkerRenderPagesRequest {
  id: number;
  type: 'render-pages';
  artifact: Uint8Array;
  pixelPerPt?: number;
  backgroundColor?: string;
}

export interface WorkerGetPagesInfoRequest {
  id: number;
  type: 'get-pages-info';
  artifact: Uint8Array;
}

export type WorkerRequest =
  | WorkerCompileRequest
  | WorkerRenderPagesRequest
  | WorkerGetPagesInfoRequest;

export interface WorkerCompileResponse {
  id: number;
  type: 'compile-vector' | 'compile-pdf';
  artifact?: Uint8Array;
  pages?: PageDimension[];
  diagnostics: TypstDiagnostic[];
  compileTimeMs: number;
  error?: string;
}

export interface WorkerPageRenderedMessage {
  id: number;
  type: 'page-rendered';
  pageIndex: number;
  totalPages: number;
  info: PageDimension;
  imageBitmap: ImageBitmap;
  widthPx: number;
  heightPx: number;
}

export interface WorkerRenderPagesDoneMessage {
  id: number;
  type: 'render-pages-done';
  pagesInfo: PageDimension[];
  error?: string;
}

export interface WorkerGetPagesInfoResponse {
  id: number;
  type: 'get-pages-info';
  pages?: PageDimension[];
  error?: string;
}

const FONT_FILES = [
  'fonts/Tinos-Regular.ttf',
  'fonts/Tinos-Bold.ttf',
  'fonts/Tinos-Italic.ttf',
  'fonts/Tinos-BoldItalic.ttf',
  'fonts/Arimo-Regular.ttf',
  'fonts/Arimo-Italic.ttf',
];

let compilerPromise: Promise<TypstCompiler> | null = null;
let rendererPromise: Promise<TypstRenderer> | null = null;
let latestRenderRequestId = 0;

function resolveFontUrls(): string[] {
  const origin = self.location?.origin || '';
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base === './' || base === '.' ? '/' : base.endsWith('/') ? base : `${base}/`;
  const basePath = cleanBase.startsWith('/') ? cleanBase : `/${cleanBase}`;
  const root = origin ? `${origin}${basePath}` : basePath;
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  return FONT_FILES.map((file) => `${normalizedRoot}${file.replace(/^\/+/, '')}`);
}

async function getCompiler(): Promise<TypstCompiler> {
  if (!compilerPromise) {
    compilerPromise = (async () => {
      try {
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
      } catch (err) {
        compilerPromise = null;
        throw err;
      }
    })();
  }
  return compilerPromise;
}

async function getRenderer(): Promise<TypstRenderer> {
  if (!rendererPromise) {
    rendererPromise = (async () => {
      try {
        const instance = createTypstRenderer();
        await instance.init({
          getModule: () => rendererWasmUrl,
        });
        return instance;
      } catch (err) {
        rendererPromise = null;
        throw err;
      }
    })();
  }
  return rendererPromise;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const data = event.data;
  const start = performance.now();

  if (data.type === 'compile-vector' || data.type === 'compile-pdf') {
    const { id, type, files, binaryFiles } = data;
    try {
      const compiler = await getCompiler();
      compiler.resetShadow();

      for (const [name, content] of Object.entries(files)) {
        const virtualPath = name.startsWith('/') ? name : `/${name}`;
        compiler.addSource(virtualPath, content);
      }

      if (binaryFiles) {
        for (const [path, bytes] of Object.entries(binaryFiles)) {
          const virtualPath = path.startsWith('/') ? path : `/${path}`;
          compiler.mapShadow(virtualPath, bytes);
        }
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

      let pages: PageDimension[] | undefined = undefined;

      // Se for compilação vetorial com sucesso, já extrai os metadados de página no próprio worker
      if (type === 'compile-vector' && artifact) {
        try {
          const renderer = await getRenderer();
          pages = await renderer.runWithSession(
            {
              format: 'vector',
              artifactContent: artifact,
            },
            async (session: RenderSession) => session.retrievePagesInfo(),
          );
        } catch (pageErr) {
          console.warn('Erro ao obter metadados de páginas no compilador:', pageErr);
        }
      }

      const response: WorkerCompileResponse = {
        id,
        type,
        artifact,
        pages,
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
    return;
  }

  if (data.type === 'get-pages-info') {
    const { id, artifact } = data;
    try {
      const renderer = await getRenderer();
      const pages = await renderer.runWithSession(
        {
          format: 'vector',
          artifactContent: artifact,
        },
        async (session: RenderSession) => session.retrievePagesInfo(),
      );
      const res: WorkerGetPagesInfoResponse = { id, type: 'get-pages-info', pages };
      self.postMessage(res);
    } catch (err) {
      const res: WorkerGetPagesInfoResponse = {
        id,
        type: 'get-pages-info',
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(res);
    }
    return;
  }

  if (data.type === 'render-pages') {
    const { id, artifact, pixelPerPt = 2.5, backgroundColor = '#ffffff' } = data;
    latestRenderRequestId = id;

    try {
      const renderer = await getRenderer();
      await renderer.runWithSession(
        {
          format: 'vector',
          artifactContent: artifact,
        },
        async (session: RenderSession) => {
          const pagesInfo = session.retrievePagesInfo();

          for (let i = 0; i < pagesInfo.length; i++) {
            // Se uma solicitação de renderização mais recente chegou, interrompe o trabalho obsoleto
            if (latestRenderRequestId > id) {
              return;
            }

            const info = pagesInfo[i];
            const widthPx = Math.ceil(info.width * pixelPerPt);
            const heightPx = Math.ceil(info.height * pixelPerPt);

            if (typeof OffscreenCanvas !== 'undefined') {
              const offscreen = new OffscreenCanvas(widthPx, heightPx);
              const ctx = offscreen.getContext('2d');
              if (ctx) {
                await renderer.renderCanvas({
                  renderSession: session,
                  canvas: ctx as unknown as CanvasRenderingContext2D,
                  pageOffset: info.pageOffset,
                  pixelPerPt,
                  backgroundColor,
                  dataSelection: {
                    body: true,
                  },
                });

                if (latestRenderRequestId > id) {
                  return;
                }

                const imageBitmap = offscreen.transferToImageBitmap();
                const msg: WorkerPageRenderedMessage = {
                  id,
                  type: 'page-rendered',
                  pageIndex: i,
                  totalPages: pagesInfo.length,
                  info,
                  imageBitmap,
                  widthPx,
                  heightPx,
                };
                self.postMessage(msg, [imageBitmap]);
              }
            }
          }

          if (latestRenderRequestId === id) {
            const doneMsg: WorkerRenderPagesDoneMessage = {
              id,
              type: 'render-pages-done',
              pagesInfo,
            };
            self.postMessage(doneMsg);
          }
        },
      );
    } catch (err) {
      if (latestRenderRequestId === id) {
        const doneMsg: WorkerRenderPagesDoneMessage = {
          id,
          type: 'render-pages-done',
          pagesInfo: [],
          error: err instanceof Error ? err.message : String(err),
        };
        self.postMessage(doneMsg);
      }
    }
  }
};
