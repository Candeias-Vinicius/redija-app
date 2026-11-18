import React from 'react';
import { Cloud, X, Sparkles, Loader2 } from 'lucide-react';

interface BackupNoticeBannerProps {
  onLogin: () => Promise<string | null>;
  onLoginDevMock?: () => void;
  isConfigured?: boolean;
  isLoading: boolean;
  onDismiss: () => void;
}

/**
 * Aviso para quem usa o perfil local. Enquanto ele estiver visível, é o único
 * convite para conectar a conta Google (o botão "Entrar" do header fica oculto).
 */
export const BackupNoticeBanner: React.FC<BackupNoticeBannerProps> = ({
  onLogin,
  onLoginDevMock,
  isConfigured = true,
  isLoading,
  onDismiss,
}) => {
  const handleClickConnect = async () => {
    if (!isConfigured && onLoginDevMock) {
      onLoginDevMock();
      return;
    }
    await onLogin();
  };

  return (
    <div
      role="region"
      aria-label="Aviso de backup"
      className="bg-gradient-to-r from-brand-900 via-slate-900 to-brand-950 text-white px-2 sm:px-4 py-1.5 text-xs sm:text-sm flex items-center gap-2 shadow-sm relative z-20 animate-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center gap-2 sm:gap-2.5 mx-auto max-w-5xl w-full min-w-0">
        <Cloud className="w-4 h-4 text-brand-300 shrink-0" aria-hidden="true" />
        <p className="text-slate-200 leading-snug min-w-0 flex-1">
          <span className="font-semibold text-white">
            <span className="sm:hidden">Salvo só neste navegador.</span>
            <span className="hidden sm:inline">Seus trabalhos estão salvos apenas neste navegador.</span>
          </span>{' '}
          <span className="hidden md:inline text-slate-300">
            Conecte sua conta Google para salvar no seu Drive e continuar no celular ou notebook.
          </span>
        </p>
        <button
          type="button"
          onClick={handleClickConnect}
          disabled={isLoading}
          className="touch-target flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-brand-400 hover:bg-brand-300 disabled:opacity-50 text-slate-950 font-semibold text-xs shadow-sm transition-colors shrink-0 whitespace-nowrap"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>Conectar Google</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="touch-target p-1 text-slate-300 hover:text-white rounded transition-colors shrink-0 flex items-center justify-center"
        title="Lembrar mais tarde (7 dias)"
        aria-label="Lembrar mais tarde (oculta este aviso por 7 dias)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
