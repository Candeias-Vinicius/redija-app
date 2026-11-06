// =====================================================================
// RedijaApp — Serviço Cliente do Compilador e Renderizador Typst WASM
// =====================================================================

import {
  createTypstRenderer,
  type TypstRenderer,
  type RenderSession,
} from '@myriaddreamin/typst.ts/dist/esm/renderer.mjs';
import rendererWasmUrl from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
import TypstCompilerWorker from './typst.worker?worker';
import { filterErrors, type FriendlyDiagnostic, type TypstDiagnostic } from './diagnostics';

export interface PageDimension {
  pageOffset: number;
  width: number;
  height: number;
}

export interface VectorCompileOutput {
  artifact?: Uint8Array;
  diagnostics: FriendlyDiagnostic[];
  compileTimeMs: number;
  error?: string;
}

export interface PdfCompileOutput {
  pdf?: Uint8Array;
  diagnostics: FriendlyDiagnostic[];
  compileTimeMs: number;
  error?: string;
}

interface PendingRequest {
  resolve: (res: {
    artifact?: Uint8Array;
    diagnostics: TypstDiagnostic[];
    compileTimeMs: number;
    error?: string;
  }) => void;
}

let workerInstance: Worker | null = null;
let requestCounter = 0;
const pendingRequests = new Map<number, PendingRequest>();

let rendererPromise: Promise<TypstRenderer> | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new TypstCompilerWorker();
    workerInstance.onmessage = (event) => {
      const { id, artifact, diagnostics, compileTimeMs, error } = event.data;
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        pending.resolve({ artifact, diagnostics: diagnostics ?? [], compileTimeMs, error });
      }
    };
  }
  return workerInstance;
}

export async function getTypstRenderer(): Promise<TypstRenderer> {
  if (!rendererPromise) {
    rendererPromise = (async () => {
      const instance = createTypstRenderer();
      await instance.init({
        getModule: () => rendererWasmUrl,
      });
      return instance;
    })();
  }
  return rendererPromise;
}

/**
 * Compila os arquivos `.typ` para o formato intermediário vetorial (`vector`)
 * no Web Worker.
 */
export async function compileToVector(files: Record<string, string>): Promise<VectorCompileOutput> {
  const worker = getWorker();
  const id = ++requestCounter;

  const raw = await new Promise<{
    artifact?: Uint8Array;
    diagnostics: TypstDiagnostic[];
    compileTimeMs: number;
    error?: string;
  }>((resolve) => {
    pendingRequests.set(id, { resolve });
    worker.postMessage({ id, type: 'compile-vector', files });
  });

  return {
    artifact: raw.artifact,
    diagnostics: filterErrors(raw.diagnostics),
    compileTimeMs: raw.compileTimeMs,
    error: raw.error,
  };
}

/**
 * Compila os arquivos `.typ` diretamente para bytes `%PDF-` no Web Worker.
 */
export async function compileToPdf(files: Record<string, string>): Promise<PdfCompileOutput> {
  const worker = getWorker();
  const id = ++requestCounter;

  const raw = await new Promise<{
    artifact?: Uint8Array;
    diagnostics: TypstDiagnostic[];
    compileTimeMs: number;
    error?: string;
  }>((resolve) => {
    pendingRequests.set(id, { resolve });
    worker.postMessage({ id, type: 'compile-pdf', files });
  });

  return {
    pdf: raw.artifact,
    diagnostics: filterErrors(raw.diagnostics),
    compileTimeMs: raw.compileTimeMs,
    error: raw.error,
  };
}

/**
 * Renderiza o artefato vetorial do Typst em uma lista de elementos `<canvas>`
 * (um por página), retornando as dimensões reais das páginas em pontos (`pt`).
 */
export async function renderVectorToCanvases(
  artifact: Uint8Array,
  getCanvasForPage: (pageIndex: number, pageCount: number, info: PageDimension) => HTMLCanvasElement | null,
  pixelPerPt = 2.5,
): Promise<PageDimension[]> {
  const renderer = await getTypstRenderer();

  return renderer.runWithSession(
    {
      format: 'vector',
      artifactContent: artifact,
    },
    async (session: RenderSession) => {
      const pagesInfo = session.retrievePagesInfo();

      for (let i = 0; i < pagesInfo.length; i++) {
        const info = pagesInfo[i];
        const canvas = getCanvasForPage(i, pagesInfo.length, info);
        if (!canvas) continue;

        const widthPx = Math.ceil(info.width * pixelPerPt);
        const heightPx = Math.ceil(info.height * pixelPerPt);

        if (canvas.width !== widthPx) canvas.width = widthPx;
        if (canvas.height !== heightPx) canvas.height = heightPx;

        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        await renderer.renderCanvas({
          renderSession: session,
          canvas: ctx,
          pageOffset: info.pageOffset,
          pixelPerPt,
          backgroundColor: '#ffffff',
          dataSelection: {
            body: true,
          },
        });
      }

      return pagesInfo;
    },
  );
}

/**
 * Obtém apenas os metadados de paginação de um artefato vetorial.
 */
export async function getVectorPagesInfo(artifact: Uint8Array): Promise<PageDimension[]> {
  const renderer = await getTypstRenderer();
  return renderer.runWithSession(
    {
      format: 'vector',
      artifactContent: artifact,
    },
    async (session: RenderSession) => session.retrievePagesInfo(),
  );
}
