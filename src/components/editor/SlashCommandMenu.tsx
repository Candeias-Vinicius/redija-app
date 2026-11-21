import React from 'react';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Bookmark,
  Code2,
  Hash,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Image as ImageIcon,
  LayoutGrid,
  List,
  ListOrdered,
  MessageSquareQuote,
  Quote,
  Scissors,
  Search,
  Sigma,
  Table as TableIcon,
  Terminal,
  X,
} from 'lucide-react';
import {
  SlashCommandType,
  filterSlashOptions,
  getSlashOptionsForTemplate,
} from './blockHelpers';
import { ProjectTemplateType } from '@/types/document';

const SLASH_ICONS: Record<SlashCommandType, React.ReactNode> = {
  action_cite: <Bookmark className="w-4 h-4 text-brand-700" />,
  paragraph: <AlignLeft className="w-4 h-4 text-slate-500" />,
  h1: <Heading1 className="w-4 h-4 text-slate-700" />,
  h2: <Heading2 className="w-4 h-4 text-slate-700" />,
  h3: <Heading3 className="w-4 h-4 text-slate-700" />,
  h4: <Heading4 className="w-4 h-4 text-slate-700" />,
  h5: <Heading5 className="w-4 h-4 text-slate-700" />,
  unnumbered_heading: <Hash className="w-4 h-4 text-slate-500" />,
  quote_long: <Quote className="w-4 h-4 text-brand-700" />,
  equation: <Sigma className="w-4 h-4 text-indigo-600" />,
  code: <Code2 className="w-4 h-4 text-sky-600" />,
  image: <ImageIcon className="w-4 h-4 text-blue-600" />,
  table: <TableIcon className="w-4 h-4 text-purple-600" />,
  box: <LayoutGrid className="w-4 h-4 text-teal-600" />,
  bullet: <List className="w-4 h-4 text-slate-500" />,
  numbered: <ListOrdered className="w-4 h-4 text-slate-500" />,
  footnote: <MessageSquareQuote className="w-4 h-4 text-amber-600" />,
  raw_typst: <Terminal className="w-4 h-4 text-amber-600" />,
  pagebreak: <Scissors className="w-4 h-4 text-slate-500" />,
};

interface SlashCommandMenuProps {
  blockId: string;
  searchQuery: string;
  templateType?: ProjectTemplateType;
  onChangeSearch: (value: string) => void;
  onClose: () => void;
  onSelect: (blockId: string, type: SlashCommandType) => void;
  /** Alternativa ao arrastar para reordenar (indefinido quando já está no topo). */
  onMoveUp?: () => void;
  /** Alternativa ao arrastar para reordenar (indefinido quando já está no fim). */
  onMoveDown?: () => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  blockId,
  searchQuery,
  templateType,
  onChangeSearch,
  onClose,
  onSelect,
  onMoveUp,
  onMoveDown,
}) => {
  const availableOptions = getSlashOptionsForTemplate(templateType);
  const filteredOptions = filterSlashOptions(availableOptions, searchQuery);

  return (
    <div className="absolute left-0 sm:left-24 top-10 sm:top-9 z-30 w-[min(18rem,calc(100vw-2rem))] max-w-full bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden text-sm">
      <div className="p-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
        <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClose();
            } else if (e.key === 'Enter' && filteredOptions.length > 0) {
              e.preventDefault();
              onSelect(blockId, filteredOptions[0].type);
            }
          }}
          autoFocus
          placeholder={
            templateType === 'presentation'
              ? 'Buscar elemento de slide...'
              : 'Buscar elemento ABNT...'
          }
          aria-label="Buscar tipo de bloco"
          className="w-full bg-transparent text-sm focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="touch-target p-1 rounded text-slate-500 hover:text-slate-700 flex items-center justify-center"
          aria-label="Fechar opções do bloco"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Reordenar sem arrastar (teclado e toque) */}
      <div className="px-2 py-1.5 border-b border-slate-100 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!onMoveUp}
          className="touch-target flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Mover bloco para cima (Ctrl+Shift+↑)"
          aria-keyshortcuts="Control+Shift+ArrowUp"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>Mover para cima</span>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!onMoveDown}
          className="touch-target flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Mover bloco para baixo (Ctrl+Shift+↓)"
          aria-keyshortcuts="Control+Shift+ArrowDown"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Mover para baixo</span>
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
        {filteredOptions.length === 0 ? (
          <div className="p-3 text-center text-slate-500">Nenhum bloco encontrado.</div>
        ) : (
          filteredOptions.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(blockId, opt.type)}
              className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-brand-50/70 text-left transition-colors"
            >
              <div className="mt-0.5 p-1.5 rounded-md bg-slate-100 shrink-0">
                {SLASH_ICONS[opt.type]}
              </div>
              <div>
                <div className="font-semibold text-slate-800">{opt.label}</div>
                <div className="text-xs text-slate-500 leading-tight">{opt.description}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
