import React from 'react';

interface PaneRestoreRailProps {
  /** Nome do painel minimizado (ex.: "Estrutura"). */
  label: string;
  icon: React.ReactNode;
  onRestore: () => void;
  /** Lado em que a barra fica, para desenhar a borda correta. */
  side: 'left' | 'center' | 'right';
}

/**
 * Barra fina que ocupa o lugar de um painel minimizado no desktop.
 * Mostra o nome do painel e o restaura com um clique.
 */
export const PaneRestoreRail: React.FC<PaneRestoreRailProps> = ({
  label,
  icon,
  onRestore,
  side,
}) => (
  <button
    type="button"
    onClick={onRestore}
    aria-label={`Mostrar painel ${label}`}
    title={`Mostrar painel ${label}`}
    className={`w-10 shrink-0 flex flex-col items-center gap-2 py-3 bg-surface hover:bg-surface-sunken text-slate-600 dark:text-slate-300 hover:text-brand-700 dark:hover:text-brand-400 border-line transition-colors ${
      side === 'left' ? 'border-r' : side === 'right' ? 'border-l' : 'border-x'
    }`}
  >
    {icon}
    <span className="text-xs font-medium tracking-wide [writing-mode:vertical-rl]">{label}</span>
  </button>
);
