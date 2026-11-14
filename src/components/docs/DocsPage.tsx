import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  GitBranch,
  Globe,
  HardDrive,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { GitHubIcon } from '@/components/GitHubIcon';
import {
  APP_PUBLIC_URL,
  GITHUB_CONTRIBUTING_URL,
  GITHUB_ISSUES_URL,
  GITHUB_LICENSE_URL,
  GITHUB_REPO_URL,
  GITHUB_THIRD_PARTY_NOTICES_URL,
} from '@/core/links';
import { APP_VERSION } from '@/core/version';
import { DOCS_SECTIONS, filterDocsSections } from '@/core/docs/documentationCatalog';

interface DocsPageProps {
  isDark: boolean;
  onToggleDarkMode: () => void;
  isSessionActive: boolean;
  initialSectionId?: string;
  onNavigateApp: () => void;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'primeiros-passos': <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />,
  'normas-abnt': <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />,
  'templates-internacionais': <Globe className="w-4 h-4 text-teal-500 shrink-0" />,
  'importacao-exportacao': <FileCode2 className="w-4 h-4 text-sky-500 shrink-0" />,
  'nuvem-colaboracao': <HardDrive className="w-4 h-4 text-indigo-500 shrink-0" />,
  'codigo-aberto': <GitBranch className="w-4 h-4 text-emerald-500 shrink-0" />,
};

export const DocsPage: React.FC<DocsPageProps> = ({
  isDark,
  onToggleDarkMode,
  isSessionActive,
  initialSectionId,
  onNavigateApp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(initialSectionId);
  const [lastInitialSectionId, setLastInitialSectionId] = useState<string | undefined>(
    initialSectionId,
  );

  if (initialSectionId !== lastInitialSectionId) {
    setLastInitialSectionId(initialSectionId);
    setSelectedSectionId(initialSectionId);
  }

  const activeSectionId = selectedSectionId || DOCS_SECTIONS[0].id;
  const filteredSections = useMemo(() => filterDocsSections(searchQuery), [searchQuery]);

  useEffect(() => {
    if (initialSectionId) {
      requestAnimationFrame(() => {
        document
          .getElementById(initialSectionId)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [initialSectionId]);

  const handleSelectSection = (id: string) => {
    setSelectedSectionId(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/docs#${id}`);
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-200 select-text ${
        isDark ? 'bg-[#080d19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Topbar fixa da documentação */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-[#080d19]/90 border-slate-800/80'
            : 'bg-white/90 border-slate-200/90'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateApp();
              }}
              className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity"
              aria-label="Voltar para a página inicial do RedijaApp"
            >
              <Logo size="sm" variant={isDark ? 'dark' : 'light'} showBetaBadge={false} />
            </a>

            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${
                isDark
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Docs v{APP_VERSION}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Busca rápida desktop */}
            <div className="hidden md:flex relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar norma, atalho ou guia..."
                aria-label="Buscar na documentação"
                className={`w-full pl-8 pr-7 py-1.5 rounded-xl border text-xs outline-hidden transition-colors ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
                    : 'bg-slate-100/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Código-fonte no GitHub"
            >
              <GitHubIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GitHub</span>
            </a>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
              title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onNavigateApp}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-xs active:scale-95 ${
                isDark
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isSessionActive ? (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="sm:hidden">Editor</span>
                  <span className="hidden sm:inline">Voltar ao Editor</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Abrir</span>
                  <span className="hidden sm:inline">Abrir RedijaApp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Corpo da Documentação */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Busca Mobile */}
        <div className="md:hidden mb-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar norma, atalho ou guia..."
            aria-label="Buscar na documentação mobile"
            className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs outline-hidden ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sidebar Navegável */}
          <aside className="w-full lg:w-64 lg:sticky lg:top-20 shrink-0 space-y-4">
            <nav
              aria-label="Seções da documentação"
              className={`p-3 rounded-2xl border space-y-1 ${
                isDark
                  ? 'bg-slate-900/70 border-slate-800'
                  : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <p className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Índice do Guia
              </p>
              {DOCS_SECTIONS.map((section) => {
                const isActive = activeSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => handleSelectSection(section.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : isDark
                          ? 'text-slate-300 hover:bg-slate-800/80 border border-transparent'
                          : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    {SECTION_ICONS[section.id]}
                    <span className="truncate">{section.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Card Open Source & Links Rápidos */}
            <div
              className={`p-4 rounded-2xl border space-y-3 text-xs ${
                isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                <GitHubIcon className="w-4 h-4 text-emerald-500" />
                <span>Projeto Open Source</span>
              </div>
              <p className={isDark ? 'text-slate-400 leading-relaxed' : 'text-slate-600 leading-relaxed'}>
                Código aberto sob licença AGPL-3.0. Explore a arquitetura, execute localmente ou envie sugestões.
              </p>
              <ul className="space-y-1.5 font-medium">
                <li>
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Repositório GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href={GITHUB_CONTRIBUTING_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Guia de Contribuição</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href={GITHUB_ISSUES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Reportar Problema (Issues)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a
                    href={GITHUB_THIRD_PARTY_NOTICES_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <span>Créditos &amp; Typst (Apache-2.0)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </aside>

          {/* Conteúdo Principal */}
          <main className="flex-1 min-w-0 space-y-10">
            {/* Hero da Documentação */}
            <section
              className={`p-6 sm:p-8 rounded-3xl border space-y-4 ${
                isDark
                  ? 'bg-gradient-to-br from-slate-900 via-[#0d1526] to-emerald-950/30 border-slate-800'
                  : 'bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  Documentação Oficial
                </span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  {APP_PUBLIC_URL.replace('https://', '')}/docs
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Guia Completo de Uso & Normas Científicas
              </h1>

              <p
                className={`text-sm sm:text-base leading-relaxed max-w-3xl ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Tudo o que você precisa para redigir TCCs, dissertações, artigos científicos (ABNT,
                SBC, IEEE, APA 7ª), pôsteres A0/A1 e pacotes do Typst Universe diretamente no
                navegador, com privacidade e zero configuração de servidor.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <button
                  type="button"
                  onClick={onNavigateApp}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                >
                  <span>{isSessionActive ? 'Retornar ao Editor' : 'Acessar Aplicação'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border font-semibold transition-colors ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
                      : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <GitHubIcon className="w-3.5 h-3.5" />
                  <span>Ver Código no GitHub</span>
                </a>
              </div>
            </section>

            {/* Resultados Filtrados */}
            {filteredSections.length === 0 ? (
              <div
                className={`p-8 rounded-2xl border text-center space-y-3 ${
                  isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <p className="text-sm font-semibold">
                  Nenhum tópico encontrado para &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Limpar filtro de busca
                </button>
              </div>
            ) : (
              filteredSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-20 space-y-4"
                >
                  <div className="border-b pb-3 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      {SECTION_ICONS[section.id]}
                      <h2 className="text-xl font-bold tracking-tight">{section.label}</h2>
                    </div>
                    <p
                      className={`text-xs sm:text-sm mt-1 ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {section.description}
                    </p>
                  </div>

                  {/* Guias / Artigos da Trilha */}
                  {section.articles.length > 0 && (
                    <div className="grid grid-cols-1 gap-4">
                      {section.articles.map((article) => (
                        <article
                          key={article.id}
                          className={`p-5 rounded-2xl border space-y-3 ${
                            isDark
                              ? 'bg-slate-900/60 border-slate-800'
                              : 'bg-white border-slate-200 shadow-xs'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/25">
                              {article.badge}
                            </span>
                            <h3 className="text-base font-bold">{article.title}</h3>
                          </div>

                          <p
                            className={`text-xs sm:text-sm ${
                              isDark ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            {article.summary}
                          </p>

                          <ul className="space-y-2 pt-1">
                            {article.bullets.map((bullet, idx) => (
                              <li
                                key={idx}
                                className={`flex items-start gap-2 text-xs sm:text-sm ${
                                  isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>

                          {article.codeExample && (
                            <div
                              className={`mt-2 p-3.5 rounded-xl border font-mono text-xs overflow-x-auto flex items-start gap-2 ${
                                isDark
                                  ? 'bg-slate-950 border-slate-800 text-emerald-300'
                                  : 'bg-slate-900 border-slate-800 text-emerald-300'
                              }`}
                            >
                              <Terminal className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                              <pre className="whitespace-pre-wrap">{article.codeExample}</pre>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}

                  {/* Cartões de Normas & Diretrizes Técnicas */}
                  {section.standards && section.standards.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.standards.map((std) => (
                        <div
                          key={std.code}
                          className={`p-5 rounded-2xl border space-y-3 ${
                            isDark
                              ? 'bg-slate-900/50 border-slate-800'
                              : 'bg-white border-slate-200 shadow-xs'
                          }`}
                        >
                          <div>
                            <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {std.code}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold mt-0.5">{std.title}</h3>
                            <p
                              className={`text-xs mt-1 leading-relaxed ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {std.summary}
                            </p>
                          </div>

                          <ul className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                            {std.rulesApplied.map((rule, idx) => (
                              <li
                                key={idx}
                                className={`flex items-start gap-2 text-xs ${
                                  isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{rule}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))
            )}
          </main>
        </div>
      </div>

      {/* Rodapé Institucional */}
      <footer
        className={`border-t py-6 text-xs ${
          isDark
            ? 'bg-[#060a12] border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            RedijaApp v{APP_VERSION} •{' '}
            <a
              href={APP_PUBLIC_URL}
              className="hover:text-emerald-500 font-medium underline-offset-2 hover:underline"
            >
              {APP_PUBLIC_URL.replace('https://', '')}
            </a>
          </span>
          <div className="flex flex-wrap items-center gap-4 font-medium">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-500 transition-colors"
            >
              GitHub
            </a>
            <a
              href={GITHUB_CONTRIBUTING_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-500 transition-colors"
            >
              Contribuir
            </a>
            <a
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-500 transition-colors"
            >
              Issues
            </a>
            <a
              href={GITHUB_LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-500 transition-colors"
            >
              Licença AGPL-3.0
            </a>
            <a
              href={GITHUB_THIRD_PARTY_NOTICES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-500 transition-colors"
            >
              Créditos &amp; Typst
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
