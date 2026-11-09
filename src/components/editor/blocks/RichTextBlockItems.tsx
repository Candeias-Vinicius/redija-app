import React from 'react';
import { MessageSquareQuote, Quote } from 'lucide-react';
import { AcademicReference, Block, BlockType, CitationFormat } from '@/types/document';
import { RichTextInput } from '../../RichTextInput';

interface RichTextBlockItemsProps {
  block: Block;
  references: AcademicReference[];
  refIndexMap: Map<string, number>;
  citationStyle: 'uppercase' | 'titlecase';
  citationFormat?: CitationFormat;
  autoFocus: boolean;
  openCitationTrigger: number;
  onOpenNewReferenceModal?: () => void;
  onUpdateContent: (id: string, content: string) => void;
  onUpdateMeta: (id: string, meta: NonNullable<Block['meta']>) => void;
  onAddBlock: (afterId: string, type: BlockType) => void;
  onRemoveBlock: (id: string) => void;
  onChangeBlockType: (id: string, type: BlockType) => void;
  onOpenSlashMenu: (id: string) => void;
}

export const RichTextBlockItems: React.FC<RichTextBlockItemsProps> = ({
  block,
  references,
  refIndexMap,
  citationStyle,
  citationFormat,
  autoFocus,
  openCitationTrigger,
  onOpenNewReferenceModal,
  onUpdateContent,
  onUpdateMeta,
  onAddBlock,
  onRemoveBlock,
  onChangeBlockType,
  onOpenSlashMenu,
}) => {
  if (block.type === 'paragraph') {
    return (
      <RichTextInput
        value={block.content}
        references={references}
        refIndexMap={refIndexMap}
        citationStyle={citationStyle}
        citationFormat={citationFormat}
        autoFocus={autoFocus}
        openCitationTrigger={openCitationTrigger}
        onOpenNewReferenceModal={onOpenNewReferenceModal}
        onChange={(html) => onUpdateContent(block.id, html)}
        onEnter={() => onAddBlock(block.id, 'paragraph')}
        onBackspaceEmpty={() => onRemoveBlock(block.id)}
        onSlashCommand={() => onOpenSlashMenu(block.id)}
        placeholder='Digite seu parágrafo, "/" para comandos ou "@" para citar referência...'
        className="text-sm leading-relaxed text-neutral-800"
      />
    );
  }

  if (block.type === 'bullet') {
    return (
      <div className="flex items-start gap-2.5 pl-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 mt-2 shrink-0" />
        <RichTextInput
          value={block.content}
          references={references}
          refIndexMap={refIndexMap}
          citationStyle={citationStyle}
          citationFormat={citationFormat}
          autoFocus={autoFocus}
          onOpenNewReferenceModal={onOpenNewReferenceModal}
          onChange={(html) => onUpdateContent(block.id, html)}
          onEnter={() => onAddBlock(block.id, 'bullet')}
          onBackspaceEmpty={() => onChangeBlockType(block.id, 'paragraph')}
          placeholder="Item de lista..."
          className="text-sm leading-relaxed text-neutral-800"
        />
      </div>
    );
  }

  if (block.type === 'numbered') {
    return (
      <div className="flex items-start gap-2.5 pl-2">
        <span className="text-xs font-bold text-neutral-500 mt-1 shrink-0">1.</span>
        <RichTextInput
          value={block.content}
          references={references}
          refIndexMap={refIndexMap}
          citationStyle={citationStyle}
          citationFormat={citationFormat}
          autoFocus={autoFocus}
          onOpenNewReferenceModal={onOpenNewReferenceModal}
          onChange={(html) => onUpdateContent(block.id, html)}
          onEnter={() => onAddBlock(block.id, 'numbered')}
          onBackspaceEmpty={() => onChangeBlockType(block.id, 'paragraph')}
          placeholder="Item numerado..."
          className="text-sm leading-relaxed text-neutral-800"
        />
      </div>
    );
  }

  if (block.type === 'quote_long') {
    return (
      <div className="border-l-4 border-emerald-500 bg-neutral-50/90 p-3.5 rounded-r-lg ml-8 text-xs text-neutral-700 space-y-2">
        <div className="flex items-center justify-between text-emerald-700 font-semibold">
          <span className="flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5" />
            Citação Direta Longa
          </span>
        </div>
        <RichTextInput
          value={block.content}
          references={references}
          refIndexMap={refIndexMap}
          citationStyle={citationStyle}
          citationFormat={citationFormat}
          autoFocus={autoFocus}
          onOpenNewReferenceModal={onOpenNewReferenceModal}
          onChange={(html) => onUpdateContent(block.id, html)}
          onEnter={() => onAddBlock(block.id, 'paragraph')}
          placeholder="Digite ou cole o trecho de mais de 3 linhas (sem aspas)..."
          className="text-xs leading-normal text-neutral-700"
        />
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/70">
          <input
            type="text"
            value={block.meta?.author || ''}
            onChange={(e) => onUpdateMeta(block.id, { author: e.target.value })}
            placeholder="Autor (ex: SILVA)"
            className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
          />
          <input
            type="text"
            value={block.meta?.year || ''}
            onChange={(e) => onUpdateMeta(block.id, { year: e.target.value })}
            placeholder="Ano (ex: 2024)"
            className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
          />
          <input
            type="text"
            value={block.meta?.page || ''}
            onChange={(e) => onUpdateMeta(block.id, { page: e.target.value })}
            placeholder="Página (ex: 42)"
            className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-xs">
      <MessageSquareQuote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <span className="text-[10px] font-bold uppercase text-amber-700 block mb-0.5">
          Nota de Rodapé
        </span>
        <RichTextInput
          value={block.content}
          references={references}
          refIndexMap={refIndexMap}
          citationStyle={citationStyle}
          citationFormat={citationFormat}
          autoFocus={autoFocus}
          onOpenNewReferenceModal={onOpenNewReferenceModal}
          onChange={(html) => onUpdateContent(block.id, html)}
          onEnter={() => onAddBlock(block.id, 'paragraph')}
          placeholder="Texto explicativo que aparecerá no rodapé da página..."
          className="text-xs text-neutral-700"
        />
      </div>
    </div>
  );
};
