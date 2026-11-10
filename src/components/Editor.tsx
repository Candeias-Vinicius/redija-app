import React, { useMemo, useState } from 'react';
import {
  AcademicReference,
  Block,
  BlockType,
  CitationFormat,
  DocumentMetadata,
  ReferenceOrdering,
} from '@/types/document';
import { getReferenceIndexMap } from '@/core/transpiler/abntLinter';
import { CollaboratorPresence } from '@/core/collaboration/RealtimeCollabManager';
import {
  calculateProjectImageBytes,
  validateImageUploadForProject,
} from '@/core/storage/imageQuota';
import { Minimize2, Plus } from 'lucide-react';
import {
  SlashCommandType,
  computeSectionNumbers,
  createDefaultMetaForType,
  reorderBlocks,
  shouldSkipContentUpdate,
} from './editor/blockHelpers';
import { BlockControlsGutter } from './editor/BlockControlsGutter';
import { SlashCommandMenu } from './editor/SlashCommandMenu';
import { HeadingBlockItem } from './editor/blocks/HeadingBlockItem';
import { RichTextBlockItems } from './editor/blocks/RichTextBlockItems';
import { CodeAndMathBlockItems } from './editor/blocks/CodeAndMathBlockItems';
import { ImageBlockItem } from './editor/blocks/ImageBlockItem';
import { TableGridBlockItem } from './editor/blocks/TableGridBlockItem';

interface EditorProps {
  blocks: Block[];
  metadata?: DocumentMetadata;
  references: AcademicReference[];
  citationStyle?: 'uppercase' | 'titlecase';
  citationFormat?: CitationFormat;
  referenceOrdering?: ReferenceOrdering;
  isFullWidth?: boolean;
  isCompact?: boolean;
  activeCollaborators?: CollaboratorPresence[];
  onOpenReferenceModal?: () => void;
  onChangeBlocks: (blocks: Block[]) => void;
  onFocusBlock?: (blockId: string) => void;
  onMinimize?: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  blocks,
  metadata,
  references,
  citationStyle = 'uppercase',
  citationFormat,
  referenceOrdering = 'alphabetical',
  isFullWidth = false,
  isCompact = false,
  activeCollaborators = [],
  onOpenReferenceModal,
  onChangeBlocks,
  onFocusBlock,
  onMinimize,
}) => {
  const [activeMenuBlockId, setActiveMenuBlockId] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [citationTriggerByBlock, setCitationTriggerByBlock] = useState<Record<string, number>>({});
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [imageErrorByBlock, setImageErrorByBlock] = useState<Record<string, string | null>>({});

  const refIndexMap = useMemo(
    () => getReferenceIndexMap(references, referenceOrdering, blocks),
    [references, referenceOrdering, blocks],
  );
  const totalProjectImageBytes = calculateProjectImageBytes(blocks, metadata);
  const sectionNumbers = useMemo(() => computeSectionNumbers(blocks), [blocks]);

  const updateBlockContent = (id: string, content: string) => {
    const current = blocks.find((b) => b.id === id);
    if (!current || shouldSkipContentUpdate(current.content, content)) return;
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const updateBlockMeta = (id: string, meta: NonNullable<Block['meta']>) => {
    const current = blocks.find((b) => b.id === id);
    if (current && JSON.stringify(current.meta) === JSON.stringify({ ...current.meta, ...meta })) {
      return;
    }
    onChangeBlocks(
      blocks.map((b) => (b.id === id ? { ...b, meta: { ...b.meta, ...meta } } : b)),
    );
  };

  const addBlock = (afterId: string, type: BlockType = 'paragraph') => {
    const newId = crypto.randomUUID();
    const newBlock: Block = {
      id: newId,
      type,
      content: '',
      meta: createDefaultMetaForType(type),
    };

    const index = blocks.findIndex((b) => b.id === afterId);
    if (index === -1) {
      onChangeBlocks([...blocks, newBlock]);
    } else {
      const next = [...blocks];
      next.splice(index + 1, 0, newBlock);
      onChangeBlocks(next);
    }
    setActiveMenuBlockId(null);
    setMenuSearch('');
    setFocusedBlockId(newId);
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    const index = blocks.findIndex((b) => b.id === id);
    const next = blocks.filter((b) => b.id !== id);
    onChangeBlocks(next);
    if (index > 0) {
      setFocusedBlockId(next[index - 1].id);
    }
  };

  const changeBlockType = (id: string, type: BlockType) => {
    onChangeBlocks(
      blocks.map((b) =>
        b.id === id
          ? {
              ...b,
              type,
              meta: createDefaultMetaForType(type) ?? b.meta,
            }
          : b,
      ),
    );
    setActiveMenuBlockId(null);
    setMenuSearch('');
    setFocusedBlockId(id);
  };

  const handleSelectSlashOption = (id: string, type: SlashCommandType) => {
    setActiveMenuBlockId(null);
    setMenuSearch('');
    if (type === 'action_cite') {
      onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, type: 'paragraph' } : b)));
      setCitationTriggerByBlock((prev) => ({
        ...prev,
        [id]: (prev[id] ?? 0) + 1,
      }));
      setFocusedBlockId(id);
      return;
    }
    changeBlockType(id, type);
  };

  const handleImageUpload = (blockId: string, file: File) => {
    const projectBytesExcludingThisBlock = calculateProjectImageBytes(blocks, metadata, blockId);
    const check = validateImageUploadForProject(file, projectBytesExcludingThisBlock);
    if (!check.valid) {
      setImageErrorByBlock((prev) => ({
        ...prev,
        [blockId]: check.error || 'Imagem excede o limite do projeto.',
      }));
      return;
    }

    setImageErrorByBlock((prev) => ({ ...prev, [blockId]: null }));
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateBlockMeta(blockId, {
          imageDataUrl: reader.result,
          imageMime: file.type,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = (blockId: string) => {
    setImageErrorByBlock((prev) => ({ ...prev, [blockId]: null }));
    updateBlockMeta(blockId, {
      imageDataUrl: undefined,
      imageMime: undefined,
    });
  };

  const renderBlockContent = (block: Block) => {
    const autoFocus = focusedBlockId === block.id;

    if (
      block.type === 'h1' ||
      block.type === 'h2' ||
      block.type === 'h3' ||
      block.type === 'h4' ||
      block.type === 'h5' ||
      block.type === 'unnumbered_heading'
    ) {
      return (
        <HeadingBlockItem
          block={block}
          sectionNumber={sectionNumbers[block.id]}
          autoFocus={autoFocus}
          onUpdateContent={updateBlockContent}
          onAddParagraphBelow={(afterId) => addBlock(afterId, 'paragraph')}
          onRemoveBlock={removeBlock}
        />
      );
    }

    if (
      block.type === 'paragraph' ||
      block.type === 'bullet' ||
      block.type === 'numbered' ||
      block.type === 'quote_long' ||
      block.type === 'footnote'
    ) {
      return (
        <RichTextBlockItems
          block={block}
          references={references}
          refIndexMap={refIndexMap}
          citationStyle={citationStyle}
          citationFormat={citationFormat}
          autoFocus={autoFocus}
          openCitationTrigger={citationTriggerByBlock[block.id] ?? 0}
          onOpenNewReferenceModal={onOpenReferenceModal}
          onUpdateContent={updateBlockContent}
          onUpdateMeta={updateBlockMeta}
          onAddBlock={addBlock}
          onRemoveBlock={removeBlock}
          onChangeBlockType={changeBlockType}
          onOpenSlashMenu={(id) => {
            setActiveMenuBlockId(id);
            setMenuSearch('');
          }}
        />
      );
    }

    if (block.type === 'image') {
      return (
        <ImageBlockItem
          block={block}
          totalProjectImageBytes={totalProjectImageBytes}
          imageError={imageErrorByBlock[block.id]}
          isBlockReorderDragging={Boolean(draggedBlockId)}
          onUpdateMeta={updateBlockMeta}
          onUploadImage={handleImageUpload}
          onClearImage={handleClearImage}
        />
      );
    }

    if (block.type === 'table' || block.type === 'box') {
      return <TableGridBlockItem block={block} onUpdateMeta={updateBlockMeta} />;
    }

    return (
      <CodeAndMathBlockItems
        block={block}
        autoFocus={autoFocus}
        onUpdateContent={updateBlockContent}
        onUpdateMeta={updateBlockMeta}
      />
    );
  };

  return (
    <div
      className={`flex-1 h-full overflow-y-auto bg-white dark:bg-neutral-950 flex justify-center min-w-0 ${
        isCompact ? 'px-4 py-4' : 'py-8 pl-24 pr-8 sm:pl-28 sm:pr-14'
      }`}
    >
      <div
        className={`w-full ${
          isFullWidth || isCompact ? 'max-w-5xl' : 'max-w-2xl'
        } space-y-2 sm:space-y-3 pb-28 transition-all duration-200`}
      >
        {/* Dica rápida no topo do editor */}
        <div
          className={`mb-4 sm:mb-6 pb-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2 text-xs text-neutral-400 ${
            isCompact ? 'flex-row' : 'items-start sm:items-center'
          }`}
        >
          <span className={`leading-relaxed min-w-0 ${isCompact ? 'truncate' : ''}`}>
            {isCompact ? (
              <>
                Digite{' '}
                <kbd className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded border border-neutral-200 dark:border-neutral-700 font-mono">
                  /
                </kbd>{' '}
                para blocos
              </>
            ) : (
              <>
                Dica: digite{' '}
                <kbd className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono">
                  /
                </kbd>{' '}
                em um bloco vazio para abrir os blocos ABNT ou selecione texto para formatar.
              </>
            )}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span>{blocks.length} blocos</span>
            {onMinimize && (
              <button
                type="button"
                onClick={onMinimize}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                title="Minimizar aba de texto (focar na estrutura ou no PDF)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {blocks.map((block) => {
          const activeCollab = activeCollaborators.find((c) => c.activeBlockId === block.id);
          return (
            <div
              key={block.id}
              onFocus={() => {
                setFocusedBlockId(block.id);
                onFocusBlock?.(block.id);
              }}
              onDragOver={(e) => {
                if (!draggedBlockId || draggedBlockId === block.id) return;
                e.preventDefault();
                setDragOverBlockId(block.id);
              }}
              onDragLeave={() => {
                if (dragOverBlockId === block.id) setDragOverBlockId(null);
              }}
              onDrop={(e) => {
                if (!draggedBlockId) return;
                e.preventDefault();
                onChangeBlocks(reorderBlocks(blocks, draggedBlockId, block.id));
                setDraggedBlockId(null);
                setDragOverBlockId(null);
              }}
              className={`group relative rounded-lg transition-all hover:bg-neutral-50/80 dark:hover:bg-neutral-900/50 ${
                isCompact
                  ? 'flex flex-col px-1 py-1.5'
                  : 'flex items-start gap-2.5 -ml-24 pl-24 pr-3 py-1.5'
              } ${draggedBlockId === block.id ? 'opacity-40' : ''} ${
                dragOverBlockId === block.id
                  ? 'border-t-2 border-emerald-500 bg-emerald-50/30'
                  : ''
              } ${activeCollab ? 'ring-1 ring-emerald-400/80 bg-emerald-50/15' : ''}`}
            >
              {/* Badge Flutuante do Colaborador Ativo no Bloco */}
              {activeCollab && (
                <div
                  className="absolute -top-2.5 right-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs animate-in fade-in zoom-in-95 duration-150"
                  title={`${activeCollab.user.name} (${activeCollab.user.email}) está editando este bloco`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{activeCollab.user.name.split(' ')[0]} está aqui</span>
                </div>
              )}

              <BlockControlsGutter
                blockId={block.id}
                isMenuOpen={activeMenuBlockId === block.id}
                isCompact={isCompact}
                isActive={focusedBlockId === block.id || activeMenuBlockId === block.id}
                canDelete={blocks.length > 1}
                onAddBelow={(id) => addBlock(id)}
                onToggleMenu={(id) => {
                  setActiveMenuBlockId(activeMenuBlockId === id ? null : id);
                  setMenuSearch('');
                }}
                onRemove={removeBlock}
                onDragStart={(id) => setDraggedBlockId(id)}
                onDragEnd={() => {
                  setDraggedBlockId(null);
                  setDragOverBlockId(null);
                }}
              />

              {activeMenuBlockId === block.id && (
                <SlashCommandMenu
                  blockId={block.id}
                  searchQuery={menuSearch}
                  onChangeSearch={setMenuSearch}
                  onClose={() => setActiveMenuBlockId(null)}
                  onSelect={handleSelectSlashOption}
                />
              )}

              {/* Conteúdo do bloco */}
              <div className="flex-1 min-w-0 w-full">{renderBlockContent(block)}</div>
            </div>
          );
        })}

        {/* Botão para adicionar bloco no final */}
        <button
          type="button"
          onClick={() => addBlock(blocks[blocks.length - 1]?.id ?? '', 'paragraph')}
          className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400 hover:text-emerald-600 py-2 px-3 rounded-md hover:bg-neutral-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar parágrafo</span>
        </button>
      </div>
    </div>
  );
};
