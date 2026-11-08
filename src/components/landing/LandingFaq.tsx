import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface LandingFaqProps {
  isDark: boolean;
}

interface FaqItem {
  question: string;
  answer: string;
}

export const LandingFaq: React.FC<LandingFaqProps> = ({ isDark }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: 'O Redija é realmente 100% gratuito? Tem pegadinhas ou limites?',
      answer:
        'Sim, o Redija é 100% gratuito e de código aberto! Não existem limites de páginas, limites de projetos, período de teste ou marcas d\'água no PDF exportado. O projeto foi construído para democratizar a produção científica no Brasil.',
    },
    {
      question: 'O que é o motor Typst e por que ele substitui o Word e o LaTeX?',
      answer:
        'Typst é um motor moderno de tipografia escrito em Rust projetado como sucessor do LaTeX. Ao contrário do Word (que quebra margens facilmente) e do LaTeX (que é lento e complexo), o Typst roda em WebAssembly diretamente na sua máquina, gerando PDFs com qualidade editorial em meros 30 milissegundos enquanto você digita.',
    },
    {
      question: 'Onde meus trabalhos ficam armazenados? Vocês têm acesso aos meus textos?',
      answer:
        'Não! Nós acreditamos na soberania total de dados do pesquisador (Bring Your Own Storage). Seus arquivos ficam salvos diretamente na sua conta pessoal do Google Drive (em Meu Drive > RedijaApp) e no cache do seu computador (IndexedDB). Não temos acesso ao conteúdo das suas pesquisas.',
    },
    {
      question: 'Posso usar o Redija sem conexão com a internet (offline)?',
      answer:
        'Sim! A arquitetura do Redija é Local-First. Todo o motor de compilação Typst e o banco de dados funcionam 100% no cliente. Você pode escrever no avião ou sem sinal de rede; assim que sua conexão voltar, o app sincroniza as alterações com seu Google Drive.',
    },
    {
      question: 'O Redija já atende à atualização recente da NBR 10520:2023 de citações?',
      answer:
        'Sim! O Redija permite escolher nas configurações entre o estilo tradicional em letras maiúsculas (SILVA, 2024) ou a recomendação atualizada da ABNT NBR 10520:2023 em caixa mista (Silva, 2024). Além disso, o recuo de 4 cm para citações com mais de 3 linhas é aplicado automaticamente.',
    },
    {
      question: 'Meu orientador ou colega precisa instalar algo para colaborar?',
      answer:
        'Nada precisa ser instalado. A colaboração acontece diretamente pelo navegador via WebRTC P2P (Peer-to-Peer). Além disso, como o Redija gera automaticamente uma cópia em PDF legível no seu Google Drive, você pode enviar o link do PDF diretamente para orientadores que preferem ler em dispositivos móveis.',
    },
    {
      question: 'Se eu quiser compilar no meu terminal ou no Overleaf, eu posso?',
      answer:
        'Com certeza! O Redija oferece exportação em 1 clique do pacote ZIP completo do projeto contendo main.typ, abnt.typ, figuras e arquivo de referências BibTeX (.bib). Você é o dono absoluto do seu código.',
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-20 sm:py-28 border-t border-slate-200/60 dark:border-slate-800/60 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Perguntas Frequentes
          </span>
          <h2
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Tire suas dúvidas sobre o Redija
          </h2>
          <p className={`text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Tudo o que você precisa saber sobre privacidade, ABNT, Typst e uso diário.
          </p>
        </div>

        {/* Lista Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? isDark
                      ? 'bg-slate-900 border-slate-700 shadow-md'
                      : 'bg-white border-slate-300 shadow-sm'
                    : isDark
                      ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                      : 'bg-white/80 border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 transition-colors"
                >
                  <span
                    className={`font-semibold text-sm sm:text-base leading-snug ${
                      isOpen
                        ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                        : isDark
                          ? 'text-slate-200'
                          : 'text-slate-800'
                    }`}
                  >
                    {faq.question}
                  </span>
                  <div
                    className={`p-1.5 rounded-full transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 bg-emerald-500/10 text-emerald-500' : 'text-slate-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    className={`px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm leading-relaxed border-t border-slate-100 dark:border-slate-800/80 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
