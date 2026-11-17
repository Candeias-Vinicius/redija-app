import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface PaneWindowControlsProps {
  /** Nome do painel (ex.: "Estrutura", "Texto", "PDF"). */
  label: string;
  /** O painel é o único visível (maximizado). */
  isMaximized?: boolean;
  /** Deixa só este painel visível. */
  onMaximize?: () => void;
  /** Volta a exibir todos os painéis. */
  onRestore?: () => void;
  /** Esconde este painel (vira uma barra fina de restauração). */
  onMinimize?: () => void;
  /** Ícone do botão de minimizar, que indica para onde o painel recolhe. */
  minimizeIcon: React.ReactNode;
}

const BUTTON =
  'touch-target flex items-center justify-center p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors';

/**
 * Controles de janela de um painel do workspace (desktop): maximizar,
 * restaurar e minimizar, sempre na mesma ordem e com os mesmos ícones.
 */
export const PaneWindowControls: React.FC<PaneWindowControlsProps> = ({
  label,
  isMaximized = false,
  onMaximize,
  onRestore,
  onMinimize,
  minimizeIcon,
}) => {
  if (!onMaximize && !onMinimize && !(isMaximized && onRestore)) return null;

  return (
    <div className="flex items-center gap-0.5 shrink-0" role="group" aria-label={`Painel ${label}`}>
      {isMaximized
        ? onRestore && (
            <button
              type="button"
              onClick={onRestore}
              className={BUTTON}
              title="Restaurar todos os painéis"
              aria-label="Restaurar todos os painéis"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          )
        : onMaximize && (
            <button
              type="button"
              onClick={onMaximize}
              className={BUTTON}
              title={`Maximizar ${label} (ocultar os outros painéis)`}
              aria-label={`Maximizar painel ${label}`}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
      {onMinimize && (
        <button
          type="button"
          onClick={onMinimize}
          className={BUTTON}
          title={`Minimizar ${label}`}
          aria-label={`Minimizar painel ${label}`}
        >
          {minimizeIcon}
        </button>
      )}
    </div>
  );
};
