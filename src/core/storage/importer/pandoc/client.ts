import { ConvertResponse } from './types';

/** URL do serviço de importação (Railway). Vazio = importação remota desativada. */
export function getImportApiUrl(): string {
  const raw = (import.meta.env.VITE_IMPORT_API_URL as string | undefined) ?? '';
  return raw.trim().replace(/\/+$/, '');
}

export function isRemoteImportEnabled(): boolean {
  return getImportApiUrl() !== '';
}

/** Erro de rede (serviço fora do ar / offline), distinto de erro de conversão do documento. */
export class ImportServiceUnavailableError extends Error {
  constructor(message = 'O serviço de importação não respondeu.') {
    super(message);
    this.name = 'ImportServiceUnavailableError';
  }
}

const TIMEOUT_MS = 90_000;

/**
 * Envia o arquivo ao serviço de importação e devolve o AST do Pandoc com mídia e bibliografia.
 * O arquivo é processado em memória/pasta temporária no servidor e não é armazenado.
 */
export async function convertWithImportService(
  fileName: string,
  data: ArrayBuffer,
): Promise<ConvertResponse> {
  const baseUrl = getImportApiUrl();
  if (!baseUrl) throw new ImportServiceUnavailableError('Serviço de importação não configurado.');

  const form = new FormData();
  form.append('file', new Blob([data]), fileName);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/convert`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch {
    throw new ImportServiceUnavailableError();
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    let message = 'O serviço de importação está indisponível no momento.';
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // resposta sem JSON (proxy do Railway)
    }
    throw new ImportServiceUnavailableError(message);
  }

  if (!response.ok) {
    let message = `Falha ao converter o documento (HTTP ${response.status}).`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // mantém a mensagem genérica
    }
    throw new Error(message);
  }

  return (await response.json()) as ConvertResponse;
}
