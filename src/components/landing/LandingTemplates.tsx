import React, { useState } from 'react';
import {
  GraduationCap,
  FileText,
  Cpu,
  Columns2,
  Presentation,
  Globe,
  SlidersHorizontal,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { POPULAR_UNIVERSE_TEMPLATES } from '@/core/universe/virtualPackage';

interface LandingTemplatesProps {
  isDark: boolean;
  onSelectTemplate: () => void;
  onOpenFullDocs?: (sectionId?: string) => void;
}

interface TemplateItem {
  id: string;
  title: string;
  norm: string;
  badge: string;
  description: string;
  icon: React.ReactNode;
  tags: string[];
  elements: string[];
  isUniverse?: boolean;
}

export const LandingTemplates: React.FC<LandingTemplatesProps> = ({
  isDark,
  onSelectTemplate,
  onOpenFullDocs,
}) => {
  const [activeTemplateId, setActiveTemplateId] = useState<string>('tcc');

  const templates: TemplateItem[] = [
    {
      id: 'tcc',
      title: 'TCC, Dissertação & Tese',
      norm: 'ABNT NBR 14724',
      badge: 'Graduação & Pós',
      description:
        'Estrutura acadêmica completa para monografias, dissertações de mestrado e teses de doutorado com margens 3-3-2-2 cm e pré-textuais completos.',
      icon: <GraduationCap className="w-5 h-5 text-emerald-500" />,
      tags: ['Capa e Folha de Rosto', 'Banca & Coorientador', 'Sumário Dinâmico'],
      elements: [
        'Capa, folha de rosto, folha de aprovação e dedicatória/agradecimentos',
        'Resumo (150–500 palavras), Abstract e listas automáticas',
        'Numeração progressiva até a 5ª seção (NBR 6024)',
        'Tabelas estatísticas IBGE e Quadros textuais fechados',
        'Verificador ABNT ativo com conformidade à NBR 10520:2023 vigente',
        'Apêndices, anexos e glossário opcionais',
      ],
    },
    {
      id: 'artigo',
      title: 'Artigo Científico ABNT',
      norm: 'ABNT NBR 6022',
      badge: 'Periódicos Nacionais',
      description:
        'Layout compacto para revistas e anais no Brasil, com alternância instantânea entre 1 ou 2 colunas no Template Customizer.',
      icon: <FileText className="w-5 h-5 text-teal-500" />,
      tags: ['1 ou 2 Colunas', 'Resumo Bilíngue', 'Referências NBR 6023'],
      elements: [
        'Cabeçalho direto na página 1 sem capa ou folha de rosto',
        'Autor(es) com filiação institucional em nota ou cabeçalho',
        'Resumo indicativo (100–250 palavras) com palavras-chave',
        'Desenvolvimento com seções numeradas e equações em bloco',
        'Quadros, gráficos e tabelas com legenda no topo e fonte na base',
        'Importação de referências por DOI, ISBN ou BibTeX (.bib)',
      ],
    },
    {
      id: 'sbc',
      title: 'Artigo SBC',
      norm: 'SBC Oficial',
      badge: 'Computação Brasil',
      description:
        'Padrão oficial da Sociedade Brasileira de Computação para eventos como CSBC, SBES, SBRC e SBSI, com barra lateral e linter dedicados.',
      icon: <Cpu className="w-5 h-5 text-cyan-500" />,
      tags: ['CSBC / SBES / SBRC', 'Resumo & Abstract', 'Verificador SBC'],
      elements: [
        'Margens oficiais SBC (3,5 cm sup., 3,0 cm lat., 2,5 cm inf.)',
        'Cabeçalho centralizado com autores, departamento e e-mails',
        'Blocos bilíngues de Resumo em português e Abstract em inglês',
        'Seções objetivas no formato típico dos simpósios de computação',
        'Referências padronizadas e conferidas pelo Verificador SBC',
        'Manual de Submissão SBC acessível direto na barra lateral',
      ],
    },
    {
      id: 'ieee',
      title: 'IEEE Conference',
      norm: 'IEEE Two-Column',
      badge: 'Conferências Internacionais',
      description:
        'Diagramação em duas colunas (10 pt serif) com seções romanas, citações numéricas [1] e diretrizes internacionais da IEEE.',
      icon: <Columns2 className="w-5 h-5 text-indigo-500" />,
      tags: ['Duas Colunas', 'Citações [1], [2]', 'Verificador IEEE'],
      elements: [
        'Margens oficiais compactas IEEE (1,9 / 2,54 / 1,57 cm)',
        'Seções principais em algarismos romanos (I. Introduction) e subseções em itálico',
        'Blocos dedicados para Abstract técnico e Index Terms',
        'Sistema automático de chamadas numéricas [1] em ordem de citação',
        'Verificador IEEE para tamanho do Abstract (100–250 palavras) e legendas Fig./TABLE',
        'Diretrizes de Publicação IEEE integradas no painel lateral',
      ],
    },
    {
      id: 'poster',
      title: 'Pôster Científico A0/A1',
      norm: 'Banner A0 / A1',
      badge: 'Mostras & Congressos',
      description:
        'Banner de grande formato configurável em 2 ou 3 colunas, orientação retrato ou paisagem e paletas institucionais prontas.',
      icon: <Presentation className="w-5 h-5 text-emerald-500" />,
      tags: ['A0 / A1 / A2', '2 ou 3 Colunas', 'Verificador Pôster'],
      elements: [
        'Cabeçalho superior de alto contraste com título, autores e afiliação',
        'Blocos em caixas visuais equilibradas para leitura a 1–2 metros',
        'Personalização de dimensões, orientação e paleta em 1 clique',
        'Verificador Pôster monitorando concisão textual (ideal <= 800 palavras)',
        'Preservação automática de seções visuais, tabelas e gráficos',
        'Exportação vetorial em alta definição pronta para gráfica',
      ],
    },
    {
      id: 'apa_livre',
      title: 'APA 7ª Edição & Livre',
      norm: 'APA 7ª / Custom',
      badge: 'Flexibilidade Máxima',
      description:
        'Use o preset internacional APA 7ª Edição ou parta de um documento 100% livre configurando tipografia, margens, citações e campos.',
      icon: <SlidersHorizontal className="w-5 h-5 text-violet-500" />,
      tags: ['Entrelinha 2,0', '(Autor, Ano)', 'Customizer 5 Abas'],
      elements: [
        'Preset APA 7ª com margens 2,54 cm, entrelinha dupla e títulos em itálico',
        '5 estilos de citação reativos (Caixa Alta, Caixa Mista, [1], Sobrescrito ¹ e APA)',
        'Fontes offline (Tinos/Arimo) ou sob demanda via CDN (Inter, Garamond, Charter)',
        'Oculte ou exiba campos na aba lateral mantendo rascunhos na gaveta segura',
        'Troca de modo transparente para ABNT Modificado ao customizar regras',
        'Verificador de Integridade (Sanity Linter) protegendo referências e imagens',
      ],
    },
    {
      id: 'relatorio_projeto',
      title: 'Relatório & Projeto',
      norm: 'NBR 10719 / 15287',
      badge: 'PIBIC & Qualificação',
      description:
        'Modelos dedicados para relatórios técnicos, estágio obrigatório, iniciação científica (PIBIC) e projetos de pesquisa de pós-graduação.',
      icon: <ClipboardList className="w-5 h-5 text-amber-500" />,
      tags: ['Estágio & PIBIC', 'Cronograma', 'Problema & Hipótese'],
      elements: [
        'Relatório Técnico (NBR 10719) para bolsas CNPq/FAPESP e estágios',
        'Projeto de Pesquisa (NBR 15287) para seleções e comitês de ética',
        'Seções pré-estruturadas para Tema, Problema, Hipóteses e Objetivos',
        'Quadros de cronograma de atividades e previsão orçamentária',
        'Metadados institucionais adaptados automaticamente ao documento',
      ],
    },
    {
      id: 'universe',
      title: 'Typst Universe',
      norm: '@preview/...',
      badge: 'Loja Oficial Comunitária',
      description:
        'Conecte templates externos direto da loja oficial Typst Universe pelo identificador do pacote (ex.: @preview/charged-ieee:0.1.4) com resolução automática e fallback offline.',
      icon: <Globe className="w-5 h-5 text-sky-500" />,
      tags: ['Catálogo @preview/...', 'Importador .typ/.zip', 'Fallback Offline'],
      isUniverse: true,
      elements: [
        'Conexão direta com pacotes comunitários do Typst Universe via typst.app/universe',
        'Sugestões em 1 clique já prontas no seletor de projetos e no Customizer',
        'Suporte a entrada personalizada de namespace, versão e entrypoint (#show)',
        'Compilação via pacote virtual local quando estiver trabalhando sem internet',
        'Importe também projetos prontos (.typ / .zip) que já utilizem #import "@preview/..."',
      ],
    },
  ];

  const current = templates.find((t) => t.id === activeTemplateId) || templates[0];

  return (
    <section
      id="modelos"
      className="py-20 sm:py-28 border-t border-slate-200/60 dark:border-slate-800/60 relative"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Galeria de Modelos Prontos &amp; Typst Universe
          </span>
          <h2
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Do TCC à conferência internacional — escolha seu modelo
          </h2>
          <p className={`text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Além das normas brasileiras (ABNT e SBC), redija artigos IEEE, periódicos APA 7ª Edição, pôsteres A0/A1 ou importe qualquer pacote da loja oficial Typst Universe.
          </p>
        </div>

        {/* Barra de Seleção de Abas dos Modelos */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => setActiveTemplateId(tpl.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                activeTemplateId === tpl.id
                  ? isDark
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isDark
                    ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tpl.title}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  activeTemplateId === tpl.id
                    ? isDark
                      ? 'bg-black/20 text-slate-950 font-bold'
                      : 'bg-black/20 text-white'
                    : isDark
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tpl.norm}
              </span>
            </button>
          ))}
        </div>

        {/* Visualização Detalhada do Modelo Ativo */}
        <div
          className={`max-w-5xl mx-auto p-6 sm:p-10 rounded-3xl border shadow-xl transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Lado Esquerdo: Resumo do Modelo */}
            <div className="md:col-span-7 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {current.icon}
                </div>
                <div>
                  <span className="text-[11px] font-mono font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                    {current.norm} • {current.badge}
                  </span>
                  <h3
                    className={`text-2xl font-bold tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {current.title}
                  </h3>
                </div>
              </div>

              <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {current.description}
              </p>

              {/* Tags de Destaque */}
              <div className="flex flex-wrap gap-2 pt-1">
                {current.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                      isDark
                        ? 'border-slate-800 bg-slate-950/60 text-slate-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Destaque especial de pacotes populares do Typst Universe */}
              {current.isUniverse && (
                <div
                  className={`p-3.5 rounded-2xl border space-y-2 ${
                    isDark
                      ? 'bg-slate-950/70 border-sky-500/30'
                      : 'bg-sky-50/70 border-sky-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                    <span className={isDark ? 'text-sky-300' : 'text-sky-900'}>
                      Pacotes populares disponíveis direto no seletor:
                    </span>
                    <a
                      href="https://typst.app/universe"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
                    >
                      <span>typst.app/universe</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_UNIVERSE_TEMPLATES.map((pkg) => (
                      <span
                        key={pkg.id}
                        className={`text-[10.5px] font-mono px-2 py-0.5 rounded border ${
                          isDark
                            ? 'bg-slate-900 border-slate-800 text-slate-200'
                            : 'bg-white border-sky-200 text-slate-700'
                        }`}
                        title={pkg.description}
                      >
                        {pkg.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onSelectTemplate}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                    isDark
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <span>
                    {current.isUniverse ? 'Importar do Typst Universe' : 'Iniciar com este Modelo'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
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
                    Ver documentação de modelos &rarr;
                  </a>
                )}
              </div>
            </div>

            {/* Lado Direito: Elementos Inclusos */}
            <div
              className={`md:col-span-5 p-5 rounded-2xl border space-y-3 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>{current.isUniverse ? 'Recursos da Integração:' : 'Estrutura Inclusa:'}</span>
              </h4>

              <ul className="space-y-2 text-xs">
                {current.elements.map((el, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{el}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
