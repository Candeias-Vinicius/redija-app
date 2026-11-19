import { ImportCancelledError, ImportFailure, ImportServiceUnavailableError } from '../errors';
import { ImportOptions } from '../types';
import { ConvertResponse, ImportSourceFormat } from './types';

export { ImportServiceUnavailableError } from '../errors';

/** URL do serviço de importação (Railway). Vazio = importação remota desativada. */
export function getImportApiUrl(): string {
  const raw = (import.meta.env.VITE_IMPORT_API_URL as string | undefined) ?? '';
  return raw.trim().replace(/\/+$/, '');
}

/**
 * Tempo máximo sem nenhum avanço no envio ou no recebimento. Não é um teto para o arquivo inteiro:
 * um .zip grande numa conexão lenta pode levar vários minutos, desde que continue avançando.
 */
export const TRANSFER_STALL_TIMEOUT_MS = 60_000;

/** Tempo máximo de conversão no servidor depois do envio (o Pandoc tem até 90 s por etapa). */
export const PROCESSING_TIMEOUT_MS = 5 * 60_000;

type TransferPhase = 'uploading' | 'converting' | 'downloading';

const SOURCE_FORMATS: ImportSourceFormat[] = ['docx', 'latex', 'markdown', 'typst'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Confere a forma da resposta antes de convertê-la: um proxy pode responder 200 com outra coisa. */
export function isConvertResponse(body: unknown): body is ConvertResponse {
  if (!isRecord(body) || !isRecord(body.ast)) return false;
  if (!SOURCE_FORMATS.includes(body.format as ImportSourceFormat)) return false;
  if (!Array.isArray(body.ast.blocks)) return false;
  if (body.media !== undefined && !isRecord(body.media)) return false;
  if (body.mathTypst !== undefined && !isRecord(body.mathTypst)) return false;
  if (body.bibliography !== undefined && !Array.isArray(body.bibliography)) return false;
  return body.warnings === undefined || Array.isArray(body.warnings);
}

function serverMessage(body: unknown): string | null {
  return isRecord(body) && typeof body.error === 'string' && body.error.trim() ? body.error : null;
}

/** Traduz o status HTTP e o corpo da resposta em resultado ou em erro com mensagem para o usuário. */
export function interpretConvertResponse(status: number, body: unknown): ConvertResponse {
  if (status === 502 || status === 503 || status === 504) {
    throw new ImportServiceUnavailableError(
      serverMessage(body) ??
        'O serviço de importação de documentos está fora do ar no momento. Tente novamente em instantes.',
    );
  }
  if (status === 429) {
    throw new ImportServiceUnavailableError(
      serverMessage(body) ?? 'Muitas importações em sequência. Aguarde um minuto e tente de novo.',
    );
  }
  if (status < 200 || status >= 300) {
    throw new ImportFailure(
      serverMessage(body) ?? `Falha ao converter o documento (HTTP ${status}).`,
    );
  }
  if (!isConvertResponse(body)) {
    throw new ImportServiceUnavailableError(
      'O serviço de importação devolveu uma resposta inesperada. Tente novamente em instantes.',
    );
  }
  return body;
}

function networkError(): ImportServiceUnavailableError {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new ImportServiceUnavailableError(
      'Você está sem conexão com a internet. Conecte-se e tente novamente.',
    );
  }
  // Sem resposta legível: queda de conexão, bloqueio (firewall, extensão) ou erro do proxy do
  // Railway durante um reinício, que sai sem cabeçalho CORS e o navegador não deixa ler.
  return new ImportServiceUnavailableError();
}

function stallError(phase: TransferPhase): ImportServiceUnavailableError {
  if (phase === 'uploading') {
    return new ImportServiceUnavailableError(
      'O envio do arquivo parou de avançar por 1 minuto. Verifique sua conexão e tente novamente.',
    );
  }
  if (phase === 'downloading') {
    return new ImportServiceUnavailableError(
      'O recebimento do documento convertido parou de avançar por 1 minuto. Verifique sua conexão e tente novamente.',
    );
  }
  return new ImportServiceUnavailableError(
    'A conversão passou de 5 minutos e foi interrompida. Tente novamente; se continuar, envie um arquivo menor (por exemplo, com as imagens comprimidas).',
  );
}

/**
 * Envia o arquivo ao serviço de importação e devolve o AST do Pandoc com mídia e bibliografia.
 * O arquivo é processado em memória/pasta temporária no servidor e não é armazenado.
 *
 * Usa XMLHttpRequest porque o `fetch` não informa o progresso do envio, e um .zip grande pode
 * levar minutos para subir. O `file` vai direto no FormData, sem cópia em memória.
 */
export function convertWithImportService(
  fileName: string,
  file: Blob,
  { onProgress, signal }: ImportOptions = {},
): Promise<ConvertResponse> {
  const baseUrl = getImportApiUrl();
  if (!baseUrl) {
    return Promise.reject(
      new ImportFailure(
        'A importação de documentos .docx, .tex, .md, .typ e .zip (Overleaf/Typst) precisa do serviço de importação, que não está configurado neste ambiente. Arquivos .redija continuam sendo importados normalmente.',
      ),
    );
  }
  if (signal?.aborted) return Promise.reject(new ImportCancelledError());

  return new Promise<ConvertResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let phase: TransferPhase = 'uploading';
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const settle = (complete: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      signal?.removeEventListener('abort', handleAbort);
      complete();
    };
    const fail = (err: Error) => settle(() => reject(err));

    // Rearmado a cada sinal de vida: só dispara quando a etapa atual fica parada
    const armWatchdog = () => {
      clearTimeout(watchdog);
      const limit = phase === 'converting' ? PROCESSING_TIMEOUT_MS : TRANSFER_STALL_TIMEOUT_MS;
      const stalledPhase = phase;
      watchdog = setTimeout(() => {
        fail(stallError(stalledPhase));
        xhr.abort();
      }, limit);
    };
    const enterConverting = () => {
      if (phase !== 'uploading') return;
      phase = 'converting';
      armWatchdog();
      onProgress?.({ stage: 'converting' });
    };
    function handleAbort() {
      fail(new ImportCancelledError());
      xhr.abort();
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
    xhr.open('POST', `${baseUrl}/convert`);
    xhr.responseType = 'json';

    xhr.upload.onprogress = (event) => {
      if (phase !== 'uploading') return;
      const total = event.lengthComputable ? event.total : file.size;
      onProgress?.({ stage: 'uploading', loaded: event.loaded, total });
      if (total > 0 && event.loaded >= total) enterConverting();
      else armWatchdog();
    };
    xhr.upload.onload = enterConverting;
    xhr.onprogress = (event) => {
      phase = 'downloading';
      armWatchdog();
      onProgress?.({
        stage: 'downloading',
        loaded: event.loaded,
        total: event.lengthComputable ? event.total : undefined,
      });
    };
    xhr.onerror = () => fail(networkError());
    xhr.onload = () => {
      if (xhr.status === 0) {
        fail(networkError());
        return;
      }
      try {
        const response = interpretConvertResponse(xhr.status, xhr.response);
        settle(() => resolve(response));
      } catch (err) {
        fail(err as Error);
      }
    };

    const form = new FormData();
    form.append('file', file, fileName);
    onProgress?.({ stage: 'uploading', loaded: 0, total: file.size });
    armWatchdog();
    xhr.send(form);
  });
}
