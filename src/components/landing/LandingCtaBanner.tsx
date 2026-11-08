import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Lock } from 'lucide-react';

interface LandingCtaBannerProps {
  isDark: boolean;
  onLogin: () => void;
  onContinueAsGuest: () => void;
}

export const LandingCtaBanner: React.FC<LandingCtaBannerProps> = ({
  isDark,
  onLogin,
  onContinueAsGuest,
}) => {
  return (
    <section className="py-20 sm:py-24 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`relative p-8 sm:p-14 rounded-3xl border text-center shadow-2xl overflow-hidden transition-all ${
            isDark
              ? 'bg-gradient-to-br from-[#0c1826] via-[#09151f] to-[#041c14] border-emerald-500/30 text-white shadow-black/80'
              : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 border-emerald-500 text-white shadow-emerald-900/20'
          }`}
        >
          {/* Luzes decorativas internas */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 text-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Experimente agora mesmo no navegador</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Pronto para economizar semanas de formatação manual?
            </h2>

            <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed">
              Junte-se a estudantes e pesquisadores que já produzem seus TCCs, artigos e dissertações sem o estresse da ABNT.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onLogin}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 transition-all shadow-lg active:scale-95"
              >
                <span>Continuar com o Google</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onContinueAsGuest}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-all"
              >
                <span>Usar Modo Convidado (Local)</span>
              </button>
            </div>

            <div className="pt-6 border-t border-white/15 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-200">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>100% Gratuito &amp; Aberto</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-300" />
                <span>Google Drive Pessoal (BYOS)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-300" />
                <span>WASM em tempo real</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
