import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  ArrowRight,
  Menu,
  X,
  FileCheck2,
} from 'lucide-react';
import { Logo } from '../Logo';
import { GitHubIcon } from '../GitHubIcon';
import { GITHUB_REPO_URL } from '@/core/links';

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
          className="flex items-center gap-2 group transition-transform active:scale-95"
          aria-label="Ir para o início do RedijaApp"
        >
          <Logo size="sm" variant={isDark ? 'dark' : 'light'} />
        </a>

        {/* Direita: Links de Navegação e Ações alinhados */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Navegação Desktop Enxuta */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
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
              className={`px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                isDark
                  ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                  : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
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
              className={`px-2.5 py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              Documentação
            </a>
          </nav>

          {/* Divisor vertical sutil no desktop */}
          <div className="hidden md:block w-px h-5 bg-slate-200 dark:bg-slate-800" />

          {/* Ações da Extrema Direita: GitHub + Tema + Entrar */}
          <div className="flex items-center gap-2">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
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
              className={`p-1.5 sm:p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
              title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              aria-label="Alternar tema"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Botão Único de Login no Topo */}
            <button
              onClick={onOpenLogin}
              disabled={isLoading}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-semibold text-xs transition-all shadow-xs active:scale-95 ${
                isDark
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <span>Entrar com Google</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Botão de Menu Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-1.5 rounded-xl border transition-colors ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-300'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile Retrátil */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b px-4 py-4 space-y-2.5 transition-colors ${
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
                className={`px-3 py-2 rounded-lg text-xs font-medium ${
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
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
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
        </div>
      )}
    </header>
  );
};
