// =====================================================================
// RedijaApp — Serviço Cliente do Compilador e Renderizador Typst WASM
// Conecta a UI do React ao Web Worker onde todo o processamento WASM
// (compilação e rasterização de páginas) é executado isoladamente.
// =====================================================================

import TypstCompilerWorker from './typst.worker?worker';
import { filterErrors, type FriendlyDiagnostic, type TypstDiagnostic } from './diagnostics';
import type { RequestedFontDescriptor } from './fontCatalog';

export interface PageDimension {
  pageOffset: number;
  width: number;
  height: number;
}

export interface VectorCompileOutput {
  artifact?: Uint8Array;
  pages?: PageDimension[];
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

export const WORKER_TIMEOUT_MS = 60000;

interface PendingCompileRequest {
  resolve: (res: {
    artifact?: Uint8Array;
    pages?: PageDimension[];
    diagnostics: TypstDiagnostic[];
    compileTimeMs: number;
    error?: string;
  }) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

interface PendingPagesInfoRequest {
  resolve: (res: { pages?: PageDimension[]; error?: string }) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

interface ActiveRenderSession {
  id: number;
  getCanvasForPage: (
    pageIndex: number,
    pageCount: number,
    info: PageDimension,
  ) => HTMLCanvasElement | null;
  resolve: (pages: PageDimension[]) => void;
  reject: (err: Error) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
}

let workerInstance: Worker | null = null;
let requestCounter = 0;

const pendingCompileRequests = new Map<number, PendingCompileRequest>();
const pendingPagesInfoRequests = new Map<number, PendingPagesInfoRequest>();
let activeRenderSession: ActiveRenderSession | null = null;

export function restartWorker(): void {
  if (workerInstance) {
    try {
      workerInstance.terminate();
    } catch {
      // Ignora erro ao terminar
    }
    workerInstance = null;
  }

  // Notifica e encerra todas as requisições de compilação pendentes
  pendingCompileRequests.forEach((req) => {
    if (req.timeoutId) clearTimeout(req.timeoutId);
    req.resolve({
      diagnostics: [],
      compileTimeMs: WORKER_TIMEOUT_MS,
      error: 'A compilação excedeu o tempo limite de segurança (60s) ou o compilador travou.',
    });
  });
  pendingCompileRequests.clear();

  // Encerra requisições de metadados
  pendingPagesInfoRequests.forEach((req) => {
    if (req.timeoutId) clearTimeout(req.timeoutId);
    req.resolve({
      error: 'Operação cancelada: compilador reiniciado por segurança.',
    });
  });
  pendingPagesInfoRequests.clear();

  // Encerra sessão de renderização ativa
  if (activeRenderSession) {
    if (activeRenderSession.timeoutId) clearTimeout(activeRenderSession.timeoutId);
    activeRenderSession.reject(
      new Error('Renderização cancelada: compilador reiniciado por segurança.'),
    );
    activeRenderSession = null;
  }
}

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new TypstCompilerWorker();

    workerInstance.onerror = (event: ErrorEvent) => {
      console.error('[TypstWorker Error]:', event);
      const errorMsg =
        event.message ||
        'Erro na execução do compilador Typst (verifique a conexão ou restrições de script).';

      pendingCompileRequests.forEach((req) => {
        if (req.timeoutId) clearTimeout(req.timeoutId);
        req.resolve({
          diagnostics: [],
          compileTimeMs: 0,
          error: errorMsg,
        });
      });
      pendingCompileRequests.clear();

      pendingPagesInfoRequests.forEach((req) => {
        if (req.timeoutId) clearTimeout(req.timeoutId);
        req.resolve({ error: errorMsg });
      });
      pendingPagesInfoRequests.clear();

      if (activeRenderSession) {
        if (activeRenderSession.timeoutId) clearTimeout(activeRenderSession.timeoutId);
        activeRenderSession.reject(new Error(errorMsg));
        activeRenderSession = null;
      }
    };

    workerInstance.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      // Respostas de compilação (vector ou PDF)
      if (data.type === 'compile-vector' || data.type === 'compile-pdf') {
        const pending = pendingCompileRequests.get(data.id);
        if (pending) {
          if (pending.timeoutId) clearTimeout(pending.timeoutId);
          pendingCompileRequests.delete(data.id);
          pending.resolve({
            artifact: data.artifact,
            pages: data.pages,
            diagnostics: data.diagnostics ?? [],
            compileTimeMs: data.compileTimeMs,
            error: data.error,
          });
        }
        return;
      }

      // Respostas de consulta a metadados de páginas
      if (data.type === 'get-pages-info') {
        const pending = pendingPagesInfoRequests.get(data.id);
        if (pending) {
          if (pending.timeoutId) clearTimeout(pending.timeoutId);
          pendingPagesInfoRequests.delete(data.id);
          pending.resolve({
            pages: data.pages,
            error: data.error,
          });
        }
        return;
      }

      // Streaming de página rasterizada no worker com ImageBitmap
      if (data.type === 'page-rendered') {
        const { id, pageIndex, totalPages, info, imageBitmap, widthPx, heightPx } = data;

        // Se a solicitação pertence à sessão ativa mais recente
        if (activeRenderSession && activeRenderSession.id === id) {
          try {
            const canvas = activeRenderSession.getCanvasForPage(pageIndex, totalPages, info);
            if (canvas) {
              if (canvas.width !== widthPx) canvas.width = widthPx;
              if (canvas.height !== heightPx) canvas.height = heightPx;

              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(imageBitmap, 0, 0);
              }
            }
          } finally {
            imageBitmap.close();
          }
        } else {
          // Descarta imagens de requisições obsoletas para liberar VRAM imediatamente
          imageBitmap.close();
        }
        return;
      }

      // Conclusão da renderização de todas as páginas
      if (data.type === 'render-pages-done') {
        const { id, pagesInfo, error } = data;
        if (activeRenderSession && activeRenderSession.id === id) {
          const current = activeRenderSession;
          if (current.timeoutId) clearTimeout(current.timeoutId);
          activeRenderSession = null;
          if (error) {
            current.reject(new Error(error));
          } else {
            current.resolve(pagesInfo);
          }
        }
      }
    };
  }
  return workerInstance;
}

/**
 * Compila os arquivos `.typ` para o formato intermediário vetorial (`vector`)
 * inteiramente no Web Worker, já incluindo os metadados das páginas se compilado com sucesso.
 */
export async function compileToVector(
  files: Record<string, string>,
  binaryFiles?: Record<string, Uint8Array>,
  requestedFont?: RequestedFontDescriptor,
  packageArchives?: Record<string, Uint8Array>,
): Promise<VectorCompileOutput> {
  const worker = getWorker();
  const id = ++requestCounter;

  const raw = await new Promise<{
    artifact?: Uint8Array;
    pages?: PageDimension[];
    diagnostics: TypstDiagnostic[];
    compileTimeMs: number;
    error?: string;
  }>((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn(`[TypstClient] Compilação do vetor excedeu ${WORKER_TIMEOUT_MS}ms. Reiniciando worker...`);
      restartWorker();
    }, WORKER_TIMEOUT_MS);

    pendingCompileRequests.set(id, { resolve, timeoutId });
    worker.postMessage({ id, type: 'compile-vector', files, binaryFiles, requestedFont, packageArchives });
  });

  return {
    artifact: raw.artifact,
    pages: raw.pages,
    diagnostics: filterErrors(raw.diagnostics),
    compileTimeMs: raw.compileTimeMs,
    error: raw.error,
  };
}

/**
 * Compila os arquivos `.typ` diretamente para bytes `%PDF-` no Web Worker.
 */
export async function compileToPdf(
  files: Record<string, string>,
  binaryFiles?: Record<string, Uint8Array>,
  requestedFont?: RequestedFontDescriptor,
  packageArchives?: Record<string, Uint8Array>,
): Promise<PdfCompileOutput> {
  const worker = getWorker();
  const id = ++requestCounter;

  const raw = await new Promise<{
    artifact?: Uint8Array;
    diagnostics: TypstDiagnostic[];
    compileTimeMs: number;
    error?: string;
  }>((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn(`[TypstClient] Compilação PDF excedeu ${WORKER_TIMEOUT_MS}ms. Reiniciando worker...`);
      restartWorker();
    }, WORKER_TIMEOUT_MS);

    pendingCompileRequests.set(id, { resolve, timeoutId });
    worker.postMessage({ id, type: 'compile-pdf', files, binaryFiles, requestedFont, packageArchives });
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
 * (um por página). Toda a rasterização e geração gráfica é executada no Web Worker
 * via OffscreenCanvas, transferindo ImageBitmaps para a thread principal sem
 * travar o loop de renderização do React.
 */
export async function renderVectorToCanvases(
  artifact: Uint8Array,
  getCanvasForPage: (
    pageIndex: number,
    pageCount: number,
    info: PageDimension,
  ) => HTMLCanvasElement | null,
  pixelPerPt = 2.5,
  backgroundColor = '#ffffff',
): Promise<PageDimension[]> {
  const worker = getWorker();
  const id = ++requestCounter;

  // Se havia outra sessão em andamento, cancela e substitui
  if (activeRenderSession) {
    if (activeRenderSession.timeoutId) clearTimeout(activeRenderSession.timeoutId);
    activeRenderSession = null;
  }

  return new Promise<PageDimension[]>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.warn(`[TypstClient] Renderização de páginas excedeu ${WORKER_TIMEOUT_MS}ms. Reiniciando worker...`);
      restartWorker();
    }, WORKER_TIMEOUT_MS);

    activeRenderSession = {
      id,
      getCanvasForPage,
      resolve,
      reject,
      timeoutId,
    };

    worker.postMessage({
      id,
      type: 'render-pages',
      artifact,
      pixelPerPt,
      backgroundColor,
    });
  });
}

/**
 * Obtém os metadados de paginação de um artefato vetorial a partir do Web Worker.
 */
export async function getVectorPagesInfo(artifact: Uint8Array): Promise<PageDimension[]> {
  const worker = getWorker();
  const id = ++requestCounter;

  const raw = await new Promise<{ pages?: PageDimension[]; error?: string }>((resolve) => {
    const timeoutId = setTimeout(() => {
      console.warn(`[TypstClient] Obtenção de páginas excedeu ${WORKER_TIMEOUT_MS}ms. Reiniciando worker...`);
      restartWorker();
    }, WORKER_TIMEOUT_MS);

    pendingPagesInfoRequests.set(id, { resolve, timeoutId });
    worker.postMessage({ id, type: 'get-pages-info', artifact });
  });

  if (raw.error) {
    throw new Error(raw.error);
  }

  return raw.pages ?? [];
}
