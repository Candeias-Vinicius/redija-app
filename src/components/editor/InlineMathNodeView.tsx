import React, { useEffect, useRef, useState } from 'react';
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Trash2 } from 'lucide-react';

export const InlineMathNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
  deleteNode,
  selected,
}) => {
  const mathExpr = String(node.attrs.math || 'x^2');
  const [isEditing, setIsEditing] = useState(false);
  const [exprDraft, setExprDraft] = useState(mathExpr);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isEditing]);

  const commitDraft = () => {
    const cleaned = exprDraft.trim().replace(/^\$+|\$+$/g, '').trim();
    if (!cleaned) {
      deleteNode();
    } else {
      updateAttributes({ math: cleaned });
    }
    setIsEditing(false);
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
          setExprDraft(mathExpr);
          setIsEditing((prev) => !prev);
        }}
        title="Fórmula matemática inline (Typst) — clique para editar"
        className={`inline-flex items-center px-1.5 py-0.2 rounded font-mono text-[11px] transition-colors cursor-pointer ${
          selected || isEditing
            ? 'bg-indigo-600 text-white border border-indigo-700'
            : 'bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100'
        }`}
      >
        ${mathExpr}$
      </button>

      {isEditing && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1 z-40 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl p-2.5 text-xs space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase text-neutral-500">
              Matemática Inline (Typst)
            </span>
            <button
              type="button"
              onClick={() => {
                deleteNode();
                setIsEditing(false);
              }}
              className="p-1 text-neutral-400 hover:text-red-600 rounded"
              title="Remover fórmula"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={exprDraft}
              onChange={(e) => setExprDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDraft();
                } else if (e.key === 'Escape') {
                  setIsEditing(false);
                }
              }}
              autoFocus
              placeholder="Ex: x^2 + y_1 = alpha"
              className="flex-1 min-w-0 font-mono px-2 py-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded focus:outline-none focus:border-indigo-600"
            />
            <button
              type="button"
              onClick={commitDraft}
              className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};
