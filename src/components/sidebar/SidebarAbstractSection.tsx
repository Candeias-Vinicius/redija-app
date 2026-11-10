import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { DocumentMetadata } from '@/types/document';
import { countWords } from '@/core/transpiler/abntLinter';
import { TemplateCapabilities } from '@/core/templates/templateCapabilities';
import { getAbstractWordRange } from './sidebarHelpers';

interface SidebarAbstractSectionProps {
  metadata: DocumentMetadata;
  capabilities: TemplateCapabilities;
  readOnly?: boolean;
  onUpdateField: <K extends keyof DocumentMetadata>(
    field: K,
    value: DocumentMetadata[K],
  ) => void;
}

export const SidebarAbstractSection: React.FC<SidebarAbstractSectionProps> = ({
  metadata,
  capabilities,
  readOnly = false,
  onUpdateField,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const abstractWordCount = useMemo(() => countWords(metadata.abstract), [metadata.abstract]);

  if (!capabilities.showResumoSection) return null;

  const { min: abstractMin, max: abstractMax } = getAbstractWordRange(capabilities.effectiveType);
  const isAbstractCountIdeal = abstractWordCount >= abstractMin && abstractWordCount <= abstractMax;

  return (
    <div className="p-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-700 py-1.5 hover:text-neutral-900"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
          {capabilities.isAbntFamily
            ? 'Resumo & Abstract (NBR 6028)'
            : capabilities.effectiveType === 'ieee'
              ? 'Abstract & Index Terms'
              : 'Resumo & Palavras-chave'}
        </span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-2.5 mt-2 pl-2">
          {capabilities.resumoFields.resumo && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-neutral-500">
                  {capabilities.effectiveType === 'ieee' ? 'Abstract' : 'Resumo em Português'}
                </label>
                {capabilities.isAbntFamily ||
                capabilities.effectiveType === 'sbc' ||
                capabilities.effectiveType === 'ieee' ? (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isAbstractCountIdeal
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                    title={`Recomendação do modelo: entre ${abstractMin} e ${abstractMax} palavras`}
                  >
                    {abstractWordCount} / {abstractMin}–{abstractMax} palavras
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                    {abstractWordCount} palavras
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={metadata.abstract}
                readOnly={readOnly}
                onChange={(e) => {
                  if (!readOnly) onUpdateField('abstract', e.target.value);
                }}
                placeholder={
                  capabilities.effectiveType === 'ieee'
                    ? 'Concise English abstract summarizing objectives, methodology and main findings...'
                    : `Texto do resumo em parágrafo único (${abstractMin} a ${abstractMax} palavras conforme NBR 6028)...`
                }
                className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}

          {capabilities.resumoFields.keywords && (
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                {capabilities.effectiveType === 'ieee'
                  ? 'Index Terms / Palavras-chave (vírgula)'
                  : 'Palavras-chave (separadas por vírgula)'}
              </label>
              <input
                type="text"
                value={metadata.keywords.join(', ')}
                readOnly={readOnly}
                onChange={(e) => {
                  if (!readOnly) {
                    onUpdateField(
                      'keywords',
                      e.target.value.split(',').map((k) => k.trim()),
                    );
                  }
                }}
                placeholder={
                  capabilities.effectiveType === 'ieee'
                    ? 'Ex: Edge Computing, IoT, Performance'
                    : 'Ex: ABNT, Typst, Editor Acadêmico'
                }
                className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}

          {capabilities.resumoFields.foreignAbstract && (
            <div className="pt-2 border-t border-neutral-100">
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Abstract (Língua Estrangeira, Opcional)
              </label>
              <textarea
                rows={3}
                value={metadata.foreignAbstract || ''}
                readOnly={readOnly}
                onChange={(e) => {
                  if (!readOnly) onUpdateField('foreignAbstract', e.target.value);
                }}
                placeholder="English abstract..."
                className="w-full text-xs p-2 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600 mb-1.5"
              />
              <input
                type="text"
                value={(metadata.foreignKeywords ?? []).join(', ')}
                readOnly={readOnly}
                onChange={(e) => {
                  if (!readOnly) {
                    onUpdateField(
                      'foreignKeywords',
                      e.target.value.split(',').map((k) => k.trim()),
                    );
                  }
                }}
                placeholder="Keywords separated by comma"
                className="w-full text-xs px-2 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
