import React, { useState } from 'react';
import {
  GraduationCap,
  FileText,
  BookOpen,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Layers,
} from 'lucide-react';

interface LandingTemplatesProps {
  isDark: boolean;
  onSelectTemplate: () => void;
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
}

export const LandingTemplates: React.FC<LandingTemplatesProps> = ({
  isDark,
  onSelectTemplate,
}) => {
  const [activeTemplateId, setActiveTemplateId] = useState<string>('tcc');

  const templates: TemplateItem[] = [
    {
      id: 'tcc',
      title: 'TCC & Monografia',
      norm: 'ABNT NBR 14724',
      badge: 'Mais Utilizado',
      description:
        'Estrutura acadêmica completa para conclusão de curso de graduação ou especialização.',
      icon: <GraduationCap className="w-5 h-5 text-emerald-500" />,
      tags: ['Capa e Folha de Rosto', 'Banca Examinadora', 'Sumário Dinâmico'],
      elements: [
        'Capa e folha de rosto normativas',
        'Folha de aprovação para assinaturas da banca',
        'Dedicatória, agradecimentos e epígrafe',
        'Resumo (150 a 500 palavras) e Abstract em inglês',
        'Sumário, lista de figuras e tabelas automáticas',
        'Introdução, desenvolvimento, conclusão e referências NBR 6023',
      ],
    },
    {
      id: 'artigo',
      title: 'Artigo Científico',
      norm: 'ABNT NBR 6022',
      badge: 'Periódicos & Congressos',
      description:
        'Layout compacto e elegante para submissão em revistas acadêmicas, anais de congressos e eventos.',
      icon: <FileText className="w-5 h-5 text-teal-500" />,
      tags: ['1 ou 2 Colunas', 'Resumo Bilíngue', 'Notas de Rodapé'],
      elements: [
        'Título conciso em português e em língua estrangeira',
        'Autor(es) com filiação institucional e e-mail em nota de rodapé',
        'Resumo indicativo com palavras-chave separadas por ponto',
        'Desenvolvimento com seções numeradas (NBR 6024)',
        'Quadros e tabelas conforme regras do IBGE',
        'Referências finais com ordenação alfabética rigorosa',
      ],
    },
    {
      id: 'dissertacao',
      title: 'Dissertação & Tese',
      norm: 'Pós-Graduação Estrita',
      badge: 'Mestrado & Doutorado',
      description:
        'Trabalhos densos de pós-graduação com suporte a coorientador, ficha catalográfica e múltiplos apêndices.',
      icon: <BookOpen className="w-5 h-5 text-blue-500" />,
      tags: ['Ficha Catalográfica', 'Múltiplos Membros de Banca', 'Apêndices & Anexos'],
      elements: [
        'Suporte a Orientador e Coorientador',
        'Espaço reservado para ficha catalográfica no verso da folha de rosto',
        'Lista de abreviaturas, siglas e lista de símbolos',
        'Capítulos iniciando obrigatoriamente em nova página ímpar',
        'Numeração progressiva até a seção quinária (1.1.1.1.1)',
        'Apêndices (produção do autor) e Anexos (documentos externos)',
      ],
    },
    {
      id: 'relatorio',
      title: 'Relatório Técnico / PIBIC',
      norm: 'ABNT NBR 10719',
      badge: 'Iniciação & Estágio',
      description:
        'Ideal para prestações de contas de bolsas CNPq/FAPESP, relatórios de estágio obrigatório e diagnósticos.',
      icon: <ClipboardList className="w-5 h-5 text-amber-500" />,
      tags: ['PIBIC / PIBITI', 'Estágio Supervisionado', 'Quadros Técnicos'],
      elements: [
        'Identificação institucional formal e orientador supervisor',
        'Resumo executivo das atividades desenvolvidas',
        'Metodologia aplicada e cronograma de metas cumpridas',
        'Apresentação de resultados com gráficos e quadros fechados',
        'Considerações finais e recomendações técnicas',
      ],
    },
    {
      id: 'projeto',
      title: 'Projeto de Pesquisa',
      norm: 'ABNT NBR 15287',
      badge: 'Seleção de Mestrado',
      description:
        'Formulação estruturada de propostas de pesquisa científica para editais, seleções e submissões a comitês de ética.',
      icon: <Layers className="w-5 h-5 text-purple-500" />,
      tags: ['Cronograma de Execução', 'Orçamento', 'Problema & Hipótese'],
      elements: [
        'Definição clara de Tema, Problema e Hipóteses de pesquisa',
        'Objetivos gerais e objetivos específicos delimitados',
        'Justificativa teórica, prática e relevância acadêmica',
        'Quadro de cronograma detalhado de execução por bimestres',
        'Previsão de recursos materiais e orçamento estimado',
      ],
    },
  ];

  const current = templates.find((t) => t.id === activeTemplateId) || templates[0];

  return (
    <section id="modelos" className="py-20 sm:py-28 border-t border-slate-200/60 dark:border-slate-800/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Galeria de Modelos Prontos
          </span>
          <h2
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Escolha seu modelo e comece em menos de 1 minuto
          </h2>
          <p className={`text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Cada modelo já vem pré-configurado com a estrutura exata exigida pelas normas e universidades brasileiras.
          </p>
        </div>

        {/* Barra de Seleção de Abas dos Modelos */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {templates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setActiveTemplateId(tpl.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTemplateId === tpl.id
                  ? isDark
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isDark
                    ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tpl.title}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  activeTemplateId === tpl.id
                    ? 'bg-black/20 text-white'
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
          className={`max-w-4xl mx-auto p-6 sm:p-10 rounded-3xl border shadow-xl transition-all ${
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
                    {current.norm}
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

              <div className="pt-3">
                <button
                  onClick={onSelectTemplate}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                    isDark
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <span>Iniciar com este Modelo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
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
                <span>Estrutura Inclusa:</span>
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
