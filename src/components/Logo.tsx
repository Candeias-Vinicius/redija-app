import React from 'react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  variant?: 'dark' | 'light' | 'auto';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
  variant = 'auto',
}) => {
  // Ajuste de altura do ícone do logotipo
  const iconHeight =
    size === 'sm' ? 'h-8' : size === 'md' ? 'h-12' : size === 'lg' ? 'h-16 md:h-20' : 'h-28';

  // Tipografia da palavra RedijaApp
  const textClass =
    size === 'sm'
      ? 'text-base'
      : size === 'md'
        ? 'text-xl'
        : size === 'lg'
          ? 'text-2xl md:text-3xl'
          : 'text-4xl';

  const redijaColor =
    variant === 'dark'
      ? 'text-white'
      : variant === 'light'
        ? 'text-slate-900'
        : 'text-slate-900 dark:text-white';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* O Ícone Oficial do RedijaApp (Sem Fundo / Transparente) */}
      <img
        src="/logo.png"
        alt="RedijaApp"
        className={`${iconHeight} w-auto object-contain shrink-0 drop-shadow-sm`}
      />

      {/* Nome do Aplicativo (Separado do Ícone, Tipografia Limpa) */}
      {showWordmark && (
        <div className="flex items-center tracking-tight font-extrabold leading-none">
          <span className={`${textClass} ${redijaColor} transition-colors`}>
            Redija
          </span>
          <span className={`${textClass} text-emerald-500 dark:text-emerald-400 font-extrabold`}>
            App
          </span>
        </div>
      )}
    </div>
  );
};
