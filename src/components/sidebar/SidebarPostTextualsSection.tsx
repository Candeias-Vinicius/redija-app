import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { DocumentMetadata } from '@/types/document';
import { PosTextualFieldId, TemplateCapabilities } from '@/core/templates/templateCapabilities';

interface SidebarPostTextualsSectionProps {
  metadata: DocumentMetadata;
  capabilities: TemplateCapabilities;
  readOnly?: boolean;
  onUpdateField: <K extends keyof DocumentMetadata>(
    field: K,
    value: DocumentMetadata[K],
  ) => void;
}

export const SidebarPostTextualsSection: React.FC<SidebarPostTextualsSectionProps> = ({
  metadata,
  capabilities,
  readOnly = false,
  onUpdateField,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!capabilities.showPostTextuals) return null;

  const hasField = (fieldId: PosTextualFieldId) => capabilities.posTextualFields.includes(fieldId);

  return (
    <div className="p-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
      >
        <span className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
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
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Glossário (Definição de termos técnicos, Opcional)
              </label>
              <textarea
                rows={2}
                value={metadata.glossary || ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (!readOnly) onUpdateField('glossary', e.target.value);
                }}
                placeholder="Ex: WebAssembly: Formato de instrução binária para execução na web..."
                className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}

          {hasField('appendices') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Apêndices (Elaborados pelo autor, Opcional)
              </label>
              <textarea
                rows={3}
                value={metadata.appendices || ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (!readOnly) onUpdateField('appendices', e.target.value);
                }}
                placeholder="Ex: APÊNDICE A - Questionário aplicado aos participantes..."
                className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}

          {hasField('annexes') && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Anexos (Documentos de terceiros, Opcional)
              </label>
              <textarea
                rows={3}
                value={metadata.annexes || ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (!readOnly) onUpdateField('annexes', e.target.value);
                }}
                placeholder="Ex: ANEXO A - Parecer do Comitê de Ética..."
                className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
