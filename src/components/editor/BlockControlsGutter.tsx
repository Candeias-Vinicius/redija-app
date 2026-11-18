import React from 'react';
import { ArrowDown, ArrowUp, Menu, Move, Plus, Trash2 } from 'lucide-react';

interface BlockControlsGutterProps {
  blockId: string;
  isMenuOpen: boolean;
  isCompact?: boolean;
  isActive?: boolean;
  canDelete: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: (blockId: string) => void;
  onMoveDown?: (blockId: string) => void;
  onAddBelow: (blockId: string) => void;
  onToggleMenu: (blockId: string) => void;
  onRemove: (blockId: string) => void;
  onDragStart: (blockId: string, e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}

export const BlockControlsGutter: React.FC<BlockControlsGutterProps> = ({
  blockId,
  isMenuOpen,
  isCompact = false,
  isActive = false,
  canDelete,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onAddBelow,
  onToggleMenu,
  onRemove,
  onDragStart,
  onDragEnd,
}) => {
  if (isCompact) {
    const visible = isMenuOpen || isActive;
    return (
      <div
        className={`w-full mb-1.5 ${
          visible ? 'flex' : 'hidden'
        } items-center gap-0.5 text-slate-500 select-none`}
      >
        <button
          type="button"
          onClick={() => onAddBelow(blockId)}
          className="touch-target p-1.5 hover:text-brand-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center"
          title="Inserir bloco abaixo"
          aria-label="Inserir bloco abaixo"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onToggleMenu(blockId)}
          className={`touch-target flex items-center justify-center p-1.5 rounded-md transition-colors ${
            isMenuOpen
              ? 'text-brand-700 bg-brand-50 dark:bg-brand-950/50'
              : 'hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Opções do bloco"
          aria-label="Opções do bloco"
          aria-expanded={isMenuOpen}
        >
          <Menu className="w-4 h-4" />
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={() => onRemove(blockId)}
            className="touch-target p-1.5 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors flex items-center justify-center"
            title="Excluir bloco"
            aria-label="Excluir bloco"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => onMoveUp?.(blockId)}
          disabled={!canMoveUp}
          className="ml-auto touch-target p-1.5 rounded-md hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center"
          aria-label="Mover bloco para cima"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown?.(blockId)}
          disabled={!canMoveDown}
          className="touch-target p-1.5 rounded-md hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center justify-center"
          aria-label="Mover bloco para baixo"
        >
          <ArrowDown className="w-4 h-4" />
        </button>

        <div
          draggable
          aria-hidden="true"
          onDragStart={(e) => {
            onDragStart(blockId, e);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={onDragEnd}
          className="hidden pointer-fine:block p-1.5 cursor-grab active:cursor-grabbing rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title="Arrastar para reordenar"
          aria-label="Arrastar para reordenar bloco"
        >
          <Move className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`absolute left-1 top-1.5 bottom-1.5 w-22 ${
        isMenuOpen
          ? 'opacity-100'
          : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100'
      } flex flex-col items-center text-slate-500 transition-opacity select-none z-10`}
    >
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onAddBelow(blockId)}
          className="p-1 hover:text-brand-600 hover:bg-slate-100 rounded transition-colors"
          title="Inserir bloco abaixo (Enter)"
          aria-label="Inserir bloco abaixo"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onToggleMenu(blockId)}
          className={`p-1 rounded transition-colors ${
            isMenuOpen
              ? 'text-brand-700 bg-brand-50'
              : 'hover:text-slate-800 hover:bg-slate-100'
          }`}
          title="Opções do bloco: alterar tipo, citações e formatos (/)"
          aria-label="Opções do bloco"
          aria-expanded={isMenuOpen}
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={() => onRemove(blockId)}
            className="p-1 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Excluir bloco"
            aria-label="Excluir bloco"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        draggable
        onDragStart={(e) => {
          onDragStart(blockId, e);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={onDragEnd}
        className="mt-1 w-full flex-1 min-h-[36px] flex items-center justify-center cursor-grab active:cursor-grabbing rounded-lg hover:bg-slate-100/70 border border-transparent hover:border-slate-200/50 transition-colors group/drag"
        title="Segure e arraste para reordenar este bloco (ou use Ctrl+Shift+↑/↓)"
        aria-hidden="true"
      >
        <div className="p-1.5 rounded-lg text-slate-300 group-hover/drag:text-slate-600 group-hover/drag:bg-slate-200/80 active:bg-slate-300/80 transition-all flex items-center justify-center shadow-2xs">
          <Move className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
