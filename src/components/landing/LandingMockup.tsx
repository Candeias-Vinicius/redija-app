import React, { useState } from 'react';
import {
  FileText,
  Code2,
  Columns3,
  Columns2,
  CheckCircle2,
  Zap,
  Cloud,
} from 'lucide-react';

interface LandingMockupProps {
  isDark: boolean;
}

export const LandingMockup: React.FC<LandingMockupProps> = ({ isDark }) => {
  const [activeTab, setActiveTab] = useState<'realApp' | 'split' | 'typst'>('realApp');

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Glow de fundo */}
      <div
        className={`absolute -inset-4 rounded-3xl blur-2xl opacity-50 pointer-events-none transition-all ${
          isDark
            ? 'bg-gradient-to-r from-emerald-600/20 via-teal-500/15 to-cyan-600/20'
            : 'bg-gradient-to-r from-emerald-200/50 via-teal-100/30 to-emerald-100/50'
        }`}
      />

      {/* Janela Principal da Aplicação */}
      <div
        className={`relative rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#080d19] border-slate-800 shadow-black/80'
            : 'bg-white border-slate-200 shadow-slate-300/70'
        }`}
      >
        {/* Barra Superior do Navegador / Frame */}
        <div
          className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Três botõezinhos Mac/Window + Título */}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80 inline-block" />
            <span
              className={`ml-2 text-xs font-mono font-medium truncate max-w-[200px] sm:max-w-none ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              RedijaApp Workspace • Typst WASM &amp; Multi-Normas
            </span>
          </div>

          {/* Abas de Demonstração da Tela */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/90 text-xs font-medium">
            <button
              onClick={() => setActiveTab('realApp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'realApp'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Workspace Real (3 Painéis)</span>
            </button>

            <button
              onClick={() => setActiveTab('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'split'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Editor &amp; PDF</span>
            </button>

            <button
              onClick={() => setActiveTab('typst')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'typst'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Typst (.typ)</span>
            </button>
          </div>

          {/* Badge Indicativo */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              WASM Ativo
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CONTEÚDO DO MOCKUP                                       */}
        {/* ========================================================= */}
        <div
          className={
            activeTab === 'realApp'
              ? isDark
                ? 'bg-[#0f172a]'
                : 'bg-white'
              : 'bg-[#0b1220] text-slate-100 min-h-[480px] lg:min-h-[540px] flex flex-col justify-start'
          }
        >
          {/* ------------------------------------------------------- */}
          {/* ABA 1: CAPTURA REAL DA TELA ATUAL (3 PAINÉIS)           */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'realApp' && (
            <img
              src={isDark ? '/images/workspace-real-dark.png' : '/images/workspace-real-light.png'}
              alt={
                isDark
                  ? 'Captura real do RedijaApp no modo escuro com barra lateral de estrutura, editor visual em blocos e prévia PDF clara lado a lado'
                  : 'Captura real do RedijaApp no modo claro com barra lateral de estrutura, editor visual em blocos e prévia PDF lado a lado'
              }
              className="w-full h-auto block select-none"
            />
          )}

          {/* ------------------------------------------------------- */}
          {/* ABA 2: VISÃO LADO A LADO (EDITOR & PDF ABNT AO VIVO)     */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'split' && (
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
              {/* Lado Esquerdo: Editor com Texto Acadêmico Volumoso */}
              <div className="lg:col-span-6 p-4 rounded-xl border border-slate-800 bg-[#0c1424] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                  <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Editor de Texto (Blocos ABNT)
                  </span>
                  <span className="font-mono text-slate-500">542 palavras • Seção 1</span>
                </div>

                <div className="space-y-3 font-sans text-xs overflow-y-auto max-h-[380px] pr-1">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                      1 INTRODUÇÃO
                    </h4>
                    <p className="text-slate-300 leading-relaxed text-justify">
                      A evolução das arquiteturas computacionais distribuídas e a crescente demanda por processamento de dados em tempo real transformaram profundamente o paradigma de desenvolvimento de software contemporâneo. Historicamente, os sistemas corporativos operavam sobre modelos monolíticos e síncronos, cujas limitações de escalabilidade vertical tornaram-se progressivamente evidentes à medida que o volume e a heterogeneidade das requisições atingiram escalas globais.
                    </p>
                  </div>

                  <p className="text-slate-300 leading-relaxed text-justify">
                    Nesse cenário de transição paradigmática, as abordagens orientadas a eventos e os protocolos descentralizados emergiram como alternativas essenciais para garantir elasticidade, resiliência e baixa latência sob cargas extremas. A necessidade de mensurar rigorosamente o comportamento dessas arquiteturas em cenários de alta concorrência impõe desafios metodológicos fundamentais aos pesquisadores da área de engenharia de software.
                  </p>

                  {/* Citação Longa ABNT com Recuo Real de 4cm */}
                  <div className="pl-6 border-l-2 border-emerald-500 py-1.5 bg-emerald-950/20 rounded-r text-[11px] space-y-1">
                    <p className="italic text-slate-300 leading-snug">
                      &ldquo;A capacidade de um sistema distribuído manter sua responsividade sob condições adversas não depende unicamente do provisionamento de recursos elásticos, mas da descentralização inteligente de seu fluxo de controle e da minimização do estado compartilhado entre os nós de processamento.&rdquo;
                    </p>
                    <p className="text-right text-[10px] font-semibold text-emerald-400">
                      (SILVA; PEREIRA, 2024, p. 87)
                    </p>
                  </div>

                  <p className="text-slate-300 leading-relaxed text-justify">
                    Diante dessa problemática, o presente estudo investiga quantitativamente a eficiência de protocolos ponto a ponto em comparação com modelos tradicionais cliente-servidor, delimitando as condições de contorno em que a descentralização propicia ganhos observáveis de vazão transacional e integridade de dados.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Digite &apos;/&apos; para inserir blocos</span>
                  <span className="text-emerald-400 font-mono font-medium">Sincronizado</span>
                </div>
              </div>

              {/* Lado Direito: Preview da Página 15 do PDF ABNT */}
              <div className="lg:col-span-6 p-4 rounded-xl border border-slate-800 bg-[#090f1b] flex flex-col justify-between">
                {/* Barra do Preview */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400 mb-2">
                  <span className="text-emerald-400 font-medium">Prévia PDF • NBR 14724</span>
                  <div className="flex items-center gap-1 font-mono text-[9px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Pág. 15</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">100%</span>
                  </div>
                </div>

                {/* Folha A4 com Margens 3-3-2-2 e Recuo 4cm */}
                <div className="bg-white text-slate-950 p-6 rounded shadow-md font-serif text-[10.5px] leading-relaxed space-y-2.5 my-auto">
                  {/* Cabeçalho ABNT: Número no Canto Superior Direito */}
                  <div className="text-right text-[9px] font-sans font-bold text-slate-800 pb-1 border-b border-slate-100">
                    15
                  </div>

                  <h5 className="font-sans font-bold text-xs uppercase text-slate-900 tracking-tight">
                    1 INTRODUÇÃO
                  </h5>

                  <p className="text-justify indent-6 text-[10px] leading-relaxed text-slate-800">
                    A evolução das arquiteturas computacionais distribuídas e a crescente demanda por processamento de dados em tempo real transformaram profundamente o paradigma de desenvolvimento de software contemporâneo. Historicamente, os sistemas corporativos operavam sobre modelos monolíticos e síncronos, cujas limitações de escalabilidade vertical tornaram-se progressivamente evidentes.
                  </p>

                  <p className="text-justify indent-6 text-[10px] leading-relaxed text-slate-800">
                    Nesse cenário de transição paradigmática, as abordagens orientadas a eventos e os protocolos descentralizados emergiram como alternativas essenciais para garantir elasticidade, resiliência e baixa latência sob cargas extremas.
                  </p>

                  {/* Citação Recuada na Folha A4 */}
                  <div className="ml-8 text-[9px] leading-snug text-slate-700 text-justify">
                    A capacidade de um sistema distribuído manter sua responsividade sob condições adversas não depende unicamente do provisionamento de recursos elásticos, mas da descentralização inteligente de seu fluxo de controle e da minimização do estado compartilhado entre os nós de processamento. (SILVA; PEREIRA, 2024, p. 87).
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 mt-2">
                  <span className="flex items-center gap-1.5 text-[10px]">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Typst WASM: 28ms</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Margens 3-3-2-2 cm</span>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* ABA 3: CÓDIGO TYPST GERADO                              */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'typst' && (
            <div className="p-4 sm:p-6 bg-[#0a1120] font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">main.typ (Gerado em tempo real pelo RedijaApp)</span>
                <span>Typst 0.12+ Syntax</span>
              </div>

              <pre className="text-slate-300 leading-relaxed text-[11px]">
{`#import "abnt.typ": *

#show: abnt-document.with(
  titulo: "Arquiteturas Distribuídas e Sistemas Reativos em Tempo Real",
  autor: "Carlos Eduardo Silva",
  instituicao: "Universidade Federal de Tecnologia",
  ano: "2026",
  cidade: "São Paulo",
  margens: (top: 3cm, left: 3cm, bottom: 2cm, right: 2cm),
  estilo-citacao: "autor-data-2023"
)

= 1 Introdução

A evolução das arquiteturas computacionais distribuídas e a crescente demanda por processamento
de dados em tempo real transformaram profundamente o paradigma de desenvolvimento de software contemporâneo.

Nesse cenário de transição paradigmática, as abordagens orientadas a eventos e os protocolos descentralizados
emergiram como alternativas essenciais para garantir elasticidade e resiliência sob cargas extremas.

#citacao-longa(
  autor: "SILVA; PEREIRA",
  ano: "2024",
  pagina: "87",
  conteudo: [
    A capacidade de um sistema distribuído manter sua responsividade sob condições adversas
    não depende unicamente do provisionamento de recursos elásticos, mas da descentralização inteligente
    de seu fluxo de controle e da minimização do estado compartilhado entre os nós de processamento.
  ]
)

#bibliography("referencias.bib", title: "Referências", style: "abnt")`}
              </pre>
            </div>
          )}
        </div>

        {/* Rodapé do Mockup */}
        <div
          className={`px-4 py-2.5 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>ABNT, SBC, IEEE, APA 7ª &amp; Typst Universe</span>
              </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-teal-500" />
              <span>Google Drive Pessoal (BYOS)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-500 font-semibold">
              Fiel à interface do RedijaApp • 100% Client-Side
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
