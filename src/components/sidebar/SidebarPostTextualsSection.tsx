import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { DocumentMetadata } from '@/types/document';
import { PosTextualFieldId, TemplateCapabilities } from '@/core/templates/templateCapabilities';

interface SidebarPostTextualsSectionProps {
  metadata: DocumentMetadata;
  capabilities: TemplateCapabilities;
  onUpdateField: <K extends keyof DocumentMetadata>(
    field: K,
    value: DocumentMetadata[K],
  ) => void;
}

export const SidebarPostTextualsSection: React.FC<SidebarPostTextualsSectionProps> = ({
  metadata,
  capabilities,
  onUpdateField,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!capabilities.showPostTextuals) return null;

  const hasField = (fieldId: PosTextualFieldId) => capabilities.posTextualFields.includes(fieldId);

  return (
    <div className="p-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 py-1.5 hover:text-slate-900"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          Apêndices &amp; Anexos (Pós-Textual)
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-3 mt-2.5 pl-2 text-xs">
          {hasField('glossary') && (
            <div>
              <label htmlFor="sb-pos-glossario-definicao-de-termos-tecnicos-o" className="text-xs font-medium text-slate-500 block mb-1">
                Glossário (Definição de termos técnicos, Opcional)
              </label>
              <textarea
                id="sb-pos-glossario-definicao-de-termos-tecnicos-o"
                rows={2}
                value={metadata.glossary || ''}
                onChange={(e) => onUpdateField('glossary', e.target.value)}
                placeholder="Ex: WebAssembly: Formato de instrução binária para execução na web..."
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {hasField('appendices') && (
            <div>
              <label htmlFor="sb-pos-apendices-elaborados-pelo-autor-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Apêndices (Elaborados pelo autor, Opcional)
              </label>
              <textarea
                id="sb-pos-apendices-elaborados-pelo-autor-opcional"
                rows={3}
                value={metadata.appendices || ''}
                onChange={(e) => onUpdateField('appendices', e.target.value)}
                placeholder="Ex: APÊNDICE A - Questionário aplicado aos participantes..."
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {hasField('annexes') && (
            <div>
              <label htmlFor="sb-pos-anexos-documentos-de-terceiros-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Anexos (Documentos de terceiros, Opcional)
              </label>
              <textarea
                id="sb-pos-anexos-documentos-de-terceiros-opcional"
                rows={3}
                value={metadata.annexes || ''}
                onChange={(e) => onUpdateField('annexes', e.target.value)}
                placeholder="Ex: ANEXO A - Parecer do Comitê de Ética..."
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
