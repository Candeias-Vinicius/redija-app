import React, { useContext, useEffect, useRef, useState } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Trash2 } from 'lucide-react';
import { resolveCitationDisplay, type CitationCallMode } from '@/core/transpiler/citationFormatter';
import { CitationRenderContext } from './citationRenderContext';

export const CitationNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const { references, refIndexMap, citationFormat } = useContext(CitationRenderContext);
  const [isOpen, setIsOpen] = useState(false);
  const [pageDraft, setPageDraft] = useState('');
  const containerRef = useRef<HTMLSpanElement>(null);

  const citeId = String(node.attrs.citeId || '');
  const citePage = String(node.attrs.citePage || '');
  const citeMode: CitationCallMode =
    node.attrs.citeMode === 'narrative' ? 'narrative' : 'parenthetical';
  const fallbackLabel = String(node.attrs.fallbackLabel || '');

  const matchedRef = references.find((r) => r.id === citeId);
  const refNumber = refIndexMap.get(citeId) ?? 1;

  const display = matchedRef
    ? resolveCitationDisplay(matchedRef, {
        format: citationFormat,
        mode: citeMode,
        page: citePage,
        refNumber,
      })
    : null;

  const label = display?.label || fallbackLabel || '[Ref removida]';

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const applyUpdate = (nextMode: CitationCallMode, nextPage: string) => {
    const cleanPage = nextPage.trim();
    const updatedDisplay = matchedRef
      ? resolveCitationDisplay(matchedRef, {
          format: citationFormat,
          mode: nextMode,
          page: cleanPage,
          refNumber,
        })
      : null;
    updateAttributes({
      citeMode: nextMode,
      citePage: cleanPage,
      fallbackLabel: updatedDisplay?.label || fallbackLabel,
    });
  };

  return (
    <NodeViewWrapper
      as="span"
      ref={containerRef}
      className="relative inline-block align-baseline mx-0.5 select-none"
      contentEditable={false}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setPageDraft(citePage);
          setIsOpen((prev) => !prev);
        }}
        title={
          matchedRef
            ? `${matchedRef.authors} — ${matchedRef.title} (${matchedRef.year}) • Clique para editar chamada/página`
            : 'Referência não encontrada na bibliografia atual'
        }
        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[12px] font-semibold transition-colors cursor-pointer ${
          !matchedRef
            ? 'bg-red-50 text-red-700 border border-red-300'
            : selected || isOpen
              ? 'bg-emerald-600 text-white border border-emerald-700'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
        }`}
      >
        {label}
      </button>

      {isOpen && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1 z-40 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl p-2.5 text-xs space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase text-neutral-500">
              Chamada de Citação
            </span>
            <button
              type="button"
              onClick={() => {
                deleteNode();
                setIsOpen(false);
              }}
              className="p-1 text-neutral-400 hover:text-red-600 rounded"
              title="Remover citação"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => applyUpdate('parenthetical', pageDraft)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border ${
                citeMode === 'parenthetical'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              Parentética
            </button>
            <button
              type="button"
              onClick={() => applyUpdate('narrative', pageDraft)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium border ${
                citeMode === 'narrative'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              Narrativa
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={pageDraft}
              onChange={(e) => setPageDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyUpdate(citeMode, pageDraft);
                  setIsOpen(false);
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder="Página (ex: 42 ou 10-12)"
              className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
            />
            <button
              type="button"
              onClick={() => {
                applyUpdate(citeMode, pageDraft);
                setIsOpen(false);
              }}
              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};
