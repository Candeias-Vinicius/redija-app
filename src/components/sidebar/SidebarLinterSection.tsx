import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { AbntWarning } from '@/core/transpiler/abntLinter';
import { TemplateCapabilities } from '@/core/templates/templateCapabilities';

interface SidebarLinterSectionProps {
  capabilities: TemplateCapabilities;
  warnings: AbntWarning[];
  onOpenAbntGuide?: () => void;
}

export const SidebarLinterSection: React.FC<SidebarLinterSectionProps> = ({
  capabilities,
  warnings,
  onOpenAbntGuide,
}) => {
  const [open, setOpen] = useState(true);

  const renderSectionTitle = () => {
    if (capabilities.linterStatusMode === 'abnt_active') {
      return `Verificador ABNT (${warnings.length})`;
    }
    if (capabilities.linterStatusMode === 'abnt_modified') {
      return 'Verificador ABNT (Pausado)';
    }
    return `Verificador (${capabilities.badgeLabel})`;
  };

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
      >
        <span className="flex items-center gap-2">
          <ShieldCheck
            className={`w-3.5 h-3.5 ${
              capabilities.linterStatusMode === 'abnt_active'
                ? warnings.length === 0
                  ? 'text-emerald-600'
                  : 'text-amber-500'
                : 'text-neutral-400'
            }`}
          />
          <span>{renderSectionTitle()}</span>
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-2 space-y-1.5 pl-2">
          {capabilities.linterStatusMode === 'abnt_active' ? (
            warnings.length === 0 ? (
              <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tudo em conformidade com as regras verificadas da ABNT!</span>
              </div>
            ) : (
              warnings.map((w) => (
                <div
                  key={w.id}
                  className={`p-2 rounded-md border text-[11px] space-y-0.5 ${
                    w.severity === 'warning'
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : 'bg-blue-50/60 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {w.severity === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                    <span>{w.title}</span>
                  </div>
                  <p className="text-[10px] opacity-85 leading-snug pl-5">{w.description}</p>
                </div>
              ))
            )
          ) : capabilities.linterStatusMode === 'abnt_modified' ? (
            <div className="p-2.5 rounded-md bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Modo {capabilities.badgeLabel} ativo</span>
              </div>
              <p className="text-[10px] opacity-85 leading-snug pl-5">
                A verificação estrita da ABNT foi pausada porque este documento utiliza formatação personalizada.
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-md bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-700 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                <span>Modelo {capabilities.badgeLabel}</span>
              </div>
              <p className="text-[10px] text-neutral-500 leading-snug pl-5">
                O verificador estrito da ABNT fica desativado neste template para evitar alertas incompatíveis.
              </p>
            </div>
          )}

          {onOpenAbntGuide && capabilities.showAbntGuide && (
            <button
              type="button"
              onClick={onOpenAbntGuide}
              className="w-full mt-2.5 flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors shadow-2xs"
              title="Consultar resumo rápido das normas ABNT atendidas (NBR 14724, 10520, 6023, 6028)"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Guia de Normas ABNT</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
