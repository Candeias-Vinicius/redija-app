import React from 'react';

interface LogoProps {
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
  // Dimensões do símbolo SVG
  const iconHeight =
    size === 'sm' ? 28 : size === 'md' ? 38 : size === 'lg' ? 48 : 64;
  const iconWidth = Math.round(iconHeight * 1.2);

  // Tipografia da palavra RedijaApp
  const textClass =
    size === 'sm'
      ? 'text-base'
      : size === 'md'
        ? 'text-xl'
        : size === 'lg'
          ? 'text-2xl'
          : 'text-3xl';

  // Cores do texto baseadas na variante
  const redijaTextColor =
    variant === 'dark'
      ? 'text-white'
      : variant === 'light'
        ? 'text-slate-900'
        : 'text-slate-900 dark:text-white';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Símbolo Vetorial: R Neoclássico com Gradiente Esmeralda-Ciano + Três Páginas Fanning */}
      <svg
        width={iconWidth}
        height={iconHeight}
        viewBox="0 0 100 82"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 overflow-visible"
      >
        <defs>
          {/* Brilho radial suave ao fundo (Ethereal Glow) */}
          <radialGradient
            id="logoGlow"
            cx="50%"
            cy="45%"
            r="55%"
            fx="50%"
            fy="45%"
          >
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          {/* Gradiente principal da letra R (Verde Menta -> Ciano -> Azul Elétrico) */}
          <linearGradient id="rGrad" x1="12" y1="8" x2="65" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="28%" stopColor="#10b981" />
            <stop offset="58%" stopColor="#06b6d4" />
            <stop offset="85%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>

          {/* Brilho superior / chanfro da haste vertical do R */}
          <linearGradient id="rSheen" x1="18" y1="8" x2="28" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* Gradiente Página 1 (Inferior / Azul Intenso) */}
          <linearGradient id="pageGrad1" x1="42" y1="56" x2="78" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0369a1" />
            <stop offset="45%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>

          {/* Gradiente Página 2 (Intermediária / Ciano Brilhante) */}
          <linearGradient id="pageGrad2" x1="44" y1="48" x2="74" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#67e8f9" />
          </linearGradient>

          {/* Gradiente Página 3 (Superior / Verde Menta Acadêmico) */}
          <linearGradient id="pageGrad3" x1="44" y1="40" x2="62" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="45%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>

          {/* Brilho das bordas das páginas */}
          <linearGradient id="edgeSheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Aura de iluminação ambiente (Glow) */}
        <circle cx="48" cy="38" r="38" fill="url(#logoGlow)" />

        {/* ============================================================ */}
        {/* PÁGINAS DO LIVRO ABERTO (FANNING PAGES)                       */}
        {/* ============================================================ */}

        {/* Página 3: Superior (Menta / Ciano) */}
        <g>
          {/* Corpo da página superior */}
          <path
            d="M44 38 C46 32 50 20 58 12 C60 9 62 10 63 13 C61 22 56 32 50 39 Z"
            fill="url(#pageGrad3)"
          />
          {/* Borda externa de luz */}
          <path
            d="M44 38 C46 32 50 20 58 12 C60 9 62 10 63 13"
            stroke="url(#edgeSheen)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Página 2: Intermediária (Ciano / Turquesa) */}
        <g>
          {/* Corpo da página intermediária */}
          <path
            d="M45 44 C48 37 57 26 70 19 C73 17 74 19 75 22 C70 31 62 40 52 46 Z"
            fill="url(#pageGrad2)"
          />
          {/* Borda externa de luz */}
          <path
            d="M45 44 C48 37 57 26 70 19 C73 17 74 19 75 22"
            stroke="url(#edgeSheen)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Página 1: Inferior (Azul Elétrico / Céu) */}
        <g>
          {/* Corpo da página inferior */}
          <path
            d="M46 50 C50 44 62 36 78 32 C81 31 82 33 82 36 C76 44 66 51 53 52 Z"
            fill="url(#pageGrad1)"
          />
          {/* Borda externa de luz */}
          <path
            d="M46 50 C50 44 62 36 78 32 C81 31 82 33 82 36"
            stroke="url(#edgeSheen)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* ============================================================ */}
        {/* MONOGRAMA DA LETRA "R" NEOCLÁSSICA ESTILIZADA                 */}
        {/* ============================================================ */}
        {/* Sombra / Glow sutil da própria letra */}
        <path
          d="M13 14 C17 14 20 16 20 20 L20 56 C20 59 17 61 13 61 L29 61 C25 61 22 59 22 56 L22 36 L34 36 C44 36 50 31 50 23 C50 15 44 10 33 10 L13 10 C10 10 7 8 7 6 L19 6 C17 8 15 11 13 14 Z
             M22 17 L32 17 C39 17 43 19 43 23 C43 27 39 29 32 29 L22 29 Z"
          fill="none"
        />

        {/* Letra R completa com traço e curvas fiéis à imagem */}
        <g>
          {/* Haste Vertical e Serifas Superior e Inferior */}
          {/* Corpo principal do R unificado */}
          <path
            d="M12 12
               C 10 9 7 8 6 8
               L 26 8
               C 23 8 20 11 20 16
               L 20 53
               C 20 57 23 59 26 59
               L 10 59
               C 13 59 16 57 16 53
               L 16 16
               C 16 13 14 12 12 12
               Z"
            fill="url(#rGrad)"
          />

          {/* Arco Superior do R (Loop / Bojo) */}
          <path
            d="M20 14
               L 34 14
               C 44 14 49 19 49 26
               C 49 33 43 37 34 37
               L 20 37
               Z"
            fill="url(#rGrad)"
          />

          {/* Vazio Interno do Arco do R (Contorno Branco / Transparente) */}
          <path
            d="M22 20
               L 33 20
               C 39 20 42 22 42 25.5
               C 42 29 39 31 33 31
               L 22 31
               Z"
            fill={variant === 'dark' ? '#0b0f19' : variant === 'light' ? '#f8fafc' : 'currentColor'}
            className={
              variant === 'auto'
                ? 'text-slate-50 dark:text-slate-900 transition-colors'
                : ''
            }
          />

          {/* Perna Curvada Inferior do R (Swoosh elegante para a direita) */}
          <path
            d="M30 35
               C 36 35 40 40 45 49
               C 48 55 53 59 62 60
               C 64 60.3 64 61.5 61 61.5
               C 51 61.5 45 57 41 50
               C 37 43 33 38 27 37
               Z"
            fill="url(#rGrad)"
          />

          {/* Chanfro / Brilho de acabamento na haste */}
          <path
            d="M16 16 L20 16 L20 53 L16 53 Z"
            fill="url(#rSheen)"
            opacity="0.3"
          />
        </g>
      </svg>

      {/* Tipografia Oficial: "Redija" (Branco ou Ardósia) + "App" (Verde Menta) */}
      {showWordmark && (
        <div className="flex items-center tracking-tight font-extrabold">
          <span className={`${textClass} ${redijaTextColor} font-extrabold tracking-tight`}>
            Redija
          </span>
          <span className={`${textClass} text-emerald-400 font-extrabold tracking-tight`}>
            App
          </span>
        </div>
      )}
    </div>
  );
};
