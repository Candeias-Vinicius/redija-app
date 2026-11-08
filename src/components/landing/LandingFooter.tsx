import React from 'react';
import {
  Heart,
} from 'lucide-react';
import { Logo } from '../Logo';
import { LandingModalType } from './LandingModals';
import { APP_VERSION } from '@/core/version';

interface LandingFooterProps {
  isDark: boolean;
  onOpenModal: (type: LandingModalType, standardCode?: string) => void;
  onScrollToTop: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({
  isDark,
  onOpenModal,
  onScrollToTop,
}) => {
  return (
    <footer
      className={`border-t transition-colors ${
        isDark
          ? 'bg-[#060a12] border-slate-800 text-slate-400'
          : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Coluna 1: Marca e Visão */}
          <div className="lg:col-span-4 space-y-4">
            <div onClick={onScrollToTop} className="cursor-pointer inline-block">
              <Logo size="md" variant={isDark ? 'dark' : 'light'} />
            </div>

            <p className="text-xs sm:text-sm leading-relaxed max-w-sm">
              O editor acadêmico visual moderno com motor Typst WebAssembly. Democratizando a redação acadêmica e científica de excelência no Brasil, com 100% de conformidade com as normas ABNT.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Typst 0.12+ WASM
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Google Drive BYOS
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                WebRTC P2P
              </span>
            </div>
          </div>

          {/* Coluna 2: Produto & Recursos */}
          <div className="lg:col-span-2 space-y-3 text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Recursos
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#recursos" className="hover:text-emerald-500 transition-colors">
                  Editor Visual Notion
                </a>
              </li>
              <li>
                <a href="#recursos" className="hover:text-emerald-500 transition-colors">
                  Motor Typst WASM
                </a>
              </li>
              <li>
                <a href="#recursos" className="hover:text-emerald-500 transition-colors">
                  Google Drive Pessoal
                </a>
              </li>
              <li>
                <a href="#recursos" className="hover:text-emerald-500 transition-colors">
                  Colaboração em Tempo Real
                </a>
              </li>
              <li>
                <a href="#modelos" className="hover:text-emerald-500 transition-colors">
                  Galeria de Modelos
                </a>
              </li>
              <li>
                <a href="#recursos" className="hover:text-emerald-500 transition-colors">
                  Importador de Word (.docx)
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Normas ABNT (Abre Modal na Norma) */}
          <div className="lg:col-span-2 space-y-3 text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Normas ABNT
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onOpenModal('docs', 'ABNT NBR 14724')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  NBR 14724 (Trabalhos)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('docs', 'ABNT NBR 6023')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  NBR 6023 (Referências)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('docs', 'ABNT NBR 10520 (2002 e atualização 2023)')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  NBR 10520 (Citações)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('docs', 'ABNT NBR 6024')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  NBR 6024 (Numeração)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('docs', 'ABNT NBR 6028')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  NBR 6028 (Resumo)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('docs')}
                  className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                >
                  Ver todas as 9 normas &rarr;
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Institucional & Sobre */}
          <div className="lg:col-span-2 space-y-3 text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Sobre Nós
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onOpenModal('about')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  A História do Redija
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('about')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  Por que Criamos o App
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('contact')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  Fale Conosco
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('contact')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  Reportar um Problema
                </button>
              </li>
            </ul>
          </div>

          {/* Coluna 5: Privacidade & Termos */}
          <div className="lg:col-span-2 space-y-3 text-xs">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
              Legal &amp; Dados
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onOpenModal('privacy')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  Política de Privacidade
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('privacy')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  Conformidade LGPD
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('terms')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  Termos de Uso
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenModal('terms')}
                  className="hover:text-emerald-500 transition-colors text-left"
                >
                  Código Aberto (MIT)
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Rodapé Final */}
        <div className="pt-10 mt-12 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="flex items-center gap-1.5 text-center sm:text-left">
            <span>RedijaApp v{APP_VERSION} © 2026 • Construído com</span>
            <Heart className="w-3.5 h-3.5 text-emerald-500 inline fill-emerald-500" />
            <span>para a comunidade acadêmica brasileira.</span>
          </p>

          <div className="flex items-center gap-6">
            <button
              onClick={() => onOpenModal('privacy')}
              className="hover:text-emerald-500 transition-colors"
            >
              Privacidade
            </button>
            <button
              onClick={() => onOpenModal('terms')}
              className="hover:text-emerald-500 transition-colors"
            >
              Termos
            </button>
            <button
              onClick={onScrollToTop}
              className="hover:text-emerald-500 transition-colors font-semibold"
            >
              Voltar ao Topo &uarr;
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
