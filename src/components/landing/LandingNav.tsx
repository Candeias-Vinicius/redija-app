import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  Loader2,
  Menu,
  X,
  FileCheck2,
} from 'lucide-react';
import { Logo } from '../Logo';
import { GitHubIcon } from '../GitHubIcon';
import { GoogleLogo } from '../GoogleLogo';
import { GITHUB_REPO_URL } from '@/core/links';
import { LANDING_LOGIN_ATTR } from './landingLogin';

/** Altura aproximada do topo fixo: um botão escondido atrás dele não conta como visível. */
const NAV_OFFSET_PX = 72;

interface LandingNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenDoc: (standardCode?: string) => void;
  onOpenFullDocs?: () => void;
  onOpenLogin: () => void;
  isLoading: boolean;
}

export const LandingNav: React.FC<LandingNavProps> = ({
  isDark,
  onToggleTheme,
  onOpenDoc,
  onOpenFullDocs,
  onOpenLogin,
  isLoading,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Começa oculto (o cartão de login do topo está na tela ao abrir a página)
  const [pageLoginVisible, setPageLoginVisible] = useState(true);
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll(`[${LANDING_LOGIN_ATTR}]`));
    if (targets.length === 0 || typeof IntersectionObserver === 'undefined') {
      // Sem outros botões para observar: o do topo fica sempre visível
      const frame = requestAnimationFrame(() => setPageLoginVisible(false));
      return () => cancelAnimationFrame(frame);
    }
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target);
          else visible.delete(entry.target);
        }
        setPageLoginVisible(visible.size > 0);
      },
      { rootMargin: `-${NAV_OFFSET_PX}px 0px 0px 0px` },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);
  const showNavLogin = !pageLoginVisible;

  const navLinks = [
    { label: 'Recursos', href: '#recursos' },
    { label: 'Demonstração', href: '#demonstracao' },
    { label: 'Modelos', href: '#modelos' },
    { label: 'Linters', href: '#linters' },
    { label: 'Dúvidas', href: '#faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
        isScrolled
          ? isDark
            ? 'bg-[#080d19]/95 backdrop-blur-md border-b border-slate-800/80 shadow-md py-2.5'
            : 'bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs py-2.5'
          : isDark
            ? 'bg-[#080d19]/60 backdrop-blur-xs py-3 border-b border-slate-800/40'
            : 'bg-white/60 backdrop-blur-xs py-3 border-b border-slate-200/40'
      }`}
    >
      {/* Layout de ponta a ponta com espaçamento lateral elegante */}
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Esquerda: Logotipo Compacto */}
        <a
          href="#"
          className="flex shrink-0 items-center gap-2 group transition-transform active:scale-95"
          aria-label="Ir para o início do RedijaApp"
        >
          <Logo size="sm" variant={isDark ? 'dark' : 'light'} />
        </a>

        {/* Direita: Links de Navegação e Ações alinhados */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          {/* Navegação Desktop Enxuta */}
          <nav className="hidden xl:flex items-center gap-1 2xl:gap-2" aria-label="Navegação principal">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                {link.label}
              </a>
            ))}

            {/* Link para o Guia Técnico de Normas com Modal */}
            <button
              onClick={() => onOpenDoc()}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isDark
                  ? 'text-brand-400 hover:text-brand-300 hover:bg-brand-950/30'
                  : 'text-brand-700 hover:text-brand-800 hover:bg-brand-50'
              }`}
            >
              Normas &amp; Guias
            </button>

            <a
              href="/docs"
              onClick={(e) => {
                if (onOpenFullDocs && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  onOpenFullDocs();
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Documentação
            </a>
          </nav>

          {/* Divisor vertical sutil no desktop */}
          <div className="hidden xl:block w-px h-5 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

          {/* Ações da Extrema Direita: GitHub + Tema + Entrar */}
          <div className="flex items-center gap-2">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`touch-target hidden sm:inline-flex items-center justify-center p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Código aberto no GitHub"
              aria-label="Repositório oficial no GitHub"
            >
              <GitHubIcon className="w-3.5 h-3.5" />
            </a>

            {/* Alternar Tema (Dark/Light) */}
            <button
              onClick={onToggleTheme}
              className={`touch-target flex items-center justify-center p-1.5 sm:p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
              title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              aria-label="Alternar tema"
              aria-pressed={isDark}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Login no topo, no padrão visual do Google. Só aparece quando nenhum outro botão
                de login da página está na tela (cartão do topo ou banner final), para não repetir. */}
            <div
              inert={!showNavLogin}
              className={`flex overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-out motion-reduce:transition-none ${
                showNavLogin ? 'max-w-60 opacity-100' : '-ml-2 max-w-0 opacity-0'
              }`}
            >
              <button
                onClick={onOpenLogin}
                disabled={isLoading}
                className={`touch-target inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-offset-[-4px] disabled:opacity-60 ${
                  isDark
                    ? 'border-[#8e918f] bg-[#131314] text-[#e3e3e3] hover:bg-[#1f1f20]'
                    : 'border-[#747775] bg-[#ffffff] text-[#1f1f1f] hover:bg-[#f8f9fa]'
                }`}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" /> : <GoogleLogo />}
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Entrar com Google</span>
              </button>
            </div>

            {/* Botão de Menu Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`xl:hidden touch-target flex items-center justify-center p-1.5 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-300'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile Retrátil */}
      {mobileMenuOpen && (
        <nav
          id="landing-mobile-menu"
          aria-label="Navegação principal"
          className={`xl:hidden border-b px-4 py-4 space-y-2.5 transition-colors ${
            isDark
              ? 'bg-[#0b1220] border-slate-800 text-slate-200'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-slate-200/50 dark:border-slate-800/60">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`touch-target flex items-center px-3 py-2 rounded-lg text-sm font-medium ${
                  isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenDoc();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-brand-500/40 text-brand-700 dark:text-brand-400 text-xs font-semibold"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Guia de Normas (ABNT, SBC, IEEE, APA)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <a
              href="/docs"
              onClick={(e) => {
                setMobileMenuOpen(false);
                if (onOpenFullDocs && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                  e.preventDefault();
                  onOpenFullDocs();
                }
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium ${
                isDark
                  ? 'border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Guia /docs</span>
            </a>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-medium ${
                isDark
                  ? 'border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <GitHubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
};
