import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  variant?: 'emerald' | 'white';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
  variant = 'emerald',
}) => {
  // Dimensões do ícone
  const dimension =
    size === 'sm' ? 28 : size === 'md' ? 36 : size === 'lg' ? 44 : 54;

  const textClass =
    size === 'sm'
      ? 'text-sm'
      : size === 'md'
        ? 'text-lg'
        : size === 'lg'
          ? 'text-xl'
          : 'text-2xl';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Símbolo Vetorial do Redija */}
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
      >
        <defs>
          {/* Gradiente principal verde esmeralda para verde-azulado acadêmico */}
          <linearGradient id="redijaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>

          {/* Gradiente do papel com brilho suave */}
          <linearGradient id="pageGrad" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ecfdf5" stopOpacity="0.85" />
          </linearGradient>

          {/* Gradiente do detalhe da pena de escrita */}
          <linearGradient id="penAccent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Fundo arredondado com efeito Squircle */}
        <rect
          width="48"
          height="48"
          rx="12"
          fill={variant === 'white' ? '#ffffff' : 'url(#redijaGrad)'}
        />

        {/* Borda interna sutil */}
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx="11"
          stroke={variant === 'white' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.2)'}
          strokeWidth="1.5"
          fill="none"
        />

        {/* Folha / Página de Documento ABNT (lado esquerdo com orelha dobrada) */}
        <path
          d="M13 12C13 10.8954 13.8954 10 15 10H27L35 18V36C35 37.1046 34.1046 38 33 38H15C13.8954 38 13 37.1046 13 36V12Z"
          fill={variant === 'white' ? '#ecfdf5' : 'rgba(255,255,255,0.18)'}
        />

        {/* Orelha dobrada da página */}
        <path
          d="M27 10V16C27 17.1046 27.8954 18 29 18H35L27 10Z"
          fill={variant === 'white' ? '#10b981' : '#ffffff'}
          fillOpacity={variant === 'white' ? '0.3' : '0.4'}
        />

        {/* Monograma "R" dinâmico: união do corpo do livro e traço da pena */}
        {/* Haste vertical do R */}
        <rect
          x="18"
          y="15"
          width="3.5"
          height="18"
          rx="1.75"
          fill={variant === 'white' ? '#059669' : '#ffffff'}
        />

        {/* Arco superior do R (formato de elipse aberta) */}
        <path
          d="M20 15H26.5C29 15 31 16.8 31 19.5C31 22.2 29 24 26.5 24H20V15Z"
          fill={variant === 'white' ? '#059669' : '#ffffff'}
        />
        {/* Vazio interno do arco do R */}
        <path
          d="M21.5 17.8H26C27.2 17.8 28.2 18.5 28.2 19.5C28.2 20.5 27.2 21.2 26 21.2H21.5V17.8Z"
          fill={variant === 'white' ? '#ecfdf5' : '#077a56'}
        />

        {/* Perna diagonal do R (estilizada com pena de escrita) */}
        <path
          d="M24 23L30.5 32C31 32.7 30.5 33.5 29.5 33.5C29 33.5 28.5 33.2 28.2 32.7L22.5 24.5C23.1 24.1 23.6 23.6 24 23Z"
          fill={variant === 'white' ? '#047857' : 'url(#pageGrad)'}
        />

        {/* Ponto / Faísca de precisão tipográfica */}
        <circle
          cx="33.5"
          cy="14.5"
          r="1.8"
          fill={variant === 'white' ? '#059669' : '#ffffff'}
          fillOpacity="0.9"
        />
      </svg>

      {/* Wordmark (Nome da marca + Badge) */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <span
            className={`font-extrabold tracking-tight ${textClass} ${
              variant === 'white' ? 'text-white' : 'text-slate-900'
            }`}
          >
            Redija
          </span>
          <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs">
            ABNT
          </span>
        </div>
      )}
    </div>
  );
};
