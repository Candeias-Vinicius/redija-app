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
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AbntStandardDoc {
  code: string;
  title: string;
  summary: string;
  rulesApplied: string[];
}

const ABNT_STANDARDS_DOCS: AbntStandardDoc[] = [
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
      'Ordenação alfabética automática pelo sobrenome do primeiro autor.',
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
      'Suporte a títulos sem indicação numérica centralizados (Errata, Agradecimentos, Resumo, Referências, Apêndices e Anexos).',
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
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'abnt_docs'>('overview');

  if (!isOpen) return null;

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
                RedijaApp • Padrão Brasileiro ABNT
              </span>
              <h2 className="text-lg font-bold mt-0.5">
                Guia Rápido e Documentação das Normas ABNT
              </h2>
            </div>
          </div>

          <p className="text-xs text-emerald-50 leading-relaxed">
            O RedijaApp combina um editor visual de blocos com o compilador científico{' '}
            <strong>Typst</strong> rodando no seu navegador, sem que você precise configurar
            margens, sumário ou formatação manualmente.
          </p>
        </div>

        {/* Abas de navegação */}
        <div className="px-6 pt-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Como Funciona
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('abnt_docs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === 'abnt_docs'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Documentação das Normas ABNT Atendidas</span>
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-neutral-600">
          {activeTab === 'overview' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    <span>PDF Real no Navegador</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    A prévia à direita não é uma simulação: é o próprio PDF compilado em
                    milissegundos pelo motor Typst.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <BookOpenCheck className="w-4 h-4 text-emerald-600" />
                    <span>7 Normas ABNT Automatizadas</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Capa, Folha de Rosto, Folha de Aprovação, Sumário automático, recuo de 1,25 cm,
                    citações longas e referências em ordem alfabética.
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
                    chamar uma referência no texto.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-neutral-900">
                    <HardDrive className="w-4 h-4 text-emerald-600" />
                    <span>Salvo no Navegador e Backup</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 leading-snug">
                    Seus trabalhos ficam salvos automaticamente no seu navegador (com lixeira de 30
                    dias) e podem ser exportados em arquivos <code className="font-mono">.redija</code>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-900">
                  <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">
                    Quer ver exatamente quais regras da ABNT o sistema aplica no seu TCC?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('abnt_docs')}
                  className="px-2.5 py-1 rounded bg-white border border-emerald-200 text-emerald-800 font-semibold text-[11px] hover:bg-emerald-100 shrink-0"
                >
                  Ver Normas ABNT
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-neutral-600 leading-relaxed">
                O RedijaApp foi projetado especificamente para o padrão acadêmico brasileiro. Abaixo
                estão todas as normas técnicas oficiais implementadas automaticamente no motor de
                diagramação do aplicativo:
              </p>

              <div className="space-y-3">
                {ABNT_STANDARDS_DOCS.map((std) => (
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
