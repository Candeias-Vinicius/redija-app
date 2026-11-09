import React from 'react';
import { XCircle, CheckCircle2, AlertOctagon, Sparkles } from 'lucide-react';

interface LandingComparisonProps {
  isDark: boolean;
}

export const LandingComparison: React.FC<LandingComparisonProps> = ({ isDark }) => {
  return (
    <section className="py-16 sm:py-20 border-y border-slate-200/60 dark:border-slate-800/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Comparativo de Produtividade
          </span>
          <h2
            className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Por que abandonar a guerra contra o Word e o LaTeX?
          </h2>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Veja como o RedijaApp elimina as frustrações mais comuns de estudantes, orientadores e pesquisadores.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {/* Card 1: Microsoft Word / Google Docs */}
          <div
            className={`p-6 rounded-2xl border transition-colors flex flex-col justify-between ${
              isDark
                ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-lg">
                <XCircle className="w-5 h-5 shrink-0" />
                <h3>Word e Google Docs</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Criados para cartas comerciais, exigem horas de formatação manual para ABNT, SBC, IEEE ou APA.
              </p>

              <ul className="space-y-2.5 text-xs">
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Imagens que quebram o layout inteiro ao mover um milímetro</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Sumários desconfigurados e números de página errados</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Recuo de citação de 4cm ajustado na régua em cada parágrafo</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Citações e referências manuais com alto risco de plágio involuntário</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
              Resultado: Noites em claro consertando margens antes da entrega.
            </div>
          </div>

          {/* Card 2: LaTeX / Overleaf */}
          <div
            className={`p-6 rounded-2xl border transition-colors flex flex-col justify-between ${
              isDark
                ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-500 font-bold text-lg">
                <AlertOctagon className="w-5 h-5 shrink-0" />
                <h3>LaTeX e Overleaf</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Poderoso para fórmulas, mas excessivamente complexo e lento para a rotina diária.
              </p>

              <ul className="space-y-2.5 text-xs">
                <li className="flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Instalação pesada de mais de 4GB (TeXLive / MiKTeX)</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Compilação lenta que trava o fluxo criativo de escrita</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Erros crípticos em dezenas de páginas de log indecifráveis</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Sintaxe verbosa com centenas de comandos e barras invertidas</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
              Resultado: Mais tempo brigando com pacotes do que pesquisando.
            </div>
          </div>

          {/* Card 3: RedijaApp + Typst WASM (Destaque Campeão) */}
          <div
            className={`p-6 rounded-2xl border-2 transition-all flex flex-col justify-between relative shadow-xl ${
              isDark
                ? 'bg-gradient-to-b from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/80 shadow-emerald-950/50'
                : 'bg-gradient-to-b from-emerald-50/80 via-white to-teal-50/40 border-emerald-500 shadow-emerald-600/10'
            }`}
          >
            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px] tracking-wide uppercase shadow-sm">
              A Escolha Moderna
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                <Sparkles className="w-5 h-5 shrink-0" />
                <h3>RedijaApp com Typst</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                O melhor dos dois mundos: editor visual humanizado com motor tipográfico de alta performance.
              </p>

              <ul className="space-y-2.5 text-xs font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-900 dark:text-white">
                    Interface em blocos estilo Notion: zero código obrigatório
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-900 dark:text-white">
                    Compilação Typst em &lt;50ms direto na CPU via WebAssembly
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-900 dark:text-white">
                    ABNT (9 NBRs), SBC, IEEE, APA 7ª, Pôsteres e Typst Universe com linters
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-900 dark:text-white">
                    Seus arquivos no seu próprio Google Drive e offline-first
                  </span>
                </li>
              </ul>
            </div>

            <div className="pt-4 mt-6 border-t border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
              Resultado: Concentração plena na sua pesquisa e aprovação sem sustos.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
