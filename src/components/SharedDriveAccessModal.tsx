import React from 'react';
import {
  AlertCircle,
  ExternalLink,
  FolderSearch,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';

interface SharedDriveAccessModalProps {
  isOpen: boolean;
  fileId?: string | null;
  isOpening: boolean;
  error: string | null;
  isPickerConfigured: boolean;
  onSelectViaPicker: () => Promise<boolean>;
  onRetryDirectLoad?: () => Promise<void>;
  onImportLocalFile?: () => void;
  onClose: () => void;
}

export const SharedDriveAccessModal: React.FC<SharedDriveAccessModalProps> = ({
  isOpen,
  fileId,
  isOpening,
  error,
  isPickerConfigured,
  onSelectViaPicker,
  onRetryDirectLoad,
  onImportLocalFile,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-drive-access-title"
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl border border-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FolderSearch className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="shared-drive-access-title"
                className="text-base font-semibold text-neutral-900"
              >
                Abrir Trabalho Compartilhado
              </h2>
              <p className="text-xs text-neutral-500">
                Autorização segura via Google Drive (escopo estrito)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Por que é preciso selecionar o arquivo uma primeira vez?</p>
              <p className="text-emerald-800/90">
                Por privacidade, o RedijaApp utiliza o escopo mínimo{' '}
                <code className="px-1 py-0.5 rounded bg-emerald-100/80 font-mono text-[10px]">
                  drive.file
                </code>{' '}
                do Google (não lê todo o seu Drive). Selecione o arquivo compartilhado uma única vez no
                seletor oficial abaixo para liberá-lo no editor e ativar a colaboração em tempo real.
              </p>
            </div>
          </div>

          <ol className="space-y-1.5 text-neutral-600 pl-4 list-decimal leading-relaxed">
            <li>
              Clique em <strong>Selecionar Arquivo no Google Drive</strong>.
            </li>
            <li>
              Na guia <strong>Compartilhados comigo</strong>, escolha o arquivo do projeto com
              extensão <code className="font-mono text-neutral-800">.redija</code> (evite a cópia{' '}
              <code className="font-mono text-neutral-800">.pdf</code>).
            </li>
          </ol>

          {!isPickerConfigured && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Google Picker não configurado neste ambiente</p>
                <p>
                  Configure{' '}
                  <code className="font-mono bg-amber-100 px-1 rounded">VITE_GOOGLE_API_KEY</code>{' '}
                  (com a Google Picker API habilitada no Cloud Console) ou peça para quem compartilhou
                  enviar o arquivo <code className="font-mono">.redija</code> para você importar
                  abaixo.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              disabled={isOpening || !isPickerConfigured}
              onClick={async () => {
                const ok = await onSelectViaPicker();
                if (ok) onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors"
            >
              {isOpening ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Abrindo arquivo compartilhado...</span>
                </>
              ) : (
                <>
                  <FolderSearch className="w-4 h-4" />
                  <span>Selecionar Arquivo no Google Drive</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {fileId && onRetryDirectLoad && (
                <button
                  type="button"
                  disabled={isOpening}
                  onClick={onRetryDirectLoad}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tentar link novamente</span>
                </button>
              )}

              {onImportLocalFile && (
                <button
                  type="button"
                  disabled={isOpening}
                  onClick={() => {
                    onClose();
                    onImportLocalFile();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium text-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Importar arquivo .redija</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
