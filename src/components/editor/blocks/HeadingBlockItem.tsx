import React from 'react';
import { Block } from '@/types/document';

interface HeadingBlockItemProps {
  block: Block;
  sectionNumber?: string;
  autoFocus: boolean;
  onUpdateContent: (id: string, content: string) => void;
  onAddParagraphBelow: (afterId: string) => void;
  onRemoveBlock: (id: string) => void;
}

const HEADING_PLACEHOLDERS: Record<'h1' | 'h2' | 'h3' | 'h4' | 'h5', string> = {
  h1: 'TÍTULO DA SEÇÃO PRIMÁRIA',
  h2: 'Título da subseção secundária',
  h3: 'Título da subseção terciária',
  h4: 'Título da subseção quaternária (1.1.1.1)',
  h5: 'Título da subseção quinária (1.1.1.1.1)',
};

const HEADING_CLASSES: Record<'h1' | 'h2' | 'h3' | 'h4' | 'h5', string> = {
  h1: 'font-bold text-lg text-neutral-900 uppercase tracking-wide',
  h2: 'font-bold text-base text-neutral-900',
  h3: 'italic font-medium text-sm text-neutral-800',
  h4: 'underline font-normal text-sm text-neutral-800',
  h5: 'font-normal text-sm text-neutral-800',
};

export const HeadingBlockItem: React.FC<HeadingBlockItemProps> = ({
  block,
  sectionNumber,
  autoFocus,
  onUpdateContent,
  onAddParagraphBelow,
  onRemoveBlock,
}) => {
  if (block.type === 'unnumbered_heading') {
    return (
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded select-none">
          S/N
        </span>
        <input
          type="text"
          value={block.content}
          autoFocus={autoFocus}
          onChange={(e) => onUpdateContent(block.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAddParagraphBelow(block.id);
            } else if (e.key === 'Backspace' && !block.content) {
              e.preventDefault();
              onRemoveBlock(block.id);
            }
          }}
          placeholder="TÍTULO SEM NUMERAÇÃO (EX: ERRATA, CONCLUSÃO LIVRE)"
          className="w-full border-none bg-transparent focus:outline-none placeholder-neutral-300 font-bold text-base text-neutral-900 uppercase tracking-wide"
        />
      </div>
    );
  }

  const level = block.type as 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded select-none">
        {sectionNumber}
      </span>
      <input
        type="text"
        value={block.content}
        autoFocus={autoFocus}
        onChange={(e) => onUpdateContent(block.id, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAddParagraphBelow(block.id);
          } else if (e.key === 'Backspace' && !block.content) {
            e.preventDefault();
            onRemoveBlock(block.id);
          }
        }}
        placeholder={HEADING_PLACEHOLDERS[level]}
        className={`w-full border-none bg-transparent focus:outline-none placeholder-neutral-300 ${HEADING_CLASSES[level]}`}
      />
    </div>
  );
};
