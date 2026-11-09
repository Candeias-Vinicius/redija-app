import React, { useState } from 'react';
import {
  X,
  Sparkles,
  HardDrive,
  Bug,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { APP_VERSION, setBetaNoticeDismissed } from '@/core/version';

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
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleConfirmClose = () => {
    if (dontShowAgain) {
      setBetaNoticeDismissed(true);
    }
    onClose();
  };

  const handleReportAndClose = () => {
    if (dontShowAgain) {
      setBetaNoticeDismissed(true);
    }
    onClose();
    onOpenBugReport();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleConfirmClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-neutral-800 dark:text-neutral-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho de Destaque */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent dark:from-emerald-950/40 dark:via-teal-950/20 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  Bem-vindo ao Beta do RedijaApp!
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Editor acadêmico visual moderno com motor Typst WebAssembly.
              </p>
            </div>
          </div>

          <button
            onClick={handleConfirmClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Aviso e Orientações */}
        <div className="p-6 space-y-4 overflow-y-auto text-xs sm:text-sm leading-relaxed">
          {/* Card 1: O que significa estar em Beta */}
          <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 flex items-start gap-3">
            <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm">
                Versão em Testes Públicos
              </p>
              <p className="text-neutral-600 dark:text-neutral-300 text-xs">
                O RedijaApp já possui todas as normas ABNT e compilação em tempo real, mas novas funcionalidades e refinamentos são lançados com frequência.
              </p>
            </div>
          </div>

          {/* Card 2: Cuidados com os Dados e Backups */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 dark:border-amber-700/40 flex items-start gap-3">
            <HardDrive className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950 dark:text-amber-200 text-xs sm:text-sm">
                Cuidados com seu Trabalho
              </p>
              <p className="text-amber-900/90 dark:text-amber-300/90 text-xs">
                Seus documentos são salvos primariamente no navegador. Para segurança máxima:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 dark:text-amber-300/90 text-xs pt-1">
                <li>Faça login com sua conta Google para sincronizar no Google Drive.</li>
                <li>Baixe cópias de segurança periódicas em <code className="font-mono bg-amber-200/50 dark:bg-amber-900/60 px-1 py-0.5 rounded">.redija</code> ou PDF.</li>
              </ul>
            </div>
          </div>

          {/* Card 3: Botão de Relatar Problemas */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/20 dark:border-blue-700/40 flex items-start gap-3">
            <Bug className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-blue-950 dark:text-blue-200 text-xs sm:text-sm">
                Encontrou um erro ou tem sugestões?
              </p>
              <p className="text-blue-900/90 dark:text-blue-300/90 text-xs">
                Use o botão com o ícone de <strong>besourinho (Bug)</strong> no topo da tela para nos enviar um relato direto, com print e diagnóstico automático. Sua opinião molda o futuro do aplicativo!
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé: Ações e Lembrar Opção */}
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            />
            <span>Não exibir este aviso novamente</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleReportAndClose}
              className="px-3 py-2 text-xs font-medium rounded-xl text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Dar Feedback</span>
            </button>

            <button
              onClick={handleConfirmClose}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Entendi e Começar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
