import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Cpu,
  HardDrive,
  FileCheck2,
  Sparkles,
  BookOpenCheck,
  ShieldCheck,
  Globe,
  FileCode2,
  Presentation,
  Compass,
} from 'lucide-react';
import type { ContextualGuideMode } from '@/core/templates/templateCapabilities';

export type WelcomeModalTab = 'overview' | ContextualGuideMode;

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: WelcomeModalTab;
}

interface StandardDocSection {
  code: string;
  title: string;
  summary: string;
  rulesApplied: string[];
}

const ABNT_STANDARDS_DOCS: StandardDocSection[] = [
  {
    code: 'ABNT NBR 14724',
    title: 'Trabalhos Acadêmicos: Apresentação (TCC, Monografias, Dissertações e Teses)',
    summary:
      'Define toda a estrutura física do trabalho (elementos pré-textuais, textuais e pós-textuais), margens, paginação e ilustrações.',
    rulesApplied: [
      'Formato A4 com margens padrão: 3 cm (superior e esquerda) e 2 cm (inferior e direita).',
      'Fonte tamanho 12 pt para o texto geral e 10 pt para citações longas, notas de rodapé, legendas e fontes de figuras/tabelas.',
      'Espaçamento 1,5 entre linhas no corpo do texto e espaçamento simples (1,0) em resumos, citações longas, notas e referências.',
      'Contagem de páginas iniciada na Folha de Rosto, mas com numeração impressa no canto superior direito somente a partir da primeira folha textual.',
      'Estrutura completa: Capa, Folha de Rosto (com natureza recuada), Folha de Aprovação (Banca Examinadora), Dedicatória, Agradecimentos, Epígrafe, Listas automáticas (Ilustrações, Quadros, Tabelas, Siglas, Símbolos), Glossário, Apêndices e Anexos.',
    ],
  },
  {
    code: 'ABNT NBR 10520 (2002 e atualização 2023)',
    title: 'Citações em Documentos',
    summary:
      'Regulamenta as chamadas de autores no texto e a diagramação de citações diretas curtas, longas e indiretas.',
    rulesApplied: [
      'Citação direta longa (mais de 3 linhas) com recuo esquerdo de 4 cm, fonte 10 pt, espaçamento simples e sem aspas.',
      'Suporte tanto ao padrão tradicional em maiúsculas (SILVA, 2023) quanto à atualização NBR 10520:2023 em caixa mista entre parênteses (Silva, 2023).',
      'Formatação automática de múltiplos autores (até 3 separados por ponto e vírgula, e 4 ou mais abreviados com et al.) e destaque automático em itálico para expressões latinas como et al. e apud.',
      'Inserção rápida de chamadas pelo atalho "@" ou pelo comando "/" direto no parágrafo.',
    ],
  },
  {
    code: 'ABNT NBR 6023',
    title: 'Referências: Elaboração',
    summary:
      'Estabelece a ordem dos elementos e a formatação da lista final de referências bibliográficas.',
    rulesApplied: [
      'Referências alinhadas exclusivamente à esquerda (sem justificar), em espaçamento simples e separadas entre si por um espaço simples em branco.',
      'Ordenação alfabética automática pelo sobrenome do primeiro autor e abreviação normativa com et al. em itálico para obras com 4 ou mais autores.',
      'Formatação específica para Livros, Artigos de Periódicos, Teses/Dissertações/TCCs, Sites e Legislação, com importação automática por DOI, ISBN e arquivos BibTeX (.bib).',
    ],
  },
  {
    code: 'ABNT NBR 6024',
    title: 'Numeração Progressiva das Seções de um Documento',
    summary:
      'Padroniza a hierarquia e o destaque tipográfico dos títulos de capítulos e subseções (da seção primária à quinária).',
    rulesApplied: [
      'Numeração automática em 5 níveis (1, 1.1, 1.1.1, 1.1.1.1 e 1.1.1.1.1) sem ponto final após o número.',
      'Diferenciação tipográfica graduada: Seção 1 em MAIÚSCULAS e negrito (iniciando em nova página nos TCCs), Seção 1.1 em negrito, Seção 1.1.1 em itálico, Seção 1.1.1.1 sublinhada e Seção 1.1.1.1.1 regular.',
      'Suporte a títulos sem indicação numérica centralizados (Errata, Agradecimentos, Resumo, Referências, Glossário, Apêndices e Anexos).',
    ],
  },
  {
    code: 'ABNT NBR 6027',
    title: 'Sumário',
    summary:
      'Regras para geração do sumário refletindo fielmente a hierarquia e paginação das seções do trabalho.',
    rulesApplied: [
      'Geração 100% automática do Sumário espelhando os números, títulos e páginas exatas de todas as seções.',
    ],
  },
  {
    code: 'ABNT NBR 6028',
    title: 'Resumo, Resumo Crítico e Resumo Indicativo',
    summary:
      'Determina a apresentação do Resumo em língua vernácula e em língua estrangeira (Abstract).',
    rulesApplied: [
      'Diagramação em parágrafo único, espaçamento simples, seguido das Palavras-chave separadas por ponto.',
      'Contador de palavras em tempo real com verificação da faixa recomendada (150 a 500 palavras para trabalhos acadêmicos).',
    ],
  },
  {
    code: 'ABNT NBR 6022 e Normas IBGE de Tabulação',
    title: 'Artigos em Publicações Periódicas e Apresentação Tabular (IBGE)',
    summary:
      'Diretrizes para artigos científicos (1 ou 2 colunas) e diferenciação entre Tabelas estatísticas e Quadros textuais.',
    rulesApplied: [
      'Tabelas estatísticas abertas nas laterais esquerda e direita (norma IBGE) com título no topo e fonte na base.',
      'Quadros textuais fechados nos 4 lados com listagem própria separada da Lista de Tabelas.',
    ],
  },
  {
    code: 'ABNT NBR 15287',
    title: 'Projeto de Pesquisa: Apresentação',
    summary:
      'Estrutura padronizada para submissão de projetos de TCC, mestrado, doutorado e iniciação científica.',
    rulesApplied: [
      'Atendido pela estrutura pré-textual (Capa, Folha de Rosto, Sumário) e seções numeradas para Tema, Problema, Hipótese, Objetivos, Justificativa, Referencial Teórico, Metodologia, Recursos e Cronograma (em Quadros ABNT).',
    ],
  },
  {
    code: 'ABNT NBR 10719',
    title: 'Relatório Técnico e/ou Científico: Apresentação',
    summary:
      'Diretrizes para relatórios de estágio supervisionado, iniciação científica (PIBIC) e relatórios técnicos.',
    rulesApplied: [
      'Predefinição dedicada em "Norma & Layout" com estrutura formal de capa, folha de rosto, resumo, listas técnicas, desenvolvimento e anexos.',
    ],
  },
];

const IEEE_GUIDELINES_DOCS: StandardDocSection[] = [
  {
    code: 'IEEE • Estrutura & Colunas',
    title: 'Diagramação de Artigos para Conferências IEEE (Two-Column)',
    summary:
      'Padrão internacional adotado em conferências de engenharia elétrica, eletrônica, telecomunicações e ciência da computação.',
    rulesApplied: [
      'Corpo do texto em 2 colunas (10 pt, fonte serifada), com título centralizado em destaque no topo da primeira página.',
      'Margens compactas oficiais: 1,9 cm superior, 2,54 cm inferior e 1,57 cm nas laterais.',
      'Seções principais em algarismos romanos (I. INTRODUCTION) e subseções alfabéticas em itálico.',
    ],
  },
  {
    code: 'IEEE • Abstract & Index Terms',
    title: 'Resumo Técnico e Descritores em Inglês',
    summary:
      'Conferências internacionais exigem Abstract objetivo entre 100 e 250 palavras em bloco contínuo seguido de Index Terms.',
    rulesApplied: [
      'Preencha os campos Abstract e Index Terms na aba lateral (sem necessidade de capa, folha de rosto ou sumário).',
      'Evite equações complexas, siglas não definidas e citações dentro do Abstract.',
    ],
  },
  {
    code: 'IEEE • Citações Numéricas [1]',
    title: 'Sistema Numérico de Referências e Chamadas',
    summary:
      'Diferente do autor-data tradicional brasileiro, o estilo IEEE referencia trabalhos por colchetes numerados.',
    rulesApplied: [
      'Configure o modo Numérico [1] na Central de Citações (já ativo por padrão ao criar artigos IEEE).',
      'Use o atalho "@" no editor para inserir chamadas [1], [2] sincronizadas com a ordem bibliográfica.',
    ],
  },
];

const SBC_GUIDELINES_DOCS: StandardDocSection[] = [
  {
    code: 'SBC • Formato Oficial de Simpósios',
    title: 'Sociedade Brasileira de Computação (Artigos Completos e Resumidos)',
    summary:
      'Padrão oficial brasileiro utilizado no CSBC, SBES, SBRC, SBSI e workshops da SBC.',
    rulesApplied: [
      'Margens oficiais SBC: superior 3,5 cm, laterais 3,0 cm e inferior 2,5 cm em coluna única (12 pt, entrelinha simples).',
      'Cabeçalho direto na página 1 com título, autores, afiliação institucional e blocos bilíngues (Resumo e Abstract).',
      'Recomenda-se manter Resumo e Abstract concisos (tipicamente entre 50 e 200 palavras).',
    ],
  },
  {
    code: 'SBC • Seções & Referências',
    title: 'Organização Textual e Bibliografia',
    summary:
      'Alinhamento com recomendações clássicas da computação no Brasil.',
    rulesApplied: [
      'Seções numeradas objetivas (1. Introdução, 2. Trabalhos Relacionados, 3. Metodologia, 4. Resultados, 5. Conclusão).',
      'Referências justificadas ou à esquerda configuráveis em "Layout das Referências e Citações".',
    ],
  },
];

const POSTER_GUIDELINES_DOCS: StandardDocSection[] = [
  {
    code: 'Pôster Científico • Dimensões A0 / A1',
    title: 'Apresentação Visual em Congressos e Feiras de Iniciação Científica',
    summary:
      'Projetado para leitura rápida a 1–2 metros de distância, priorizando síntese visual, gráficos e resultados.',
    rulesApplied: [
      'Configure dimensão (A0, A1 ou A2), orientação (retrato/paisagem), 2 ou 3 colunas e paleta institucional em "Norma & Layout".',
      'Mantenha parágrafos curtos (idealmente < 120 palavras por seção) e priorize figuras, tabelas e equações-chave.',
      'Título, autores, afiliação e palavras-chave ficam destacados no banner superior do pôster.',
    ],
  },
];

const GENERAL_GUIDELINES_DOCS: StandardDocSection[] = [
  {
    code: 'APA 7ª Edição & Documentos Livres',
    title: 'Norma Internacional Autor-Data e Personalização Avançada',
    summary:
      'Ideal para periódicos de psicologia, ciências sociais, relatórios executivos ou templates livres.',
    rulesApplied: [
      'Estilo APA 7ª Edição pré-configurado com margens de 2,54 cm, entrelinha dupla (2,0), citações (Autor, Ano) e destaque de títulos em itálico.',
      'Suporte a múltiplos formatos de chamada: Maiúsculas (SILVA, 2023), Caixa Mista (Silva, 2023), Numérico [1], Sobrescrito ¹ e APA (Silva, 2023).',
      'Personalização completa dos campos visíveis na barra lateral ("Personalizar Campos") e fontes baixadas sob demanda via CDN (Google Fonts / Fontsource).',
    ],
  },
  {
    code: 'Typst Universe',
    title: 'Templates Comunitários Externos (@preview/...)',
    summary:
      'Conecte qualquer pacote público do Typst Universe informando identificador e entrypoint na barra lateral.',
    rulesApplied: [
      'Se o compilador estiver offline, o RedijaApp utiliza automaticamente um layout fallback seguro para não perder seu rascunho.',
    ],
  },
];

const WelcomeModalContent: React.FC<{
  onClose: () => void;
  initialTab: WelcomeModalTab;
}> = ({ onClose, initialTab }) => {
  const [activeTab, setActiveTab] = useState<WelcomeModalTab>(initialTab);

  const renderDocsList = (intro: string, items: StandardDocSection[]) => (
    <div className="space-y-3">
      <p className="text-xs text-neutral-600 leading-relaxed">{intro}</p>
      <div className="space-y-3">
        {items.map((std) => (
          <div
            key={std.code}
            className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                {std.code}
              </span>
              <span className="font-semibold text-neutral-900 text-xs flex-1">
                {std.title}
              </span>
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">{std.summary}</p>
            <ul className="space-y-1 pl-4 list-disc text-[11px] text-neutral-500">
              {std.rulesApplied.map((rule, idx) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Topo com destaque */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 px-6 py-5 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center font-extrabold text-xl shadow-md">
              R
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest bg-emerald-500/40 px-2 py-0.5 rounded">
                RedijaApp • Multi-Normas & Padrões Científicos
              </span>
              <h2 className="text-lg font-bold mt-0.5">
                Guia Rápido e Documentação de Modelos
              </h2>
            </div>
          </div>

          <p className="text-xs text-emerald-50 leading-relaxed">
            O RedijaApp combina um editor visual de blocos com o compilador científico{' '}
            <strong>Typst</strong> rodando no seu navegador, adaptando estrutura, citações e
            diagramação para ABNT, SBC, IEEE, APA 7ª, Pôsteres e pacotes do Typst Universe.
          </p>
        </div>

        {/* Abas de navegação contextuais */}
        <div className="px-6 pt-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Como Funciona
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('abnt')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'abnt'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ABNT</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ieee')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'ieee'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span>IEEE</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sbc')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'sbc'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>SBC</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('poster')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'poster'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Presentation className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pôster A0</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'general'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>APA & Boas Práticas</span>
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-neutral-600">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    <span>PDF Real no Navegador</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    A prévia à direita não é uma simulação: é o próprio PDF compilado em
                    milissegundos pelo motor Typst WASM.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <BookOpenCheck className="w-4 h-4 text-emerald-600" />
                    <span>Multi-Templates Acadêmicos</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Suporte nativo a ABNT (TCC, Artigo, Relatório), SBC, IEEE Conference, APA 7ª,
                    Pôsteres A0/A1 e pacotes do Typst Universe.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Comandos `/` e Citações `@`</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Digite <kbd className="px-1 py-0.5 bg-white border rounded font-mono">/</kbd>{' '}
                    para inserir figuras, tabelas, quadros e citações, ou{' '}
                    <kbd className="px-1 py-0.5 bg-white border rounded font-mono">@</kbd> para
                    chamar uma referência no formato ativo.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    <span>Salvo no Navegador e Backup</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Seus trabalhos ficam salvos localmente no navegador (com lixeira de 30 dias),
                    podem sincronizar com o Google Drive ou ser exportados em <code className="font-mono">.redija</code>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-900">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    Consulte a documentação completa das normas ABNT, SBC, IEEE e Pôsteres nas abas acima.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('abnt')}
                  className="px-2.5 py-1 rounded bg-white border border-emerald-200 text-emerald-800 font-semibold text-[11px] hover:bg-emerald-100 shrink-0"
                >
                  Ver Normas ABNT
                </button>
              </div>
            </div>
          )}

          {activeTab === 'abnt' &&
            renderDocsList(
              'Abaixo estão as normas técnicas brasileiras implementadas automaticamente quando o projeto utiliza um modelo da família ABNT:',
              ABNT_STANDARDS_DOCS,
            )}

          {activeTab === 'ieee' &&
            renderDocsList(
              'Diretrizes aplicadas para submissão de artigos no formato internacional IEEE Conference:',
              IEEE_GUIDELINES_DOCS,
            )}

          {activeTab === 'sbc' &&
            renderDocsList(
              'Especificações oficiais para artigos submetidos a eventos e periódicos da Sociedade Brasileira de Computação:',
              SBC_GUIDELINES_DOCS,
            )}

          {activeTab === 'poster' &&
            renderDocsList(
              'Boas práticas visuais para diagramação de Pôsteres e Banners Científicos em congressos:',
              POSTER_GUIDELINES_DOCS,
            )}

          {activeTab === 'general' &&
            renderDocsList(
              'Orientações gerais para formatos internacionais (APA 7ª Ed.), personalização avançada e pacotes comunitários:',
              GENERAL_GUIDELINES_DOCS,
            )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-3.5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Fechar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'overview',
}) => {
  if (!isOpen) return null;
  return <WelcomeModalContent onClose={onClose} initialTab={initialTab} />;
};
