import { vi } from 'vitest';

interface ProgressEventLike {
  loaded: number;
  total: number;
  lengthComputable: boolean;
}

type ProgressHandler = ((event: ProgressEventLike) => void) | null;

/**
 * XMLHttpRequest controlado pelo teste: o transporte do importador (pandoc/client.ts) usa XHR para
 * ter progresso de envio, e no Node não existe XHR.
 */
export class FakeXhr {
  static onSend: ((xhr: FakeXhr) => void) | null = null;

  method = '';
  url = '';
  responseType = '';
  status = 0;
  response: unknown = null;
  body: FormData | null = null;
  aborted = false;
  upload: { onprogress: ProgressHandler; onload: (() => void) | null } = {
    onprogress: null,
    onload: null,
  };
  onprogress: ProgressHandler = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  send(body: FormData) {
    this.body = body;
    FakeXhr.onSend?.(this);
  }

  abort() {
    this.aborted = true;
  }

  progressUpload(loaded: number, total: number) {
    this.upload.onprogress?.({ loaded, total, lengthComputable: true });
  }

  finishUpload() {
    this.upload.onload?.();
  }

  progressDownload(loaded: number, total?: number) {
    this.onprogress?.({ loaded, total: total ?? 0, lengthComputable: total !== undefined });
  }

  respond(status: number, body: unknown) {
    this.status = status;
    this.response = body;
    this.onload?.();
  }

  failNetwork() {
    this.onerror?.();
  }
}

/**
 * Instala o XHR falso e devolve uma promessa com a requisição assim que ela for enviada.
 * `onSend` (opcional) responde na hora, para testes que não precisam controlar o tempo.
 */
export function installFakeXhr(onSend?: (xhr: FakeXhr) => void): Promise<FakeXhr> {
  vi.stubGlobal('XMLHttpRequest', FakeXhr);
  return new Promise((resolve) => {
    FakeXhr.onSend = (xhr) => {
      resolve(xhr);
      onSend?.(xhr);
    };
  });
}

/** Resposta mínima válida do POST /convert. */
export function convertResponse(overrides: Record<string, unknown> = {}) {
  return {
    format: 'markdown',
    mainFile: 'notas.md',
    ast: {
      'pandoc-api-version': [1, 23, 1],
      meta: {},
      blocks: [{ t: 'Header', c: [1, ['', [], []], [{ t: 'Str', c: 'Introdução' }]] }],
    },
    mathTypst: {},
    media: {},
    bibliography: [],
    warnings: [],
    ...overrides,
  };
}
