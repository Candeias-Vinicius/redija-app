import React from 'react';
import { X, Sparkles, HardDrive, Bug, CheckCircle2, Info } from 'lucide-react';
import { APP_VERSION, setBetaNoticeDismissed } from '@/core/version';
import { Modal } from '@/components/ui/Modal';

interface BetaNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBugReport: () => void;
}

export const BetaNoticeModal: React.FC<BetaNoticeModalProps> = ({
  isOpen,
  onClose,
  onOpenBugReport,
}) => {
  if (!isOpen) return null;

  // "Entendi" dispensa o aviso de vez: ele não volta a interromper o usuário.
  const handleConfirmClose = () => {
    setBetaNoticeDismissed(true);
    onClose();
  };

  const handleReportAndClose = () => {
    setBetaNoticeDismissed(true);
    onClose();
    onOpenBugReport();
  };

  return (
    <Modal onClose={onClose} labelledBy="beta-notice-title" closeOnBackdrop>
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho de Destaque */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-brand-500/10 via-teal-500/10 to-transparent dark:from-brand-950/40 dark:via-teal-950/20 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-brand-700 text-white shadow-md shadow-brand-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 id="beta-notice-title" className="text-base sm:text-lg font-bold tracking-tight">
                  Bem-vindo ao Beta do RedijaApp!
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold uppercase bg-brand-100 text-brand-800 dark:bg-brand-900/60 dark:text-brand-300 border border-brand-300 dark:border-brand-700">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Editor acadêmico visual moderno com motor Typst WebAssembly.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="touch-target p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center shrink-0"
            aria-label="Fechar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Aviso e Orientações */}
        <div className="p-6 space-y-4 overflow-y-auto text-sm leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3">
            <Info className="w-4 h-4 text-brand-700 dark:text-brand-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Versão em Testes Públicos
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                O RedijaApp já possui todas as normas ABNT e compilação em tempo real, mas novas funcionalidades e refinamentos são lançados com frequência.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 dark:border-amber-700/40 flex items-start gap-3">
            <HardDrive className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950 dark:text-amber-200">Cuidados com seu Trabalho</p>
              <p className="text-amber-900 dark:text-amber-300">
                Seus documentos são salvos primariamente no navegador. Para segurança máxima:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-900 dark:text-amber-300 pt-1">
                <li>Faça login com sua conta Google para sincronizar no Google Drive.</li>
                <li>
                  Baixe cópias de segurança periódicas em{' '}
                  <code className="font-mono bg-amber-200/50 dark:bg-amber-900/60 px-1 py-0.5 rounded">.redija</code>{' '}
                  ou PDF.
                </li>
              </ul>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20 dark:border-blue-700/40 flex items-start gap-3">
            <Bug className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-950 dark:text-blue-200">
                Encontrou um erro ou tem sugestões?
              </p>
              <p className="text-blue-900 dark:text-blue-300">
                Abra o menu do seu perfil, no canto superior direito, e escolha <strong>Relatar problema ou sugestão</strong> para nos enviar um relato direto, com print e diagnóstico automático. Sua opinião molda o futuro do aplicativo!
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé: Ações */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleReportAndClose}
            className="touch-target px-3 py-2 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Bug className="w-4 h-4" />
            <span>Dar Feedback</span>
          </button>

          <button
            type="button"
            onClick={handleConfirmClose}
            className="touch-target px-4 py-2 text-sm font-semibold rounded-xl text-white bg-brand-700 hover:bg-brand-800 active:scale-95 shadow-md shadow-brand-600/20 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Entendi e Começar</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface BetaNoticeToastProps {
  onLearnMore: () => void;
  onDismiss: () => void;
}

/**
 * Aviso de Beta não bloqueante, exibido no primeiro acesso no lugar do modal:
 * informa sem interromper o fluxo de criação do primeiro trabalho.
 */
export const BetaNoticeToast: React.FC<BetaNoticeToastProps> = ({ onLearnMore, onDismiss }) => {
  const dismiss = () => {
    setBetaNoticeDismissed(true);
    onDismiss();
  };

  return (
    <div
      role="status"
      aria-label="Aviso da versão Beta"
      className="fixed z-40 bottom-4 inset-x-4 sm:inset-x-auto sm:left-4 sm:w-96 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-brand-700 text-white shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Você está usando o Beta v{APP_VERSION}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
            Seus trabalhos ficam salvos neste navegador. Conecte o Google Drive ou baixe cópias de
            segurança.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                dismiss();
                onLearnMore();
              }}
              className="touch-target px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Saiba mais
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="touch-target px-3 py-1.5 text-sm font-semibold rounded-lg bg-brand-700 hover:bg-brand-800 text-white transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="touch-target -m-1 p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 flex items-center justify-center"
          aria-label="Fechar aviso da versão Beta"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
