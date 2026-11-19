/**
 * Erro de importação com mensagem pronta para mostrar ao usuário.
 * `retriable` indica que tentar de novo pode resolver (rede, serviço instável, demora).
 */
export class ImportFailure extends Error {
  readonly retriable: boolean;

  constructor(message: string, retriable = false) {
    super(message);
    this.name = 'ImportFailure';
    this.retriable = retriable;
  }
}

/** Serviço de importação inalcançável, instável ou lento: vale tentar de novo. */
export class ImportServiceUnavailableError extends ImportFailure {
  constructor(
    message = 'Não foi possível contatar o serviço de importação de documentos. Verifique sua conexão; se ela estiver normal, o serviço pode estar reiniciando. Tente novamente em instantes.',
  ) {
    super(message, true);
    this.name = 'ImportServiceUnavailableError';
  }
}

/** O usuário cancelou a importação. Não é falha: não deve virar notificação de erro. */
export class ImportCancelledError extends Error {
  constructor() {
    super('Importação cancelada.');
    this.name = 'ImportCancelledError';
  }
}

export function isImportCancelled(err: unknown): boolean {
  return err instanceof ImportCancelledError;
}

export function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new ImportCancelledError();
}
