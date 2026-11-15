import React from 'react';
import { Menu, Move, Plus, Trash2 } from 'lucide-react';

interface BlockControlsGutterProps {
  blockId: string;
  isMenuOpen: boolean;
  isCompact?: boolean;
  isActive?: boolean;
  canDelete: boolean;
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
        } items-center gap-0.5 text-neutral-400 select-none`}
      >
        <button
          type="button"
          onClick={() => onAddBelow(blockId)}
          className="p-1.5 hover:text-emerald-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
          title="Inserir bloco abaixo"
          aria-label="Inserir bloco abaixo"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onToggleMenu(blockId)}
          className={`p-1.5 rounded-md transition-colors ${
            isMenuOpen
              ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50'
              : 'hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          title="Opções do bloco"
          aria-label="Opções do bloco"
        >
          <Menu className="w-4 h-4" />
        </button>

        {canDelete && (
          <button
            type="button"
            onClick={() => onRemove(blockId)}
            className="p-1.5 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
            title="Excluir bloco"
            aria-label="Excluir bloco"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div
          draggable
          onDragStart={(e) => {
            onDragStart(blockId, e);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={onDragEnd}
          className="ml-auto p-1.5 cursor-grab active:cursor-grabbing rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
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
        isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      } flex flex-col items-center text-neutral-400 transition-opacity select-none z-10`}
    >
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => onAddBelow(blockId)}
          className="p-1 hover:text-emerald-600 hover:bg-neutral-100 rounded transition-colors"
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
              ? 'text-emerald-600 bg-emerald-50'
              : 'hover:text-neutral-800 hover:bg-neutral-100'
          }`}
          title="Opções do bloco: alterar tipo, citações e formatos (/)"
          aria-label="Opções do bloco"
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
        className="mt-1 w-full flex-1 min-h-[36px] flex items-center justify-center cursor-grab active:cursor-grabbing rounded-lg hover:bg-neutral-100/70 border border-transparent hover:border-neutral-200/50 transition-colors group/drag"
        title="Segure e arraste para reordenar este bloco"
        aria-label="Arrastar para reordenar bloco"
      >
        <div className="p-1.5 rounded-lg text-neutral-300 group-hover/drag:text-neutral-600 group-hover/drag:bg-neutral-200/80 active:bg-neutral-300/80 transition-all flex items-center justify-center shadow-2xs">
          <Move className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
