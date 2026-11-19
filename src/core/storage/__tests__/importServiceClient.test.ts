import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  importDocumentFile,
  ImportCancelledError,
  ImportFailure,
  ImportServiceUnavailableError,
  type ImportProgress,
} from '../documentImporter';
import {
  convertWithImportService,
  PROCESSING_TIMEOUT_MS,
  TRANSFER_STALL_TIMEOUT_MS,
} from '../importer/pandoc/client';
import { convertResponse, FakeXhr, installFakeXhr } from './fakeXhr';

const file = new Blob(['# Introdução'.repeat(100)]);

/** Dispara a conversão e devolve a promessa (já com handler, sem rejeição solta) e a requisição. */
async function startConversion(options: Parameters<typeof convertWithImportService>[2] = {}) {
  const sent = installFakeXhr();
  const promise = convertWithImportService('notas.md', file, options);
  promise.catch(() => {});
  return { promise, xhr: await sent };
}

describe('Transporte do serviço de importação (XHR)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_IMPORT_API_URL', 'http://localhost:8080');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    FakeXhr.onSend = null;
  });

  describe('Progresso', () => {
    it('informa envio, conversão e recebimento, nessa ordem', async () => {
      const stages: ImportProgress[] = [];
      const { promise, xhr } = await startConversion({ onProgress: (p) => stages.push(p) });

      xhr.progressUpload(400, 1200);
      xhr.progressUpload(1200, 1200);
      xhr.progressDownload(50, 200);
      xhr.respond(200, convertResponse());
      await promise;

      expect(stages).toEqual([
        { stage: 'uploading', loaded: 0, total: file.size },
        { stage: 'uploading', loaded: 400, total: 1200 },
        { stage: 'uploading', loaded: 1200, total: 1200 },
        { stage: 'converting' },
        { stage: 'downloading', loaded: 50, total: 200 },
      ]);
    });

    it('vai do envio para a conversão também pelo evento de fim do upload', async () => {
      const stages: string[] = [];
      const { xhr } = await startConversion({ onProgress: (p) => stages.push(p.stage) });
      xhr.finishUpload();
      expect(stages).toEqual(['uploading', 'converting']);
    });

    it('um File do seletor vai direto para o envio, sem a etapa de leitura, e termina montando o projeto', async () => {
      const stages: string[] = [];
      void installFakeXhr((xhr) => xhr.respond(200, convertResponse()));
      await importDocumentFile(new File(['# Oi'], 'notas.md'), {
        onProgress: (p) => stages.push(p.stage),
      });
      expect(stages).toEqual(['uploading', 'building']);
    });
  });

  describe('Tempo limite por inatividade (não um teto para o arquivo inteiro)', () => {
    it('um envio lento que continua avançando não é interrompido', async () => {
      vi.useFakeTimers();
      const { promise, xhr } = await startConversion();
      for (let sent = 1; sent <= 10; sent++) {
        vi.advanceTimersByTime(TRANSFER_STALL_TIMEOUT_MS - 1000);
        xhr.progressUpload(sent * 100, 1000);
      }
      // ~10 minutos de envio no total, sem estourar
      xhr.respond(200, convertResponse());
      await expect(promise).resolves.toMatchObject({ format: 'markdown' });
      expect(xhr.aborted).toBe(false);
    });

    it('envio parado por 1 minuto vira erro de conexão, com nova tentativa possível', async () => {
      vi.useFakeTimers();
      const { promise, xhr } = await startConversion();
      xhr.progressUpload(100, 1000);
      vi.advanceTimersByTime(TRANSFER_STALL_TIMEOUT_MS);

      await expect(promise).rejects.toThrow(/envio do arquivo parou de avançar/);
      await expect(promise).rejects.toMatchObject({ retriable: true });
      expect(xhr.aborted).toBe(true);
    });

    it('a conversão no servidor tem 5 minutos depois do envio', async () => {
      vi.useFakeTimers();
      const { promise, xhr } = await startConversion();
      xhr.finishUpload();
      vi.advanceTimersByTime(PROCESSING_TIMEOUT_MS - 1000);
      expect(xhr.aborted).toBe(false);
      vi.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow(/conversão passou de 5 minutos/);
      expect(xhr.aborted).toBe(true);
    });

    it('recebimento parado por 1 minuto também é interrompido', async () => {
      vi.useFakeTimers();
      const { promise, xhr } = await startConversion();
      xhr.finishUpload();
      xhr.progressDownload(10);
      vi.advanceTimersByTime(TRANSFER_STALL_TIMEOUT_MS);
      await expect(promise).rejects.toThrow(/recebimento do documento convertido parou/);
    });
  });

  describe('Cancelamento', () => {
    it('cancelar aborta a requisição e rejeita com ImportCancelledError', async () => {
      const controller = new AbortController();
      const { promise, xhr } = await startConversion({ signal: controller.signal });
      controller.abort();
      await expect(promise).rejects.toBeInstanceOf(ImportCancelledError);
      expect(xhr.aborted).toBe(true);
    });

    it('não chega a enviar quando já foi cancelado', async () => {
      const controller = new AbortController();
      controller.abort();
      const xhrSpy = vi.fn();
      vi.stubGlobal('XMLHttpRequest', xhrSpy);
      await expect(
        convertWithImportService('a.md', file, { signal: controller.signal }),
      ).rejects.toBeInstanceOf(ImportCancelledError);
      expect(xhrSpy).not.toHaveBeenCalled();
    });
  });

  describe('Erros com mensagem para o usuário', () => {
    const failWith = async (respond: (xhr: FakeXhr) => void) => {
      const { promise, xhr } = await startConversion();
      respond(xhr);
      return promise.then(
        () => {
          throw new Error('deveria ter falhado');
        },
        (err: unknown) => err as ImportFailure,
      );
    };

    it('sem internet, diz isso em vez de culpar o serviço', async () => {
      vi.stubGlobal('navigator', { onLine: false });
      const err = await failWith((xhr) => xhr.failNetwork());
      expect(err.message).toMatch(/sem conexão com a internet/);
      expect(err.retriable).toBe(true);
    });

    it('erro de rede com internet: serviço inalcançável ou reiniciando, com nova tentativa', async () => {
      const err = await failWith((xhr) => xhr.failNetwork());
      expect(err).toBeInstanceOf(ImportServiceUnavailableError);
      expect(err.message).toMatch(/Não foi possível contatar o serviço de importação.*reiniciando/);
    });

    it('502/503/504 e 429 permitem nova tentativa e usam a mensagem do serviço quando houver', async () => {
      const busy = await failWith((xhr) =>
        xhr.respond(503, {
          error: 'O serviço de importação está ocupado. Tente novamente em instantes.',
        }),
      );
      expect(busy.message).toBe(
        'O serviço de importação está ocupado. Tente novamente em instantes.',
      );
      expect(busy.retriable).toBe(true);

      const gateway = await failWith((xhr) => xhr.respond(502, null));
      expect(gateway.message).toMatch(/fora do ar no momento/);
      expect((await failWith((xhr) => xhr.respond(429, null))).retriable).toBe(true);
    });

    it('erro do documento (422) mostra a explicação do serviço e não oferece nova tentativa', async () => {
      const err = await failWith((xhr) =>
        xhr.respond(422, {
          error: 'Nenhum documento .tex, .typ, .md ou .docx foi encontrado no .zip.',
        }),
      );
      expect(err.message).toBe('Nenhum documento .tex, .typ, .md ou .docx foi encontrado no .zip.');
      expect(err.retriable).toBe(false);
    });

    it('resposta 200 que não é a do conversor (HTML de proxy, JSON incompleto) não vira TypeError', async () => {
      for (const body of [null, { ok: true }, { ...convertResponse(), ast: {} }]) {
        const err = await failWith((xhr) => xhr.respond(200, body));
        expect(err.message).toMatch(/resposta inesperada/);
        expect(err.retriable).toBe(true);
      }
    });
  });
});
