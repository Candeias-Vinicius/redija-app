import React from 'react';
import {
  AlignLeft,
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
  SLASH_OPTION_DEFS,
  SlashCommandType,
  filterSlashOptions,
} from './blockHelpers';

const SLASH_ICONS: Record<SlashCommandType, React.ReactNode> = {
  action_cite: <Bookmark className="w-4 h-4 text-emerald-600" />,
  paragraph: <AlignLeft className="w-4 h-4 text-neutral-500" />,
  h1: <Heading1 className="w-4 h-4 text-neutral-700" />,
  h2: <Heading2 className="w-4 h-4 text-neutral-700" />,
  h3: <Heading3 className="w-4 h-4 text-neutral-700" />,
  h4: <Heading4 className="w-4 h-4 text-neutral-700" />,
  h5: <Heading5 className="w-4 h-4 text-neutral-700" />,
  unnumbered_heading: <Hash className="w-4 h-4 text-neutral-500" />,
  quote_long: <Quote className="w-4 h-4 text-emerald-600" />,
  equation: <Sigma className="w-4 h-4 text-indigo-600" />,
  code: <Code2 className="w-4 h-4 text-sky-600" />,
  image: <ImageIcon className="w-4 h-4 text-blue-600" />,
  table: <TableIcon className="w-4 h-4 text-purple-600" />,
  box: <LayoutGrid className="w-4 h-4 text-teal-600" />,
  bullet: <List className="w-4 h-4 text-neutral-500" />,
  numbered: <ListOrdered className="w-4 h-4 text-neutral-500" />,
  footnote: <MessageSquareQuote className="w-4 h-4 text-amber-600" />,
  raw_typst: <Terminal className="w-4 h-4 text-amber-600" />,
  pagebreak: <Scissors className="w-4 h-4 text-neutral-500" />,
};

interface SlashCommandMenuProps {
  blockId: string;
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  onClose: () => void;
  onSelect: (blockId: string, type: SlashCommandType) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  blockId,
  searchQuery,
  onChangeSearch,
  onClose,
  onSelect,
}) => {
  const filteredOptions = filterSlashOptions(SLASH_OPTION_DEFS, searchQuery);

  return (
    <div className="absolute left-0 sm:left-24 top-10 sm:top-9 z-30 w-[min(18rem,calc(100vw-2rem))] max-w-full bg-white border border-neutral-200 shadow-xl rounded-xl overflow-hidden text-xs">
      <div className="p-2 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50">
        <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
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
          placeholder="Buscar elemento ABNT..."
          className="w-full bg-transparent text-xs focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto py-1 divide-y divide-neutral-50">
        {filteredOptions.length === 0 ? (
          <div className="p-3 text-center text-neutral-400">Nenhum bloco encontrado.</div>
        ) : (
          filteredOptions.map((opt) => (
            <button
              key={opt.type}
              type="button"
              onClick={() => onSelect(blockId, opt.type)}
              className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-emerald-50/70 text-left transition-colors"
            >
              <div className="mt-0.5 p-1.5 rounded-md bg-neutral-100 shrink-0">
                {SLASH_ICONS[opt.type]}
              </div>
              <div>
                <div className="font-semibold text-neutral-800">{opt.label}</div>
                <div className="text-[11px] text-neutral-500 leading-tight">{opt.description}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
