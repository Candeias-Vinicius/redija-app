import React, { useState } from 'react';
import { Archive, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { PreservedFieldInfo } from '@/core/templates/templateCapabilities';

interface SidebarPreservedFieldsSectionProps {
  fields: PreservedFieldInfo[];
  templateBadgeLabel: string;
}

export const SidebarPreservedFieldsSection: React.FC<SidebarPreservedFieldsSectionProps> = ({
  fields,
  templateBadgeLabel,
}) => {
  const [open, setOpen] = useState(false);

  if (fields.length === 0) return null;

  return (
    <div className="p-3 bg-neutral-50/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-600 py-1.5 hover:text-neutral-900"
      >
        <span className="flex items-center gap-2">
          <Archive className="w-3.5 h-3.5 text-neutral-400" />
          <span>Campos preservados ({fields.length})</span>
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div className="mt-2 pl-2 space-y-2">
          <p className="text-[10px] text-neutral-500 leading-snug flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
            <span>
              Estes dados continuam salvos no projeto, mas não são exibidos no PDF pelo modelo{' '}
              <strong>{templateBadgeLabel}</strong>. Ao voltar para ABNT, eles reaparecem automaticamente.
            </span>
          </p>

          <div className="space-y-1.5">
            {fields.map((f) => (
              <div
                key={String(f.id)}
                className="p-2 rounded-md bg-white border border-neutral-200 text-[11px] space-y-0.5"
              >
                <div className="font-medium text-neutral-700">{f.label}</div>
                <div className="text-[10px] text-neutral-500 line-clamp-2 break-words">
                  {f.preview}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
