import React from 'react';
import { MousePointerClick, Edit3, CheckCircle2, Sparkles } from 'lucide-react';

interface LandingWorkflowProps {
  isDark: boolean;
}

export const LandingWorkflow: React.FC<LandingWorkflowProps> = ({ isDark }) => {
  const steps = [
    {
      number: '01',
      title: 'Escolha um Padrão ou Importe',
      description:
        'Crie com 1 clique em ABNT, SBC, IEEE, APA 7ª, Pôster A0/A1 ou pacotes @preview/... do Typst Universe — ou importe rascunhos do Word (.docx), LaTeX/Overleaf (.tex/.zip) e Typst (.typ).',
      icon: <MousePointerClick className="w-6 h-6 text-emerald-500" />,
      detail: 'Zero configuração inicial necessária',
    },
    {
      number: '02',
      title: 'Escreva com Blocos e Linters',
      description:
        'Use "/" para inserir citações longas, tabelas IBGE e equações, e "@" para chamadas dinâmicas. O verificador (linter) da barra lateral audita as regras exatas do modelo escolhido em tempo real.',
      icon: <Edit3 className="w-6 h-6 text-teal-500" />,
      detail: 'Citações e referências automáticas por DOI e ISBN',
    },
    {
      number: '03',
      title: 'Exporte PDF Vetorial ou Código',
      description:
        'Veja o PDF compilado em milissegundos via WebAssembly. Baixe o PDF final pronto para publicação ou leve o pacote completo (.zip com fontes .typ e .bib) sem qualquer bloqueio.',
      icon: <CheckCircle2 className="w-6 h-6 text-blue-500" />,
      detail: 'Conformidade e soberania no Google Drive (BYOS)',
    },
  ];

  return (
    <section id="como-funciona" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Fluxo de Trabalho Descomplicado
          </span>
          <h2
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Como funciona na prática em 3 passos
          </h2>
          <p className={`text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Da primeira linha até o envio para a banca examinadora, sem estresse e sem retrabalho.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`p-8 rounded-3xl border transition-all relative flex flex-col justify-between group hover:-translate-y-1 ${
                isDark
                  ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {step.icon}
                  </div>
                  <span className="font-mono text-3xl font-extrabold text-slate-300 dark:text-slate-700 group-hover:text-emerald-500/50 transition-colors">
                    {step.number}
                  </span>
                </div>

                <h3
                  className={`text-xl font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {step.title}
                </h3>

                <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {step.description}
                </p>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{step.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
