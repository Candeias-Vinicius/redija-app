import {
  ImportFailure,
  isImportCancelled,
  type ImportProgress,
} from '@/core/storage/documentImporter';
import { formatBytes } from '@/core/storage/imageQuota';

/** Importação em andamento, como a interface a exibe. */
export interface ImportState {
  fileName: string;
  progress: ImportProgress;
}

export interface ImportProgressView {
  label: string;
  /** 0–100, ou `null` quando a etapa não tem como medir (barra indeterminada). */
  percent: number | null;
  /** Ex.: "54,0 MB de 120,0 MB". */
  detail?: string;
  hint?: string;
  /** Na gravação e abertura não dá mais para desfazer: o botão Cancelar fica desabilitado. */
  cancellable: boolean;
}

const STAGE_LABELS: Record<ImportProgress['stage'], string> = {
  reading: 'Lendo o arquivo…',
  extracting: 'Descompactando…',
  uploading: 'Enviando o arquivo para conversão…',
  converting: 'Convertendo o documento…',
  downloading: 'Recebendo o documento convertido…',
  building: 'Montando o projeto…',
  saving: 'Salvando no navegador…',
  opening: 'Abrindo o trabalho…',
};

/** Etapas em que o projeto já foi gravado: cancelar não desfaria mais nada. */
const NON_CANCELLABLE_STAGES = new Set<ImportProgress['stage']>(['saving', 'opening']);

export function progressPercent(progress: ImportProgress): number | null {
  if (typeof progress.percent === 'number')
    return Math.min(100, Math.max(0, Math.floor(progress.percent)));
  if (progress.loaded !== undefined && progress.total) {
    return Math.min(100, Math.floor((progress.loaded / progress.total) * 100));
  }
  return null;
}

/**
 * Chave do que muda na tela: o hook só atualiza o estado quando ela muda, para o envio de um
 * arquivo grande (dezenas de eventos por segundo) não re-renderizar o app a cada evento.
 */
export function progressKey(progress: ImportProgress): string {
  return `${progress.stage}:${progressPercent(progress) ?? ''}`;
}

export function describeImportProgress(progress: ImportProgress): ImportProgressView {
  const percent = progressPercent(progress);
  const view: ImportProgressView = {
    label: STAGE_LABELS[progress.stage],
    percent,
    cancellable: !NON_CANCELLABLE_STAGES.has(progress.stage),
  };
  if (progress.stage === 'opening') {
    view.hint = 'Trabalhos longos levam alguns segundos para abrir no editor.';
  }
  if (
    (progress.stage === 'uploading' || progress.stage === 'downloading') &&
    progress.loaded !== undefined &&
    progress.total
  ) {
    view.detail = `${formatBytes(progress.loaded)} de ${formatBytes(progress.total)}`;
  }
  if (progress.stage === 'uploading' || progress.stage === 'converting') {
    view.hint = 'Arquivos grandes, com muitas imagens, podem levar alguns minutos.';
  }
  return view;
}

const GENERIC_IMPORT_ERROR =
  'Não foi possível importar o arquivo. Tente de novo; se o problema continuar, use "Relatar problema ou sugestão" no menu do perfil.';

/**
 * Mensagem e possibilidade de nova tentativa para um erro de importação.
 * `null` quando o usuário cancelou (não é falha). Erros inesperados (bug) não vazam detalhe
 * técnico em inglês: ganham uma mensagem genérica e ficam no console.
 */
export function describeImportError(err: unknown): { message: string; retriable: boolean } | null {
  if (isImportCancelled(err)) return null;
  if (err instanceof ImportFailure) return { message: err.message, retriable: err.retriable };
  if (err instanceof DOMException && err.name === 'QuotaExceededError') {
    return {
      message:
        'Não há espaço no navegador para salvar o projeto importado. Libere espaço (por exemplo, esvaziando a lixeira de trabalhos) e tente de novo.',
      retriable: true,
    };
  }
  return { message: GENERIC_IMPORT_ERROR, retriable: false };
}

const MAX_LISTED_WARNINGS = 5;

/** Avisos do conversor num texto curto para notificação (sem repetições, no máximo 5 itens). */
export function formatImportWarnings(warnings: string[]): string | null {
  const unique = [...new Set(warnings.map((w) => w.trim()).filter(Boolean))];
  if (unique.length === 0) return null;
  const listed = unique.slice(0, MAX_LISTED_WARNINGS).map((w) => `• ${w}`);
  const rest = unique.length - listed.length;
  if (rest > 0) listed.push(`• e mais ${rest} ${rest === 1 ? 'aviso' : 'avisos'}.`);
  return `Alguns itens não puderam ser importados:\n${listed.join('\n')}`;
}
