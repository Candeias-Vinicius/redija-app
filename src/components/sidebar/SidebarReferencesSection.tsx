import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Check,
  Copy,
  Download,
  Pencil,
  Plus,
  Search,
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
  onOpenReferenceModal: () => void;
  onEditReference?: (ref: AcademicReference) => void;
  onOpenTemplateCustomizer?: () => void;
  onRemoveReference: (id: string) => void;
}

export const SidebarReferencesSection: React.FC<SidebarReferencesSectionProps> = ({
  project,
  references,
  onOpenReferenceModal,
  onEditReference,
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
    <div id="sidebar-references" className="p-3">
      <div className="flex items-center justify-between py-1.5">
        <button
          onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
        >
          <Bookmark className="w-3.5 h-3.5 text-slate-500" />
          <span>Referências ({references.length})</span>
        </button>
        <div className="flex items-center gap-1">
          {references.length > 0 && (
            <button
              aria-label="Exportar todas as referências em formato BibTeX (.bib)"
              onClick={handleExportBibtex}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
              title="Exportar todas as referências em formato BibTeX (.bib)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onOpenReferenceModal}
            className="flex items-center gap-1 px-2 py-1 bg-brand-700 hover:bg-brand-800 text-white rounded text-xs font-semibold transition-colors"
            title="Adicionar Referência (DOI, ISBN, .bib ou Manual)"
          >
            <Plus className="w-3 h-3" />
            <span>Nova</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-2 space-y-2 pl-1">
          {/* Barra de Pesquisa e Filtro de Referências */}
          {references.length > 0 && (
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={refSearchQuery}
                  onChange={(e) => setRefSearchQuery(e.target.value)}
                  placeholder="Buscar por autor, título, ano..."
                  aria-label="Buscar referências"
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-600"
                />
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {REFERENCE_FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRefTypeFilter(tab.id)}
                    className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 transition-colors ${
                      refTypeFilter === tab.id
                        ? 'bg-brand-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {references.length === 0 ? (
            <div className="text-xs text-slate-500 py-4 px-2 text-center border border-dashed border-slate-200 rounded-lg">
              Nenhuma referência cadastrada.
              <button
                onClick={onOpenReferenceModal}
                className="block mx-auto text-brand-700 font-semibold hover:underline mt-1"
              >
                + Adicionar por DOI, ISBN ou arquivo .bib
              </button>
            </div>
          ) : filteredReferences.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 text-center">
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
                    data-ref-id={ref.id}
                    className="group p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs space-y-1 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1 min-w-0 flex-1">
                        <span
                          className="px-1.5 py-0.5 rounded bg-brand-100/80 border border-brand-200 text-brand-800 font-bold text-xs truncate max-w-[185px]"
                          title={shortCite}
                        >
                          {shortCite}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-medium text-xs shrink-0">
                          {getReferenceTypeBadgeLabel(ref.type)}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleCopyCitation(ref)}
                          className="p-1 text-slate-500 hover:text-brand-600 rounded"
                          title={`Copiar chamada ${shortCite}`}
                          aria-label={`Copiar chamada ${shortCite}`}
                        >
                          {copiedRefId === ref.id ? (
                            <Check className="w-3.5 h-3.5 text-brand-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {onEditReference && (
                          <button
                            aria-label="Editar esta referência"
                            onClick={() => onEditReference(ref)}
                            className="p-1 text-slate-500 hover:text-blue-600 rounded"
                            title="Editar esta referência"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          aria-label="Remover referência"
                          onClick={() => onRemoveReference(ref.id)}
                          className="p-1 text-slate-500 hover:text-red-500 rounded"
                          title="Remover referência"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="font-semibold text-slate-900 leading-snug">
                      {ref.title}
                      {ref.subtitle ? `: ${ref.subtitle}` : ''}
                    </div>

                    <div className="text-xs text-slate-500 truncate">{ref.authors}</div>

                    <div className="text-xs text-slate-500 truncate">
                      {ref.journal || ref.publisher} • {ref.city} • {ref.year}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
