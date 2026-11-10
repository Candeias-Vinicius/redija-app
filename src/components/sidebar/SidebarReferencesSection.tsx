import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Download,
  Pencil,
  Plus,
  Search,
  Sliders,
  Trash2,
} from 'lucide-react';
import { AcademicReference, DocumentProject } from '@/types/document';
import {
  exportToBibtex,
  formatShortCitation,
  getOrderedReferences,
  getReferenceIndexMap,
  resolveCitationFormat,
} from '@/core/transpiler/abntLinter';
import {
  REFERENCE_FILTER_TABS,
  filterReferences,
  getReferenceTypeBadgeLabel,
} from './sidebarHelpers';

interface SidebarReferencesSectionProps {
  project: DocumentProject;
  references: AcademicReference[];
  readOnly?: boolean;
  onOpenReferenceModal: () => void;
  onEditReference?: (ref: AcademicReference) => void;
  onOpenTemplateCustomizer?: () => void;
  onRemoveReference: (id: string) => void;
}

export const SidebarReferencesSection: React.FC<SidebarReferencesSectionProps> = ({
  project,
  references,
  readOnly = false,
  onOpenReferenceModal,
  onEditReference,
  onOpenTemplateCustomizer,
  onRemoveReference,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [copiedRefId, setCopiedRefId] = useState<string | null>(null);
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [refTypeFilter, setRefTypeFilter] = useState<string>('all');

  const citationFormat = resolveCitationFormat(project.templateConfig);
  const referenceOrdering = project.templateConfig?.referenceOrdering ?? 'alphabetical';

  const refIndexMap = useMemo(
    () => getReferenceIndexMap(references, referenceOrdering, project.blocks),
    [references, referenceOrdering, project.blocks],
  );

  const filteredReferences = useMemo(
    () => filterReferences(references, refSearchQuery, refTypeFilter),
    [references, refSearchQuery, refTypeFilter],
  );

  const handleCopyCitation = (ref: AcademicReference) => {
    const citation = formatShortCitation(ref, {
      format: citationFormat,
      refNumber: refIndexMap.get(ref.id),
    });
    navigator.clipboard.writeText(citation);
    setCopiedRefId(ref.id);
    setTimeout(() => setCopiedRefId(null), 1800);
  };

  const handleExportBibtex = () => {
    const ordered = getOrderedReferences(references, referenceOrdering, project.blocks);
    const bib = exportToBibtex(ordered);
    const blob = new Blob([bib], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.bib`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-3">
      <div className="flex items-center justify-between py-1.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900"
        >
          <Bookmark className="w-3.5 h-3.5 text-neutral-400" />
          <span>Referências ({references.length})</span>
        </button>
        <div className="flex items-center gap-1">
          {references.length > 0 && (
            <button
              onClick={handleExportBibtex}
              className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-neutral-800"
              title="Exportar todas as referências em formato BibTeX (.bib)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          {onOpenTemplateCustomizer && !readOnly && (
            <button
              onClick={onOpenTemplateCustomizer}
              className="p-1 hover:bg-neutral-100 rounded text-neutral-500 hover:text-emerald-700"
              title="Configurar formatação e layout das referências e citações (Norma & Layout)"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}
          {!readOnly && (
            <button
              onClick={onOpenReferenceModal}
              className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors"
              title="Adicionar Referência (DOI, ISBN, .bib ou Manual)"
            >
              <Plus className="w-3 h-3" />
              <span>Nova</span>
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-2 space-y-2 pl-1">
          {/* Barra de Pesquisa e Filtro de Referências */}
          {references.length > 0 && (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={refSearchQuery}
                  onChange={(e) => setRefSearchQuery(e.target.value)}
                  placeholder="Buscar por autor, título, ano..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {REFERENCE_FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRefTypeFilter(tab.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-colors ${
                      refTypeFilter === tab.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {references.length === 0 ? (
            <div className="text-[11px] text-neutral-400 py-4 px-2 text-center border border-dashed border-neutral-200 rounded-lg">
              Nenhuma referência cadastrada.
              {!readOnly && (
                <button
                  onClick={onOpenReferenceModal}
                  className="block mx-auto text-emerald-600 font-semibold hover:underline mt-1"
                >
                  + Adicionar por DOI, ISBN ou arquivo .bib
                </button>
              )}
            </div>
          ) : filteredReferences.length === 0 ? (
            <div className="text-[11px] text-neutral-400 py-3 text-center">
              Nenhuma referência encontrada para &ldquo;{refSearchQuery}&rdquo;.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
              {filteredReferences.map((ref) => {
                const shortCite = formatShortCitation(ref, {
                  format: citationFormat,
                  refNumber: refIndexMap.get(ref.id),
                });
                return (
                  <div
                    key={ref.id}
                    className="group p-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs space-y-1 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                        <span
                          className="px-1.5 py-0.5 rounded bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-bold text-[10px] truncate max-w-[185px]"
                          title={shortCite}
                        >
                          {shortCite}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-600 font-medium text-[10px] shrink-0">
                          {getReferenceTypeBadgeLabel(ref.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleCopyCitation(ref)}
                          className="p-1 text-neutral-400 hover:text-emerald-600 rounded"
                          title={`Copiar chamada ${shortCite}`}
                        >
                          {copiedRefId === ref.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {onEditReference && !readOnly && (
                          <button
                            onClick={() => onEditReference(ref)}
                            className="p-1 text-neutral-400 hover:text-blue-600 rounded"
                            title="Editar esta referência"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            onClick={() => onRemoveReference(ref.id)}
                            className="p-1 text-neutral-400 hover:text-red-500 rounded"
                            title="Remover referência"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="font-semibold text-neutral-900 leading-snug">
                      {ref.title}
                      {ref.subtitle ? `: ${ref.subtitle}` : ''}
                    </div>

                    <div className="text-[11px] text-neutral-500 truncate">{ref.authors}</div>

                    <div className="text-[10px] text-neutral-400 truncate">
                      {ref.journal || ref.publisher} • {ref.city} • {ref.year}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {onOpenTemplateCustomizer && !readOnly && (
            <button
              type="button"
              onClick={onOpenTemplateCustomizer}
              className="w-full mt-1 py-1.5 px-2.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[11px] text-neutral-600 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3 h-3 text-emerald-600" />
              <span>Layout das Referências e Citações (Norma &amp; Layout)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
