import React, { useState } from 'react';
import { APP_VERSION } from '@/core/version';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showBetaBadge?: boolean;
  onBetaClick?: () => void;
  className?: string;
  variant?: 'dark' | 'light' | 'auto';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showWordmark = true,
  showBetaBadge = true,
  onBetaClick,
  className = '',
  variant = 'auto',
}) => {
  const [imgError, setImgError] = useState(false);

  // Dimensões do ícone
  const iconHeight =
    size === 'sm'
      ? 'h-7'
      : size === 'md'
        ? 'h-9'
        : size === 'lg'
          ? 'h-12'
          : 'h-16';

  const iconWidth =
    size === 'sm'
      ? 'w-7'
      : size === 'md'
        ? 'w-9'
        : size === 'lg'
          ? 'w-12'
          : 'w-16';

  // Tipografia da palavra RedijaApp
  const textClass =
    size === 'sm'
      ? 'text-base font-bold'
      : size === 'md'
        ? 'text-lg font-bold'
        : size === 'lg'
          ? 'text-2xl md:text-3xl font-extrabold'
          : 'text-4xl font-extrabold';

  const redijaColor =
    variant === 'dark'
      ? 'text-white'
      : variant === 'light'
        ? 'text-slate-900'
        : 'text-slate-900 dark:text-white';

  const baseUrl = import.meta.env.BASE_URL || '/';
  const logoSrc = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}logo.png`;

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Ícone Oficial: PNG com fallback automático para SVG vetorial em caso de falha de carregamento */}
      {!imgError ? (
        <img
          src={logoSrc}
          alt=""
          aria-hidden="true"
          onError={() => setImgError(true)}
          className={`${iconHeight} w-auto object-contain shrink-0 drop-shadow-xs`}
        />
      ) : (
        <div
          className={`${iconHeight} ${iconWidth} rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-black shadow-xs shrink-0`}
          aria-hidden="true"
        >
          <svg className="w-3/5 h-3/5" viewBox="0 0 64 64" fill="none">
            <path
              d="M16 12h18c7.5 0 13 4.5 13 12 0 5.3-3 9.4-8 11.2L48 50h-9.5l-7.8-12.8H24V50h-8V12zm8 7v11h8.5c3.6 0 5.8-2 5.8-5.5s-2.2-5.5-5.8-5.5H24z"
              fill="currentColor"
            />
          </svg>
        </div>
      )}

      {/* Nome do Aplicativo e Selo Beta */}
      {showWordmark && (
        <div className="flex items-center tracking-tight leading-none gap-1.5">
          <div className="flex items-center">
            <span className={`${textClass} ${redijaColor} transition-colors`}>
              Redija
            </span>
            <span className={`${textClass} text-emerald-500 dark:text-emerald-400 font-extrabold`}>
              App
            </span>
          </div>
          {showBetaBadge && (
            <span
              onClick={(e) => {
                if (onBetaClick) {
                  e.stopPropagation();
                  onBetaClick();
                }
              }}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 select-none ${
                onBetaClick
                  ? 'cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-500/40 active:scale-95 transition-all'
                  : ''
              }`}
              title={`RedijaApp v${APP_VERSION}${onBetaClick ? ' • Clique para informações do Beta' : ''}`}
            >
              Beta
            </span>
          )}
        </div>
      )}
    </div>
  );
};
