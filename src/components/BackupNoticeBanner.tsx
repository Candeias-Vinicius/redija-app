import React, { useState } from 'react';
import { Cloud, X, Sparkles, Loader2 } from 'lucide-react';

interface BackupNoticeBannerProps {
  isAuthenticated: boolean;
  onLogin: () => Promise<string | null>;
  onLoginDevMock?: () => void;
  isConfigured?: boolean;
  isLoading: boolean;
}

const DISMISS_KEY = 'redija:dismissBackupNoticeUntil';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const BackupNoticeBanner: React.FC<BackupNoticeBannerProps> = ({
  isAuthenticated,
  onLogin,
  onLoginDevMock,
  isConfigured = true,
  isLoading,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const dismissUntil = localStorage.getItem(DISMISS_KEY);
      return Boolean(dismissUntil && Number(dismissUntil) > Date.now());
    } catch {
      return false;
    }
  });

  if (isAuthenticated || isDismissed) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + SEVEN_DAYS_MS));
    } catch {
      // Ignora
    }
    setIsDismissed(true);
  };

  const handleClickConnect = async () => {
    if (!isConfigured && onLoginDevMock) {
      onLoginDevMock();
      return;
    }
    await onLogin();
  };

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-neutral-900 to-emerald-950 text-white px-4 py-2 text-xs flex items-center justify-between shadow-sm relative z-20 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2.5 mx-auto max-w-5xl">
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
          <Cloud className="w-3.5 h-3.5" />
        </div>
        <p className="text-neutral-200 leading-tight">
          <span className="font-semibold text-white">Seus trabalhos estão salvos apenas neste navegador.</span>{' '}
          <span className="hidden sm:inline text-neutral-300">
            Conecte sua conta Google para salvar com segurança no seu Drive e continuar no celular ou notebook.
          </span>
        </p>
        <button
          onClick={handleClickConnect}
          disabled={isLoading}
          className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-semibold text-[11px] shadow-sm transition-colors shrink-0 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          <span>Conectar Google</span>
        </button>
      </div>

      <button
        onClick={handleDismiss}
        className="p-1 text-neutral-400 hover:text-white rounded transition-colors shrink-0 cursor-pointer"
        title="Lembrar mais tarde (7 dias)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
