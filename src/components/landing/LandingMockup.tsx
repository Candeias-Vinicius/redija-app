import React, { useState } from 'react';
import {
  FileText,
  Code2,
  Columns3,
  Columns2,
  CheckCircle2,
  Zap,
  Cloud,
  Share2,
  Download,
  FolderOpen,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Plus,
  Undo2,
  Redo2,
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
              RedijaApp Workspace • Typst WASM &amp; ABNT
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
        <div className="bg-[#0b1220] text-slate-100 min-h-[480px] lg:min-h-[540px] flex flex-col justify-start">
          {/* ------------------------------------------------------- */}
          {/* ABA 1: TELA REAL COMPLETA DO APP EM MINIATURA (3 PANES) */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'realApp' && (
            <div className="flex flex-col h-full select-none">
              {/* Barra de Topo Real do RedijaApp */}
              <div className="px-3 py-2 bg-[#0d1627] border-b border-slate-800/80 flex items-center justify-between text-xs">
                {/* Lado Esquerdo do Topo */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Marca */}
                  <div className="flex items-center gap-1.5 font-bold tracking-tight">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[10px] text-white font-black">
                      R
                    </div>
                    <span className="text-white text-xs">Redija</span>
                    <span className="text-emerald-400 text-xs">App</span>
                  </div>

                  <span className="text-slate-600">/</span>

                  {/* Seletor de Projeto */}
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-850 border border-slate-700/60 text-slate-200 text-[11px] font-medium">
                    <FolderOpen className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[120px] sm:max-w-[160px]">Pesquisa sobre Mim</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </div>

                  {/* Undo / Redo */}
                  <div className="hidden md:flex items-center gap-1 text-slate-400">
                    <button className="p-1 hover:text-white rounded transition-colors" title="Desfazer">
                      <Undo2 className="w-3 h-3" />
                    </button>
                    <button className="p-1 hover:text-white rounded transition-colors" title="Refazer">
                      <Redo2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Botões de Alternar Painéis */}
                  <div className="hidden lg:flex items-center p-0.5 rounded-md bg-slate-800/60 border border-slate-700/50 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      Estrutura
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      Texto
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      PDF
                    </span>
                  </div>
                </div>

                {/* Lado Direito do Topo */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px]">
                  {/* Status do Google Drive */}
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px]">
                    <Cloud className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="hidden sm:inline">Salvo no Drive</span>
                  </div>

                  {/* Compartilhar */}
                  <button className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-850 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60">
                    <Share2 className="w-3 h-3 text-emerald-400" />
                    <span>Compartilhar</span>
                  </button>

                  {/* Ferramentas */}
                  <button className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-slate-850 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60">
                    <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                    <span>Ferramentas</span>
                  </button>

                  {/* Baixar PDF */}
                  <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-[11px] shadow-xs">
                    <Download className="w-3 h-3" />
                    <span>Baixar PDF</span>
                  </button>

                  {/* Avatar do Usuário */}
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] border border-emerald-400/50">
                    VC
                  </div>
                </div>
              </div>

              {/* Corpo com 3 Colunas Exatas da Foto */}
              <div className="grid grid-cols-1 md:grid-cols-12 flex-1 divide-y md:divide-y-0 md:divide-x divide-slate-800/80 overflow-hidden">
                {/* ------------------------------------------------- */}
                {/* PAINEL 1 (ESQUERDA): ESTRUTURA ABNT (NBR 14724)   */}
                {/* ------------------------------------------------- */}
                <div className="md:col-span-3 p-3 bg-[#0a101d] space-y-2.5 text-xs overflow-y-auto max-h-[480px]">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <div>
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-200">
                        ESTRUTURA ABNT (NBR 14724)
                      </h4>
                      <p className="text-[10px] text-slate-500">Capa, pré-textuais, resumo e referências.</p>
                    </div>
                  </div>

                  {/* Accordion 1: Capa & Folha de Rosto (Aberto) */}
                  <div className="rounded-lg border border-slate-800 bg-[#0d1525] p-2 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        Capa &amp; Folha de Rosto
                      </span>
                      <ChevronDown className="w-3 h-3" />
                    </div>

                    <div className="space-y-1.5 text-[10px] font-sans">
                      <div>
                        <span className="text-slate-400 text-[9px] block">Título do Trabalho</span>
                        <div className="p-1 rounded bg-[#080d19] border border-slate-700/60 text-slate-200 truncate">
                          Proposta de Investigação Científica
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[9px] block">Subtítulo (Opcional)</span>
                        <div className="p-1 rounded bg-[#080d19] border border-slate-700/60 text-slate-400 truncate">
                          Projeto de pesquisa apresentado para qualificação
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[9px] block">Nome do Autor</span>
                        <div className="p-1 rounded bg-[#080d19] border border-slate-700/60 text-slate-200 truncate">
                          Nome do Proponente
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[9px] block">Orientador(a) (Opcional)</span>
                        <div className="p-1 rounded bg-[#080d19] border border-slate-700/60 text-slate-400 truncate">
                          Prof. Dr. Orientador Pretendido
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[9px] block">Instituição</span>
                        <div className="p-1 rounded bg-[#080d19] border border-slate-700/60 text-slate-200 truncate">
                          Universidade Federal
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <span className="text-slate-400 text-[9px] block">Cidade</span>
                          <div className="p-1 rounded bg-[#080d19] border border-slate-700/60 text-slate-200 truncate">
                            São Paulo
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[9px] block">Ano</span>
                          <div className="p-1 rounded bg-[#080d19] border border-slate-700/60 text-slate-200 truncate">
                            2026
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accordion 2: Pré-Textuais & Listas */}
                  <div className="rounded-lg border border-slate-800/80 bg-[#0d1525]/60 p-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Pré-Textuais &amp; Listas</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>

                  {/* Accordion 3: Resumo & Abstract */}
                  <div className="rounded-lg border border-slate-800/80 bg-[#0d1525]/60 p-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Resumo &amp; Abstract (NBR 6028)</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>

                  {/* Accordion 4: Referências */}
                  <div className="rounded-lg border border-slate-800/80 bg-[#0d1525]/60 p-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Referências (0)</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                      + Nova
                    </span>
                  </div>
                </div>

                {/* ------------------------------------------------- */}
                {/* PAINEL 2 (CENTRO): EDITOR NOTION-LIKE EM DARK MODE*/}
                {/* ------------------------------------------------- */}
                <div className="md:col-span-5 p-4 bg-[#0c1424] space-y-3.5 text-xs overflow-y-auto max-h-[480px]">
                  {/* Seção 1 */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                      <span className="text-emerald-400 font-extrabold">1</span>
                      <span>INTRODUÇÃO E PROBLEMA DE PESQUISA</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-4">
                      Apresente a delimitação do tema e formule claramente a pergunta-problema que orientará a pesquisa.
                    </p>
                  </div>

                  {/* Seção 2 */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                      <span className="text-emerald-400 font-extrabold">2</span>
                      <span>JUSTIFICATIVA</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-4">
                      Argumente sobre a relevância científica, acadêmica e social da realização deste estudo.
                    </p>
                  </div>

                  {/* Seção 3 */}
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                      <span className="text-emerald-400 font-extrabold">3</span>
                      <span>OBJETIVOS</span>
                    </h3>

                    <div className="pl-4 space-y-1">
                      <h4 className="text-xs font-semibold text-emerald-400">
                        3.1 Objetivo Geral
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Defina em uma frase com verbo no infinitivo o propósito global da pesquisa.
                      </p>
                    </div>

                    <div className="pl-4 space-y-1">
                      <h4 className="text-xs font-semibold text-emerald-400">
                        3.2 Objetivos Específicos
                      </h4>
                      <ul className="text-[11px] text-slate-300 space-y-0.5 list-disc list-inside">
                        <li>Identificar as variáveis principais relacionadas ao fenômeno estudado;</li>
                        <li>Analisar comparativamente os resultados obtidos em cenários controlados.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Seção 4 */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 uppercase">
                      <span className="text-emerald-400 font-extrabold">4</span>
                      <span>METODOLOGIA</span>
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed pl-4">
                      Classifique a pesquisa quanto à abordagem, natureza e procedimentos técnicos para coleta e análise de dados.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-[11px] transition-colors">
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>Adicionar parágrafo</span>
                    </button>
                  </div>
                </div>

                {/* ------------------------------------------------- */}
                {/* PAINEL 3 (DIREITA): PRÉVIA PDF OFICIAL A4 AO VIVO */}
                {/* ------------------------------------------------- */}
                <div className="md:col-span-4 p-3 bg-[#090f1b] flex flex-col justify-between overflow-y-auto max-h-[480px]">
                  {/* Topo do Painel de PDF */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400 mb-2">
                    <span className="flex items-center gap-1 text-emerald-400 font-medium">
                      <Eye className="w-3 h-3" />
                      Prévia PDF • 8 pág (2mn)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">160%</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Ver Typst</span>
                    </div>
                  </div>

                  {/* Folha A4 Realista Simulada */}
                  <div className="bg-white text-slate-950 p-6 rounded shadow-lg font-serif text-center flex flex-col justify-between min-h-[380px] my-auto">
                    {/* Topo da Capa */}
                    <div className="space-y-0.5 font-sans">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-900">
                        UNIVERSIDADE FEDERAL
                      </p>
                      <p className="text-[8px] font-medium uppercase text-slate-700">
                        PROGRAMA DE PESQUISA
                      </p>
                    </div>

                    {/* Autor */}
                    <div className="py-4">
                      <p className="text-[10px] font-bold uppercase text-slate-900 font-sans">
                        NOME DO PROPONENTE
                      </p>
                    </div>

                    {/* Título e Subtítulo */}
                    <div className="py-3 px-2">
                      <h4 className="text-[10.5px] font-extrabold uppercase leading-snug text-slate-950 font-sans">
                        PROPOSTA DE INVESTIGAÇÃO CIENTÍFICA:
                      </h4>
                      <p className="text-[9px] text-slate-700 font-sans mt-0.5">
                        Projeto de pesquisa apresentado para qualificação
                      </p>
                    </div>

                    {/* Cidade e Ano no Rodapé da A4 */}
                    <div className="pt-4 font-sans text-[8px] text-slate-700 uppercase">
                      <p>SÃO PAULO</p>
                      <p>2026</p>
                    </div>
                  </div>

                  {/* Rodapé da Prévia */}
                  <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span>Compilado em 28ms</span>
                    </span>
                    <span className="font-mono text-emerald-400">ABNT NBR 14724</span>
                  </div>
                </div>
              </div>
            </div>
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
              <span>NBR 14724, 6023 &amp; 10520</span>
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
