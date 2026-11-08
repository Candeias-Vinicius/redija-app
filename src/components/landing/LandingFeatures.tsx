import React from 'react';
import {
  BookOpen,
  Zap,
  HardDrive,
  Users,
  FolderSync,
  CheckCircle2,
  Lock,
  WifiOff,
  Download,
} from 'lucide-react';

interface LandingFeaturesProps {
  isDark: boolean;
  onOpenDoc: (standardCode?: string) => void;
}

export const LandingFeatures: React.FC<LandingFeaturesProps> = ({ isDark, onOpenDoc }) => {
  return (
    <section id="recursos" className="py-20 sm:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
        {/* Cabeçalho da Seção de Recursos */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Arquitetura e Recursos
          </span>
          <h2
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Tudo o que você precisa para produzir com rigor e rapidez
          </h2>
          <p className={`text-base sm:text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Uma suíte completa projetada para transformar a escrita científica em um processo prazeroso e focado no conteúdo.
          </p>
        </div>

        {/* ======================================================== */}
        {/* PILAR 1: ABNT AUTOMÁTICA NATIVA                          */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Conformidade Normativa Total</span>
            </div>

            <h3
              className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              100% das normas ABNT aplicadas sem você mover uma régua
            </h3>

            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Diga adeus à insegurança de ser reprovado na banca por detalhes formais. O Redija gerencia automaticamente margens de 3-3-2-2 cm, numeração de páginas (NBR 14724), citações longas com recuo de 4 cm (NBR 10520) e referências bibliográficas com busca por DOI (NBR 6023).
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Pré-textuais completos automáticos
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Capa, folha de rosto, folha de aprovação (banca examinadora), resumo com palavras-chave e sumário dinâmico.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Busca de Referências por DOI
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Basta colar o código DOI do artigo ou ISBN do livro para o Redija preencher todos os campos da NBR 6023 em 1 clique.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Suporte às regras NBR 10520:2023
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Alterne facilmente entre o padrão tradicional em maiúsculas (SILVA, 2024) ou o atualizado em caixa mista (Silva, 2024).
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onOpenDoc()}
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>Explorar as 9 normas ABNT suportadas no Guia Técnico &rarr;</span>
              </button>
            </div>
          </div>

          {/* Visual Card Demonstrativo */}
          <div className="lg:col-span-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-colors space-y-4 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ABNT NBR 10520 &amp; 6023
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Validado
                </span>
              </div>

              {/* Exemplo Interativo de Citação */}
              <div className="space-y-3 font-sans">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                    Citação Direta Curta (incorporada ao texto com aspas)
                  </span>
                  <p className="italic text-slate-700 dark:text-slate-300">
                    Segundo Silva (2024, p. 12), &ldquo;a automação normativa devolve ao autor o tempo que seria desperdiçado em ajustes mecânicos de layout&rdquo;.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs pl-6 border-l-4 border-l-emerald-500">
                  <span className="text-[10px] font-semibold uppercase text-emerald-700 dark:text-emerald-400 block mb-1">
                    Citação Direta Longa (mais de 3 linhas: recuo 4 cm, fonte 10, simples)
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 italic text-[11.5px] leading-snug">
                    O editor acadêmico moderno deve ser capaz de interpretar os blocos textuais e renderizar fielmente as especificações da NBR 14724 sem exigir que o pesquisador domine marcações tipográficas complexas.
                  </p>
                  <p className="text-[10px] text-right font-medium text-slate-500 dark:text-slate-400 mt-1">
                    (SANTOS; OLIVEIRA, 2024, p. 89)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                    Referência NBR 6023 (Alinhada à esquerda, destaque no título)
                  </span>
                  <p className="text-slate-800 dark:text-slate-200">
                    SILVA, João; PEREIRA, Carlos. <strong className="font-bold">Engenharia de Software e Tipografia Digital</strong>. 2. ed. São Paulo: Editora Acadêmica, 2024. DOI: 10.1016/j.redija.2024.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PILAR 2: MOTOR TYPST WASM EM MILISSEGUNDOS               */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-colors space-y-4 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                  Typst WebAssembly Engine
                </span>
                <span className="text-[11px] font-mono text-emerald-500 font-semibold">
                  ~30ms por compilação
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Tempo de Renderização LaTeX / Overleaf</span>
                    <span className="text-rose-500 font-semibold font-mono">15.000 ms</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full w-[95%]" />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                  <div className="flex justify-between text-emerald-800 dark:text-emerald-300">
                    <span className="font-semibold">Tempo de Renderização Typst no Redija</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">28 ms</span>
                  </div>
                  <div className="w-full bg-emerald-200/50 dark:bg-emerald-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[5%]" />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Compilação incremental direta: conforme você digita uma letra ou altera um número, apenas a página afetada é recompilada sem qualquer travamento.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Zap className="w-3.5 h-3.5" />
              <span>Alta Performance Tipográfica</span>
            </div>

            <h3
              className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Velocidade instantânea com o motor oficial do Typst em WASM
            </h3>

            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Em vez de depender de servidores remotos lentos e caros que colocam seu trabalho em filas, o Redija compila o documento inteiro diretamente no seu navegador utilizando WebAssembly nativo.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                <span>Zero espera: veja o resultado do PDF ao vivo lado a lado</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                <span>Qualidade de impressão de editora com kerning e hifenização precisa</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0" />
                <span>Zoom contínuo de 50% a 200% sem perda de nitidez</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PILAR 3: GOOGLE DRIVE PESSOAL (BYOS)                     */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <HardDrive className="w-3.5 h-3.5" />
              <span>Soberania de Dados &amp; BYOS</span>
            </div>

            <h3
              className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Seus trabalhos pertencem a você no seu próprio Google Drive
            </h3>

            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Você não precisa confiar que um servidor nosso guardará sua pesquisa com segurança. O Redija adota a arquitetura BYOS (Bring Your Own Storage): tudo fica salvo diretamente na sua conta Google pessoal, em pastas organizadas.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Pastas estruturadas e limpas
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Seus arquivos são organizados em <code className="font-mono text-emerald-500">Meu Drive &gt; RedijaApp &gt; [Nome do Projeto]</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Backup automático em PDF legível
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    A cada sincronização, uma cópia espelho em PDF é salva no Drive para você ler no smartphone ou enviar a terceiros.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Modo Local-First &amp; 100% Offline
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    O IndexedDB do navegador guarda seus dados localmente: escreva mesmo sem conexão com a internet.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-colors space-y-4 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  Estrutura no Seu Google Drive
                </span>
                <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sincronizado
                </span>
              </div>

              {/* Árvore de Pastas Simulada */}
              <div className="space-y-2 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-950/60 flex items-center gap-2">
                  <span className="text-blue-500">📁</span>
                  <span className="font-semibold text-slate-900 dark:text-white">Meu Drive</span>
                </div>
                <div className="ml-4 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-950/60 flex items-center gap-2">
                  <span className="text-emerald-500">📁</span>
                  <span className="font-semibold text-slate-900 dark:text-white">RedijaApp</span>
                </div>
                <div className="ml-8 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-500">📁</span>
                    <span className="font-bold text-slate-900 dark:text-white">Monografia_Final_2026/</span>
                  </div>
                  <div className="ml-6 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <p className="flex items-center gap-1.5">
                      <span>📄</span>
                      <span>projeto.redija (Documento completo + referências)</span>
                    </p>
                    <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>📕</span>
                      <span>Monografia_Final_2026.pdf (Cópia legível ABNT)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PILAR 4: COLABORAÇÃO P2P EM TEMPO REAL                   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-colors space-y-4 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                  Sessão WebRTC P2P Ativa
                </span>
                <div className="flex items-center -space-x-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900">
                    VC
                  </div>
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900">
                    Prof
                  </div>
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-slate-900">
                    MC
                  </div>
                </div>
              </div>

              <div className="space-y-3 font-sans text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-500 font-semibold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span>Prof. Dr. Ricardo (Orientador) está editando:</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 italic pl-3 border-l-2 border-blue-500">
                    &ldquo;Recomendo aprofundar a justificativa no parágrafo 3 relacionando com a NBR 6024.&rdquo;
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    <span>Você acabou de aprovar a sugestão:</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-[11px]">
                    Auto-Merge aplicado instantaneamente sem conflitos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Users className="w-3.5 h-3.5" />
              <span>Colaboração Descentralizada</span>
            </div>

            <h3
              className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Trabalhe junto com seu orientador em tempo real sem intermediários
            </h3>

            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Compartilhe o acesso pelo Google Drive e conecte-se via WebRTC P2P (Peer-to-Peer): as edições trafegam diretamente entre os navegadores com criptografia de ponta a ponta.
            </p>

            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Cursores coloridos mostrando a posição de cada colaborador</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Mesclagem inteligente com timestamps por bloco (Auto-Merge)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Controle de permissões (Leitor ou Editor) integrado ao Google Drive</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PILAR 5: IMPORTAÇÃO E EXPORTAÇÃO TOTAL                   */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <FolderSync className="w-3.5 h-3.5" />
              <span>Liberdade de Formatos</span>
            </div>

            <h3
              className={`text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Importe do Word e exporte projetos Typst completos em ZIP
            </h3>

            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Você não fica preso a uma plataforma fechada. Traga rascunhos feitos no Microsoft Word (.docx) ou pacotes do Overleaf (.zip). A qualquer momento, exporte o pacote Typst original com os arquivos <code className="font-mono text-emerald-500">main.typ</code>, <code className="font-mono text-emerald-500">abnt.typ</code>, imagens e <code className="font-mono text-emerald-500">referencias.bib</code>.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="text-blue-500">📥</span> Importe
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Documentos Word (.docx), projetos Redija ou arquivos ZIP do Overleaf.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="text-emerald-500">📤</span> Exporte
                </span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  PDF de alta resolução pronto para impressão e pacote ZIP do código Typst.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-xl transition-colors space-y-4 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  Conteúdo do Pacote ZIP Exportado
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Zero Lock-in
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/60 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="text-emerald-500">typ</span> main.typ
                  </span>
                  <span className="text-[10px] text-slate-400">Código principal</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/60 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="text-emerald-500">typ</span> abnt.typ
                  </span>
                  <span className="text-[10px] text-slate-400">Regras e macros NBR</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/60 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="text-amber-500">bib</span> referencias.bib
                  </span>
                  <span className="text-[10px] text-slate-400">BibTeX padronizado</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950/60 flex items-center justify-between">
                  <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="text-blue-500">img</span> assets/ (figuras e logos)
                  </span>
                  <span className="text-[10px] text-slate-400">Imagens originais</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
