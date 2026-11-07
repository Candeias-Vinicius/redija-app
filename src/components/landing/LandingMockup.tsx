import React, { useState } from 'react';
import {
  FileText,
  Code2,
  Columns2,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Zap,
  Lock,
  Users,
  Eye,
  Layers,
} from 'lucide-react';

interface LandingMockupProps {
  isDark: boolean;
}

export const LandingMockup: React.FC<LandingMockupProps> = ({ isDark }) => {
  const [activeTab, setActiveTab] = useState<'split' | 'editor' | 'pdf' | 'typst'>('split');

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Glow de fundo */}
      <div
        className={`absolute -inset-4 rounded-3xl blur-2xl opacity-60 pointer-events-none transition-all ${
          isDark
            ? 'bg-gradient-to-r from-emerald-600/20 via-teal-500/15 to-cyan-600/20'
            : 'bg-gradient-to-r from-emerald-200/60 via-teal-100/40 to-emerald-100/60'
        }`}
      />

      {/* Janela Principal da Aplicação Simulada */}
      <div
        className={`relative rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0b1220] border-slate-800 shadow-black/80'
            : 'bg-white border-slate-200 shadow-slate-300/70'
        }`}
      >
        {/* Barra Superior da Janela Simulada (Browser / App Chrome) */}
        <div
          className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Três botõezinhos Mac/Window */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
            <span
              className={`ml-2 text-xs font-mono font-medium truncate max-w-[200px] sm:max-w-none ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Meu TCC de Graduação — RedijaApp &amp; Typst WASM
            </span>
          </div>

          {/* Abas de Navegação da Demonstração */}
          <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/90 text-xs font-medium">
            <button
              onClick={() => setActiveTab('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'split'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lado a Lado</span>
            </button>

            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'editor'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editor Visual</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'pdf'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>PDF Oficial</span>
            </button>

            <button
              onClick={() => setActiveTab('typst')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'typst'
                  ? 'bg-white dark:bg-emerald-500 text-slate-900 dark:text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Typst (.typ)</span>
            </button>
          </div>

          {/* Status Chip Flutuante */}
          <div className="hidden md:flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              WASM: 28ms
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* CORPO DO MOCKUP COM CONTEÚDO DINÂMICO CONFORME A ABA      */}
        {/* ========================================================= */}
        <div className="p-4 sm:p-6 min-h-[460px] md:min-h-[500px] flex flex-col justify-center">
          {/* ------------------------------------------------------- */}
          {/* ABA 1: SPLIT SCREEN (LADO A LADO - VISÃO REAL DO APP)    */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full items-stretch">
              {/* Lado Esquerdo: Editor Estilo Notion */}
              <div
                className={`lg:col-span-6 p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/90'
                }`}
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5" />
                      Editor Visual de Blocos
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                      Seção 1 • Introdução
                    </span>
                  </div>

                  {/* Bloco 1: Título ABNT */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Título NBR 6024 (Seção Primária)
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white uppercase">
                      1 INTRODUÇÃO
                    </h3>
                  </div>

                  {/* Bloco 2: Parágrafo comum com chamada de citação */}
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    O desenvolvimento de trabalhos acadêmicos no Brasil historicamente enfrentou barreiras na padronização das normas da Associação Brasileira de Normas Técnicas{' '}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                      @abnt2023
                    </span>
                    .
                  </p>

                  {/* Bloco 3: Citação Direta Longa ABNT com recuo */}
                  <div className="pl-6 border-l-2 border-emerald-500 py-1 space-y-1 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-r-lg p-2.5">
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Citação Longa ABNT (Recuo 4cm, Fonte 10pt)
                    </span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic leading-snug">
                      &ldquo;A tipografia moderna automatizada via compiladores WebAssembly elimina a necessidade de diagramação manual, reduzindo a zero o risco de reprovação formal em bancas.&rdquo;
                    </p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-300 text-right font-medium">
                      (SILVA; PEREIRA, 2024, p. 112)
                    </p>
                  </div>
                </div>

                {/* Barra de Ferramentas Notion no rodapé do editor */}
                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                  <span>Digite &apos;/&apos; para inserir citação, tabela ou equação</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">Salvo no Drive</span>
                </div>
              </div>

              {/* Lado Direito: Preview do PDF ABNT */}
              <div
                className={`lg:col-span-6 p-4 rounded-xl border flex flex-col justify-between transition-colors ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                {/* Folha A4 ABNT Simulada */}
                <div className="bg-white text-slate-900 p-5 rounded-lg shadow-md border border-slate-200/90 font-serif text-[11px] leading-relaxed space-y-3 relative">
                  {/* Cabeçalho ABNT: Número da página no canto superior direito */}
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-sans pb-1 border-b border-dashed border-slate-200">
                    <span className="italic text-[9px] text-slate-400">Margem Superior: 3 cm</span>
                    <span className="font-bold text-slate-900 font-mono">15</span>
                  </div>

                  {/* Conteúdo formatado com rigor da NBR */}
                  <h4 className="font-sans font-bold text-xs uppercase text-slate-950 tracking-tight">
                    1 INTRODUÇÃO
                  </h4>

                  <p className="text-justify indent-6 text-[10.5px] leading-relaxed text-slate-800">
                    O desenvolvimento de trabalhos acadêmicos no Brasil historicamente enfrentou barreiras na padronização das normas da Associação Brasileira de Normas Técnicas (ABNT, 2023). A sobrecarga formal imposta aos discentes muitas vezes desvia a atenção da fundamentação metodológica central da pesquisa.
                  </p>

                  {/* Citação Recuada no PDF */}
                  <div className="ml-10 text-[9.5px] leading-snug text-slate-700 text-justify">
                    A tipografia moderna automatizada via compiladores WebAssembly elimina a necessidade de diagramação manual, reduzindo a zero o risco de reprovação formal em bancas examinadoras. (SILVA; PEREIRA, 2024, p. 112).
                  </div>

                  {/* Margem Inferior e Esquerda informativas */}
                  <div className="pt-2 flex justify-between text-[9px] text-slate-400 font-sans">
                    <span>Margem Esquerda: 3 cm</span>
                    <span>Margem Direita: 2 cm</span>
                  </div>
                </div>

                {/* Rodapé da folha com detalhes de compilação */}
                <div className="flex items-center justify-between text-xs pt-3 text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Compilação Instantânea Typst WASM</span>
                  </span>
                  <span className="font-mono text-[11px]">Página 15 de 42</span>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* ABA 2: EDITOR VISUAL COMPLETO                           */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'editor' && (
            <div
              className={`p-6 rounded-xl border space-y-4 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    Tipologia Notion-like
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    Blocos estruturados com validação ABNT contínua
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                  Norma NBR 14724 Ativa
                </div>
              </div>

              <div className="space-y-3 font-sans">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400">
                      Capítulo 2 • Seção Secundária NBR 6024
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                      2.1 ARQUITETURA LOCAL-FIRST E SEGURANÇA NO GOOGLE DRIVE
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">1.1.1</span>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  Ao contrário de editores em nuvem convencionais que centralizam os dados de estudantes em servidores de terceiros, o RedijaApp emprega uma abordagem centrada na soberania do usuário (Bring Your Own Storage), garantindo que as versões em formato Typst e as cópias em PDF permaneçam estritamente sincronizadas no Google Drive pessoal do autor.
                </div>

                {/* Simulação de Menu Flutuante de Comandos */}
                <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-slate-900 shadow-lg text-xs space-y-1.5">
                  <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Menu de Comandos ABNT Rápidos (Digite &apos;/&apos;)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">/citacao</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">/referencia</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">/tabela-ibge</span>
                    </div>
                    <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-teal-500" />
                      <span className="font-medium text-slate-800 dark:text-slate-200">/banca</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* ABA 3: PDF OFICIAL ABNT                                 */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'pdf' && (
            <div className="max-w-2xl mx-auto w-full bg-white text-slate-900 p-8 rounded-xl shadow-xl border border-slate-200 font-serif text-xs leading-relaxed space-y-4">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans border-b pb-2">
                <span>Padronização ABNT NBR 14724 • Folha A4</span>
                <span className="font-bold text-slate-900 font-mono">Página 1</span>
              </div>

              <div className="text-center py-4 space-y-2 font-sans">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  UNIVERSIDADE FEDERAL DE TECNOLOGIA
                </p>
                <p className="text-[10px] text-slate-500 uppercase">
                  PROGRAMA DE PÓS-GRADUAÇÃO EM ENGENHARIA DE SOFTWARE
                </p>
                <div className="py-6">
                  <h3 className="text-base font-extrabold uppercase text-slate-950 max-w-md mx-auto leading-tight">
                    AUTOMAÇÃO DE FORMATAÇÃO NORMATIVA COM COMPILAÇÃO EM WEBASSEMBLY
                  </h3>
                </div>
                <p className="text-xs font-medium text-slate-800">
                  MARIA CLARA DOS SANTOS
                </p>
              </div>

              <div className="pt-8 text-center text-[10px] text-slate-500 font-sans">
                <p>SÃO PAULO</p>
                <p>2026</p>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* ABA 4: CÓDIGO TYPST GERADO                              */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'typst' && (
            <div className="p-4 rounded-xl bg-[#0d1525] border border-slate-800 font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-bold">main.typ (Gerado em tempo real pelo RedijaApp)</span>
                <span>Typst 0.12+ Syntax</span>
              </div>

              <pre className="text-slate-300 leading-relaxed text-[11px]">
{`#import "abnt.typ": *

#show: abnt-document.with(
  titulo: "Automação de Formatação Normativa com WebAssembly",
  autor: "Maria Clara dos Santos",
  instituicao: "Universidade Federal de Tecnologia",
  ano: "2026",
  cidade: "São Paulo",
  margens: (top: 3cm, left: 3cm, bottom: 2cm, right: 2cm),
  estilo-citacao: "autor-data-2023"
)

= Introdução

O desenvolvimento de trabalhos acadêmicos no Brasil historicamente enfrentou barreiras
na padronização das normas da Associação Brasileira de Normas Técnicas @abnt2023.

#citacao-longa(
  autor: "SILVA; PEREIRA",
  ano: "2024",
  pagina: "112",
  conteudo: [
    A tipografia moderna automatizada via compiladores WebAssembly elimina a necessidade
    de diagramação manual, reduzindo a zero o risco de reprovação formal em bancas.
  ]
)

#bibliography("referencias.bib", title: "Referências", style: "abnt")`}
              </pre>
            </div>
          )}
        </div>

        {/* Rodapé Informativo do Mockup */}
        <div
          className={`px-4 py-3 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>NBR 14724 &amp; NBR 6023 Validadas</span>
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-teal-500" />
              <span>Google Drive Pessoal (BYOS)</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              100% Client-Side • Zero Servidor Intermediário
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
