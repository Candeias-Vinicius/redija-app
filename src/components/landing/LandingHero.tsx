import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  Cloud,
  Loader2,
  AlertTriangle,
  HelpCircle,
  Share2,
} from 'lucide-react';
import { LandingMockup } from './LandingMockup';

interface LandingHeroProps {
  isDark: boolean;
  onLogin: () => Promise<string | null>;
  onLoginDevMock: () => void;
  onContinueAsGuest: () => void;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  pendingSharedDriveFileId?: string | null;
  onOpenDoc: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  isDark,
  onLogin,
  onLoginDevMock,
  onContinueAsGuest,
  isLoading,
  error,
  isConfigured,
  pendingSharedDriveFileId,
  onOpenDoc,
}) => {
  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
      {/* Luzes de Fundo Atmosféricas */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[550px] rounded-full blur-3xl pointer-events-none opacity-40 ${
          isDark
            ? 'bg-gradient-to-b from-emerald-600/30 via-teal-700/10 to-transparent'
            : 'bg-gradient-to-b from-emerald-200/70 via-teal-100/30 to-transparent'
        }`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Cabeçalho do Hero */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Tagline / Eyebrow Badge */}
          <button
            onClick={onOpenDoc}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all animate-fade-in shadow-xs cursor-pointer hover:opacity-90 ${
              isDark
                ? 'text-emerald-300 border-emerald-500/30 bg-emerald-950/40'
                : 'text-emerald-800 border-emerald-200 bg-emerald-50'
            }`}
            title="Clique para explorar normas e padrões suportados"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ABNT • SBC • IEEE • APA 7ª • Pôsteres • Typst Universe</span>
          </button>

          {/* Título Principal de Alto Impacto */}
          <h1
            className={`text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Foque nas suas ideias.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400">
              O Redija cuida das normas por você.
            </span>
          </h1>

          {/* Subtítulo Descritivo */}
          <p
            className={`text-base sm:text-xl leading-relaxed max-w-3xl mx-auto ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            O editor acadêmico em blocos que automatiza a formatação e gera o PDF em tempo real no navegador. Escreva TCCs, artigos, relatórios e pôsteres dentro das normas exigidas, com revisão automática de erros e salvamento seguro no seu Google Drive.
          </p>

          {/* ======================================================== */}
          {/* CARD DE LOGIN E ACESSO RÁPIDO DO HERO                    */}
          {/* ======================================================== */}
          <div
            id="auth-card"
            className={`max-w-md mx-auto p-5 sm:p-6 rounded-2xl border shadow-xl transition-all ${
              isDark
                ? 'bg-slate-900/90 border-slate-800 shadow-black/60'
                : 'bg-white border-slate-200/90 shadow-slate-200/80'
            }`}
          >
            <div className="space-y-3.5">
              {/* Banner de Convite Compartilhado Pendente */}
              {pendingSharedDriveFileId && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 text-left ${
                    isDark
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <p className="font-semibold flex items-center gap-1.5">
                    <Share2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>Você foi convidado para um trabalho no RedijaApp</span>
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    Entre com sua conta Google abaixo para abrir o documento compartilhado.
                  </p>
                </div>
              )}

              {/* Mensagem de Erro, se houver */}
              {error && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 text-left ${
                    isDark
                      ? 'bg-red-950/60 border-red-800 text-red-300'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Falha na Autenticação</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">{error}</p>
                </div>
              )}

              {/* Alerta de Modo Dev se .env não configurado */}
              {!isConfigured && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-2 text-left ${
                    isDark
                      ? 'bg-amber-950/50 border-amber-800 text-amber-200'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <p className="font-semibold flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Google Client ID não configurado no .env</span>
                  </p>
                  <button
                    onClick={onLoginDevMock}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Entrar como Usuário Demonstração</span>
                  </button>
                </div>
              )}

              {/* Botão Oficial Google */}
              <button
                onClick={() => onLogin()}
                disabled={isLoading}
                className={`w-full py-3.5 px-4 rounded-xl border font-semibold text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.99] ${
                  isDark
                    ? 'border-slate-600 hover:border-slate-500 bg-[#ffffff] hover:bg-slate-100 text-slate-950'
                    : 'border-slate-300 hover:border-slate-400 bg-[#ffffff] hover:bg-slate-50 text-slate-800'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Conectando ao Google...</span>
                  </>
                ) : (
                  <>
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

              {/* Botão de Modo Convidado / Perfil Local */}
              <div className="pt-1">
                <button
                  onClick={onContinueAsGuest}
                  className={`w-full py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    isDark
                      ? 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-300 hover:text-white'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Experimentar como Convidado (Modo Local Offline)
                </button>
              </div>

              {/* Garantias de Confiança */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 text-left">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>100% Gratuito e Aberto</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                  <span>Salvo no seu Google Drive</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>WASM em milissegundos</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Privacidade Local-First</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Demonstração da Interface Simulada (Typst Mockup) */}
        <div id="demonstracao" className="mt-14 sm:mt-18">
          <LandingMockup isDark={isDark} />
        </div>
      </div>
    </section>
  );
};
