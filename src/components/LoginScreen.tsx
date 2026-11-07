import React from 'react';
import {
  FileText,
  Users,
  AlertTriangle,
  Loader2,
  Lock,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => Promise<string | null>;
  onLoginDevMock: () => void;
  onContinueAsGuest: () => void;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onLoginDevMock,
  onContinueAsGuest,
  isLoading,
  error,
  isConfigured,
}) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-neutral-950 relative overflow-hidden">
      {/* Luz ambiente de fundo (Glow sutil) */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Topo / Barra Superior Minimalista (sem botão duplicado no canto) */}
      <header className="relative z-10 px-6 py-4 flex items-center border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-emerald-900/30">
            R
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-white tracking-tight">Redija</span>
            <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded uppercase tracking-wide">
              ABNT
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo Central Limpo e Focado */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
          {/* Apresentação Direta e Enxuta */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-emerald-950/50 mx-auto mb-3">
              R
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Entrar no Redija</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Seus trabalhos acadêmicos sincronizados com segurança no Google Drive
            </p>
          </div>

          {/* Card Principal de Login */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-xl p-6 shadow-2xl space-y-4">
            {/* Mensagem de Erro, se houver */}
            {error && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5 text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Erro de Autenticação</span>
                </p>
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            )}

            {/* Alerta se Client ID não configurado no .env */}
            {!isConfigured && (
              <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-xs text-amber-200 space-y-2">
                <p className="font-semibold flex items-center gap-1.5 text-amber-300">
                  <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Configuração de Desenvolvimento</span>
                </p>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Para testes rápidos sem o Google Cloud, use o modo demonstração:
                </p>
                <button
                  onClick={onLoginDevMock}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Entrar em Modo Demonstração (Dev)</span>
                </button>
              </div>
            )}

            {/* Botão Oficial "Continuar com o Google" */}
            <button
              onClick={() => onLogin()}
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 disabled:opacity-50 text-neutral-900 font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-3 relative group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Conectando com o Google...</span>
                </>
              ) : (
                <>
                  {/* Ícone oficial colorido do Google */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.87c2.27-2.09 3.675-5.17 3.675-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.87-3.05c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.73-4.96H1.26v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.26C.46 8.23 0 10.06 0 12s.46 3.77 1.26 5.39l4.01-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.26 6.61l4.01 3.15c.95-2.85 3.6-4.96 6.73-4.96z"
                    />
                  </svg>
                  <span>Continuar com o Google</span>
                </>
              )}
            </button>

            {/* Link Discreto Convidado */}
            <div className="pt-2 border-t border-neutral-800 text-center">
              <button
                onClick={onContinueAsGuest}
                className="text-xs text-neutral-400 hover:text-emerald-400 transition-colors font-medium"
              >
                Prefere testar sem conta? <span className="underline">Continuar como Convidado</span>
              </button>
            </div>
          </div>

          {/* Garantias de Privacidade e Segurança (em pílulas compactas) */}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-neutral-400">
            <div className="p-2.5 rounded-xl border border-neutral-800/80 bg-neutral-900/40">
              <Lock className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <p className="font-semibold text-white">Drive Próprio</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Seus arquivos sob seu controle</p>
            </div>
            <div className="p-2.5 rounded-xl border border-neutral-800/80 bg-neutral-900/40">
              <Users className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <p className="font-semibold text-white">Colaboração</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Compartilhe com orientadores</p>
            </div>
            <div className="p-2.5 rounded-xl border border-neutral-800/80 bg-neutral-900/40">
              <FileText className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
              <p className="font-semibold text-white">100% ABNT</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">PDF oficial e automático</p>
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="relative z-10 px-6 py-3 border-t border-neutral-800/80 text-center text-[11px] text-neutral-500">
        RedijaApp © {new Date().getFullYear()} — Plataforma Acadêmica ABNT & Typst
      </footer>
    </div>
  );
};
