import React, { useState, useEffect } from 'react';
import {
  Sun,
  Moon,
  BookOpen,
  ArrowRight,
  Menu,
  X,
  FileCheck2,
} from 'lucide-react';
import { Logo } from '../Logo';

interface LandingNavProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenDoc: (standardCode?: string) => void;
  onOpenLogin: () => void;
  onContinueAsGuest: () => void;
  isLoading: boolean;
}

export const LandingNav: React.FC<LandingNavProps> = ({
  isDark,
  onToggleTheme,
  onOpenDoc,
  onOpenLogin,
  onContinueAsGuest,
  isLoading,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Recursos', href: '#recursos' },
    { label: 'Demonstração', href: '#demonstracao' },
    { label: 'Normas ABNT', href: '#normas' },
    { label: 'Modelos', href: '#modelos' },
    { label: 'Como Funciona', href: '#como-funciona' },
    { label: 'Dúvidas', href: '#faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? isDark
            ? 'bg-[#080d19]/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20 py-3'
            : 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a
          href="#"
          className="flex items-center gap-2 group transition-transform active:scale-95"
          aria-label="Ir para o início do RedijaApp"
        >
          <Logo size="md" variant={isDark ? 'dark' : 'light'} />
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-850/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              {link.label}
            </a>
          ))}

          {/* Botão de Documentação ABNT */}
          <button
            onClick={() => onOpenDoc()}
            className={`ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isDark
                ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-500/50'
                : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guia ABNT</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Alternar Tema (Dark/Light) */}
          <button
            onClick={onToggleTheme}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 text-amber-300 hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            aria-label="Alternar tema"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Botão Secundário: Convidado (desktop) */}
          <button
            onClick={onContinueAsGuest}
            className={`hidden sm:inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
              isDark
                ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Modo Local
          </button>

          {/* Botão Primário: Entrar com Google */}
          <button
            onClick={onOpenLogin}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all transform active:scale-95 ${
              isDark
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
            }`}
          >
            <span>Entrar com Google</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Botão de Menu Mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden p-2 rounded-xl border transition-colors ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-300'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
            aria-label="Abrir menu de navegação"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu Mobile Retrátil */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden border-b px-4 py-5 space-y-3 transition-colors ${
            isDark
              ? 'bg-[#0b1220] border-slate-800 text-slate-200'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="grid grid-cols-2 gap-2 pt-1 pb-3 border-b border-slate-200/50 dark:border-slate-800/60">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenDoc();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Ver Documentação das 9 Normas ABNT</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onContinueAsGuest();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-center text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
            >
              Usar no Modo Local (Sem Conectar Conta)
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
