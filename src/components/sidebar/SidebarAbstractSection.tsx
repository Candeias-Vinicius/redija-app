import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { DocumentMetadata } from '@/types/document';
import { countWords } from '@/core/transpiler/abntLinter';
import { TemplateCapabilities } from '@/core/templates/templateCapabilities';
import { getAbstractWordRange } from './sidebarHelpers';

interface SidebarAbstractSectionProps {
  metadata: DocumentMetadata;
  capabilities: TemplateCapabilities;
  onUpdateField: <K extends keyof DocumentMetadata>(
    field: K,
    value: DocumentMetadata[K],
  ) => void;
}

export const SidebarAbstractSection: React.FC<SidebarAbstractSectionProps> = ({
  metadata,
  capabilities,
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
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-700 py-1.5 hover:text-slate-900"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
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
                <label htmlFor="sb-abs-resumo" className="text-xs font-medium text-slate-500">
                  {capabilities.effectiveType === 'ieee' ? 'Abstract' : 'Resumo em Português'}
                </label>
                {capabilities.isAbntFamily ||
                capabilities.effectiveType === 'sbc' ||
                capabilities.effectiveType === 'ieee' ? (
                  <span
                    id="sb-abs-resumo-contagem"
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      isAbstractCountIdeal
                        ? 'bg-brand-50 text-brand-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                    title={`Recomendação do modelo: entre ${abstractMin} e ${abstractMax} palavras`}
                  >
                    {abstractWordCount} / {abstractMin}–{abstractMax} palavras
                  </span>
                ) : (
                  <span
                    id="sb-abs-resumo-contagem"
                    className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                  >
                    {abstractWordCount} palavras
                  </span>
                )}
              </div>
              <textarea
                id="sb-abs-resumo"
                aria-describedby="sb-abs-resumo-contagem"
                rows={4}
                value={metadata.abstract}
                onChange={(e) => onUpdateField('abstract', e.target.value)}
                placeholder={
                  capabilities.effectiveType === 'ieee'
                    ? 'Concise English abstract summarizing objectives, methodology and main findings...'
                    : `Texto do resumo em parágrafo único (${abstractMin} a ${abstractMax} palavras conforme NBR 6028)...`
                }
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {capabilities.resumoFields.keywords && (
            <div>
              <label htmlFor="sb-abs-campo" className="text-xs font-medium text-slate-500 block mb-1">
                {capabilities.effectiveType === 'ieee'
                  ? 'Index Terms / Palavras-chave (vírgula)'
                  : 'Palavras-chave (separadas por vírgula)'}
              </label>
              <input
                id="sb-abs-campo"
                type="text"
                value={metadata.keywords.join(', ')}
                onChange={(e) =>
                  onUpdateField(
                    'keywords',
                    e.target.value.split(',').map((k) => k.trim()),
                  )
                }
                placeholder={
                  capabilities.effectiveType === 'ieee'
                    ? 'Ex: Edge Computing, IoT, Performance'
                    : 'Ex: ABNT, Typst, Editor Acadêmico'
                }
                className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}

          {capabilities.resumoFields.foreignAbstract && (
            <div className="pt-2 border-t border-slate-100">
              <label htmlFor="sb-abs-abstract-lingua-estrangeira-opcional" className="text-xs font-medium text-slate-500 block mb-1">
                Abstract (Língua Estrangeira, Opcional)
              </label>
              <textarea
                id="sb-abs-abstract-lingua-estrangeira-opcional"
                rows={3}
                value={metadata.foreignAbstract || ''}
                onChange={(e) => onUpdateField('foreignAbstract', e.target.value)}
                placeholder="English abstract..."
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600 mb-1.5"
              />
              <input
                type="text"
                value={(metadata.foreignKeywords ?? []).join(', ')}
                onChange={(e) =>
                  onUpdateField(
                    'foreignKeywords',
                    e.target.value.split(',').map((k) => k.trim()),
                  )
                }
                placeholder="Keywords separated by comma"
                className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-brand-600"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
