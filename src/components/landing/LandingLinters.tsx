import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  BookOpen,
  Cpu,
  Globe,
  PauseCircle,
  Presentation,
  FileText,
  GraduationCap,
} from 'lucide-react';

interface LandingLintersProps {
  isDark: boolean;
  onSelectTemplate: () => void;
  onOpenFullDocs?: (sectionId?: string) => void;
}

interface LinterShowcaseItem {
  id: string;
  label: string;
  badge: string;
  strategyTitle: string;
  guideLabel: string;
  summary: string;
  imageLightSrc: string;
  imageDarkSrc: string;
  imageAlt: string;
  caption: string;
  icon: React.ReactNode;
  checks: string[];
}

const LINTER_ITEMS: LinterShowcaseItem[] = [
  {
    id: 'abnt',
    label: 'ABNT (TCC & Artigos)',
    badge: 'Verificador ABNT',
    strategyTitle: 'Conformidade NBR 14724, 10520, 6023 & 6028',
    guideLabel: 'Guia de Normas ABNT',
    summary:
      'Audita em tempo real os requisitos das 9 normas ABNT suportadas, diferenciando automaticamente faixas de TCC/Monografia e de Artigo NBR 6022.',
    imageLightSrc: '/images/linters/linter-abnt-light.png',
    imageDarkSrc: '/images/linters/linter-abnt-dark.png',
    imageAlt:
      'Recorte real do painel Verificador ABNT mostrando selo NBR 14724, diagnóstico de resumo e botão do Guia de Normas ABNT',
    caption: 'Recorte do painel lateral com selo NBR 14724 e diagnóstico do Verificador ABNT',
    icon: <GraduationCap className="w-4 h-4" />,
    checks: [
      'Faixa recomendada do Resumo (150–500 palavras para TCC/Tese; 100–250 para artigos)',
      'Presença de palavras-chave e estrutura obrigatória de referências (NBR 6023)',
      'Validação de legenda superior e fonte inferior em figuras, tabelas e quadros (IBGE)',
      'Cruzamento automático entre citações no texto (@) e obras não citadas',
    ],
  },
  {
    id: 'sbc',
    label: 'Artigo SBC',
    badge: 'Verificador SBC',
    strategyTitle: 'Sociedade Brasileira de Computação (CSBC / SBES)',
    guideLabel: 'Manual de Submissão SBC',
    summary:
      'Adapta a barra lateral para o formato oficial de simpósios da SBC: oculta pré-textuais de TCC e verifica exatamente o que o evento exige.',
    imageLightSrc: '/images/linters/linter-sbc-light.png',
    imageDarkSrc: '/images/linters/linter-sbc-dark.png',
    imageAlt:
      'Recorte real do painel Verificador SBC mostrando selo SBC, alerta de citação ausente e acesso ao Manual de Submissão SBC',
    caption: 'Verificador SBC monitorando referências citadas e disponibilizando o Manual da SBC',
    icon: <Cpu className="w-4 h-4" />,
    checks: [
      'Verifica Resumo conciso em português (até 150–200 palavras) e Abstract em inglês',
      'Checa palavras-chave e limite sugerido de extensão para artigos completos (~5.000 palavras)',
      'Exige legenda numerada em figuras, tabelas e quadros sem cobrar folha de aprovação',
      'Garante que toda obra na bibliografia final possua chamada correspondente no texto',
    ],
  },
  {
    id: 'ieee',
    label: 'IEEE Conference',
    badge: 'Verificador IEEE',
    strategyTitle: 'IEEE Two-Column Conference Standards',
    guideLabel: 'Diretrizes de Publicação IEEE',
    summary:
      'Substitui checagens brasileiras por regras internacionais da IEEE: Abstract em inglês, Index Terms, citações numéricas [1] e legendas Fig./TABLE.',
    imageLightSrc: '/images/linters/linter-ieee-light.png',
    imageDarkSrc: '/images/linters/linter-ieee-dark.png',
    imageAlt:
      'Recorte real do painel Verificador IEEE mostrando selo IEEE, alertas de Abstract e References [n] e botão de Diretrizes IEEE',
    caption: 'Verificador IEEE auditando tamanho do Abstract e referências numéricas [n]',
    icon: <FileText className="w-4 h-4" />,
    checks: [
      'Audita o Abstract técnico na faixa recomendada de 100 a 250 palavras',
      'Valida a presença e quantidade ideal de descritores (3 a 5 Index Terms)',
      'Acompanha o estilo de chamadas numéricas [1], [2] em ordem de citação',
      'Verifica legendas de figuras ("Fig.") e títulos de tabelas ("TABLE") sem falsos positivos de ABNT',
    ],
  },
  {
    id: 'poster',
    label: 'Pôster A0 / A1',
    badge: 'Verificador Pôster',
    strategyTitle: 'Boas Práticas para Banners Científicos',
    guideLabel: 'Boas Práticas de Pôster Científico',
    summary:
      'Em vez de exigir dezenas de páginas de texto, valida síntese visual e legibilidade para apresentação em congressos e mostras científicas.',
    imageLightSrc: '/images/linters/linter-poster-light.png',
    imageDarkSrc: '/images/linters/linter-poster-dark.png',
    imageAlt:
      'Recorte real do painel Verificador Pôster com aprovação em verde e selo Pôster A0/A1',
    caption: 'Verificador Pôster exibindo aprovação em verde e guia de boas práticas visuais',
    icon: <Presentation className="w-4 h-4" />,
    checks: [
      'Confirma título, autoria e afiliação completos para destaque no banner superior',
      'Monitora densidade textual (ideal até 800 palavras) para leitura rápida a 1–2 metros',
      'Incentiva a inclusão de ao menos um elemento visual (gráfico, figura, quadro ou tabela)',
      'Identifica citações quebradas sem obrigar campos pré-textuais de monografia',
    ],
  },
  {
    id: 'abnt_modified',
    label: 'ABNT Modificado',
    badge: 'Pausado + Integridade',
    strategyTitle: 'Transparência ao Personalizar Normas ou Campos',
    guideLabel: 'Guia de Normas ABNT',
    summary:
      'Alterou margens, ocultou capa ou personalizou campos da barra lateral? O linter pausa a cobrança estrita sem inundar você de avisos falsos.',
    imageLightSrc: '/images/linters/linter-abnt-modified-light.png',
    imageDarkSrc: '/images/linters/linter-abnt-modified-dark.png',
    imageAlt:
      'Recorte real do painel lateral exibindo o selo âmbar ABNT Modificado e o card Verificador ABNT (Pausado)',
    caption: 'Selo ABNT Modificado e Verificador ABNT (Pausado) após personalizar a estrutura padrão',
    icon: <PauseCircle className="w-4 h-4" />,
    checks: [
      'Muda automaticamente o selo da barra lateral para "ABNT Modificado"',
      'Exibe o status "Verificador ABNT (Pausado)" preservando liberdade editorial da instituição',
      'Mantém ativas as checagens essenciais de integridade (Sanity Linter) no documento',
      'Permite restaurar o padrão original em 1 clique com zero perda dos dados digitados',
    ],
  },
  {
    id: 'universe',
    label: 'Typst Universe & Livre',
    badge: 'Sanity Linter',
    strategyTitle: 'Verificador Universal para Pacotes @preview/...',
    guideLabel: 'Dicas de Diagramação e Boas Práticas',
    summary:
      'Mesmo ao importar pacotes externos da loja oficial Typst Universe ou usar documentos APA 7ª / Livres, um verificador universal protege a integridade do PDF.',
    imageLightSrc: '/images/linters/linter-universe-light.png',
    imageDarkSrc: '/images/linters/linter-universe-dark.png',
    imageAlt:
      'Recorte real do Verificador de Integridade ativo para pacotes do Typst Universe com selo aprovado em verde',
    caption: 'Verificador de Integridade universal validando documento baseado em pacote externo',
    icon: <Globe className="w-4 h-4" />,
    checks: [
      'Garante presença de título, autoria e corpo de conteúdo antes da exportação',
      'Verifica imagens sem legenda e citações diretas longas sem atribuição de autoria',
      'Detecta citações órfãs quebradas no editor sem impor regras fechadas de norma única',
      'Integra-se perfeitamente a pacotes @preview/... e à configuração APA 7ª Edição',
    ],
  },
];

export const LandingLinters: React.FC<LandingLintersProps> = ({
  isDark,
  onSelectTemplate,
  onOpenFullDocs,
}) => {
  const [activeId, setActiveId] = useState<string>('abnt');
  const current = LINTER_ITEMS.find((item) => item.id === activeId) ?? LINTER_ITEMS[0];

  return (
    <section
      id="linters"
      className="py-20 sm:py-28 border-t border-slate-200/60 dark:border-slate-800/60 relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Linters Contextuais em Tempo Real
          </span>
          <h2
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Um verificador inteligente para cada padrão
          </h2>
          <p className={`text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Ao trocar entre ABNT, SBC, IEEE, Pôster A0/A1 ou pacotes do Typst Universe, a barra lateral altera automaticamente as regras auditadas e exibe capturas e diagnósticos fiéis ao modelo escolhido.
          </p>
        </div>

        {/* Seletor de Modelos / Estratégias de Linter */}
        <div
          role="tablist"
          aria-label="Selecionar modelo de linter para visualização"
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5"
        >
          {LINTER_ITEMS.map((item) => {
            const isActive = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveId(item.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : isDark
                      ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                      : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cartão Principal: Detalhes Técnicos + Screenshot Real */}
        <div
          className={`rounded-3xl border shadow-xl overflow-hidden transition-colors ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 p-6 sm:p-8 items-center">
            {/* Esquerda: O que este linter verifica */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{current.badge}</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/60 text-slate-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  <BookOpen className="w-3 h-3 text-emerald-500" />
                  <span>{current.guideLabel}</span>
                </span>
              </div>

              <div className="space-y-2">
                <h3
                  className={`text-xl sm:text-2xl font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {current.strategyTitle}
                </h3>
                <p
                  className={`text-xs sm:text-sm leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {current.summary}
                </p>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-[13px]">
                {current.checks.map((rule, idx) => (
                  <li
                    key={idx}
                    className={`flex items-start gap-2 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onSelectTemplate}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
                    isDark
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <span>Testar Linter no Editor</span>
                </button>
                {onOpenFullDocs && (
                  <a
                    href="/docs#templates-internacionais"
                    onClick={(e) => {
                      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                        e.preventDefault();
                        onOpenFullDocs('templates-internacionais');
                      }
                    }}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Ver regras na Documentação &rarr;
                  </a>
                )}
              </div>
            </div>

            {/* Direita: Recorte Focado Real da Barra do Verificador */}
            <div className="lg:col-span-6 flex justify-center">
              <div
                className={`w-full max-w-[430px] rounded-2xl border overflow-hidden shadow-lg ${
                  isDark
                    ? 'border-slate-800 bg-[#0f172a] shadow-black/70'
                    : 'border-slate-200 bg-white shadow-slate-200/80'
                }`}
              >
                <div
                  className={`px-3.5 py-2 border-b flex items-center justify-between gap-2 text-[11px] ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80 shrink-0" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 shrink-0" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 shrink-0" />
                    <span className="ml-2 font-mono font-medium truncate">
                      Painel Lateral • {current.badge}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] shrink-0">
                    Tempo Real
                  </span>
                </div>

                <div className={isDark ? 'bg-[#1e293b]' : 'bg-white'}>
                  <img
                    src={isDark ? current.imageDarkSrc : current.imageLightSrc}
                    alt={current.imageAlt}
                    className="w-full h-auto block"
                  />
                </div>

                <div
                  className={`px-3.5 py-2 text-[11px] border-t ${
                    isDark
                      ? 'bg-slate-900/90 border-slate-800 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {current.caption}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
