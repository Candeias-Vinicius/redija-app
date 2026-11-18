import React, { useId, useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  /** Texto explicativo exibido no balão. */
  text: string;
  /** Nome acessível do botão. */
  label?: string;
  /** Alinhamento do balão: centralizado no ícone ou terminando nele (perto da borda direita). */
  align?: 'center' | 'end';
  className?: string;
}

/**
 * Ícone "i" com balão explicativo. Abre ao passar o mouse, ao focar pelo
 * teclado ou ao tocar (útil em telas de toque, onde não há hover).
 */
export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  text,
  label = 'Mais informações',
  align = 'center',
  className = '',
}) => {
  const tooltipId = useId();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className={`relative inline-flex group/info ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((open) => !open);
        }}
        onBlur={() => setIsOpen(false)}
        className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <span
        role="tooltip"
        id={tooltipId}
        className={`absolute top-full z-10 mt-1.5 w-60 rounded-lg ${
          align === 'end' ? '-right-2' : 'left-1/2 -translate-x-1/2'
        } bg-slate-900 dark:bg-slate-700 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-hover/info:block group-focus-within/info:block ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        {text}
      </span>
    </span>
  );
};
