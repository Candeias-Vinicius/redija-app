import React, { useMemo, useState } from 'react';
import {
  AcademicReference,
  Block,
  BlockType,
  CitationFormat,
  DocumentMetadata,
  ReferenceOrdering,
  SubImageItem,
} from '@/types/document';
import { getReferenceIndexMap } from '@/core/transpiler/abntLinter';
import { CollaboratorPresence } from '@/core/collaboration/RealtimeCollabManager';
import {
  calculateProjectImageBytes,
  getBlockImages,
  getDataUrlByteSize,
  MAX_IMAGES_PER_BLOCK,
  validateMultipleImageUploadsForProject,
} from '@/core/storage/imageQuota';
import { FileEdit, Minus, Plus } from 'lucide-react';
import { PaneWindowControls } from '@/components/ui/PaneWindowControls';
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
  /** Deixa só este painel visível (desktop). */
  onMaximize?: () => void;
  /** Volta a exibir todos os painéis (quando este está maximizado). */
  onRestoreLayout?: () => void;
  /** Este é o único painel visível. */
  isMaximized?: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  blocks,
  metadata,
  references,
  citationStyle = 'titlecase',
  citationFormat,
  referenceOrdering = 'alphabetical',
  isFullWidth = false,
  isCompact = false,
  activeCollaborators = [],
  onOpenReferenceModal,
  onChangeBlocks,
  onFocusBlock,
  onMinimize,
  onMaximize,
  onRestoreLayout,
  isMaximized = false,
}) => {
  const [activeMenuBlockId, setActiveMenuBlockId] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [citationTriggerByBlock, setCitationTriggerByBlock] = useState<Record<string, number>>({});
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [imageErrorByBlock, setImageErrorByBlock] = useState<Record<string, string | null>>({});
  const [moveAnnouncement, setMoveAnnouncement] = useState('');

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

  /** Move um bloco uma posição para cima (-1) ou para baixo (+1), mantendo o foco nele. */
  const moveBlock = (id: string, direction: -1 | 1) => {
    const index = blocks.findIndex((b) => b.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChangeBlocks(next);
    setActiveMenuBlockId(null);
    setMoveAnnouncement(`Bloco movido para a posição ${target + 1} de ${blocks.length}.`);
    requestAnimationFrame(() => {
      const row = document.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
      if (!row) return;
      row.scrollIntoView({ block: 'nearest' });
      if (!row.contains(document.activeElement)) {
        row
          .querySelector<HTMLElement>('[contenteditable="true"], textarea, input:not([type="file"])')
          ?.focus();
      }
    });
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

  const handleUploadImages = (blockId: string, files: File[], replaceIndex?: number) => {
    const targetBlock = blocks.find((b) => b.id === blockId);
    const existingImages = targetBlock ? getBlockImages(targetBlock) : [];
    const isReplacingSingle =
      typeof replaceIndex === 'number' && replaceIndex >= 0 && replaceIndex < existingImages.length;

    const filesToProcess = isReplacingSingle
      ? files.slice(0, 1)
      : files.slice(0, Math.max(0, MAX_IMAGES_PER_BLOCK - existingImages.length));

    if (filesToProcess.length === 0) {
      setImageErrorByBlock((prev) => ({
        ...prev,
        [blockId]: `Cada bloco de Figura comporta até ${MAX_IMAGES_PER_BLOCK} imagens juntas.`,
      }));
      return;
    }

    const projectBytesWithoutThisBlock = calculateProjectImageBytes(blocks, metadata, blockId);
    const keptExistingBytes = existingImages.reduce((acc, item, idx) => {
      if (isReplacingSingle && idx === replaceIndex) return acc;
      return acc + getDataUrlByteSize(item.dataUrl);
    }, 0);

    const check = validateMultipleImageUploadsForProject(
      filesToProcess,
      projectBytesWithoutThisBlock + keptExistingBytes,
      isReplacingSingle ? existingImages.length - 1 : existingImages.length,
    );

    if (!check.valid) {
      setImageErrorByBlock((prev) => ({
        ...prev,
        [blockId]: check.error || 'Imagem excede o limite do projeto.',
      }));
      return;
    }

    setImageErrorByBlock((prev) => ({ ...prev, [blockId]: null }));

    Promise.all(
      filesToProcess.map(
        (file) =>
          new Promise<SubImageItem>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                resolve({
                  id: crypto.randomUUID(),
                  dataUrl: reader.result,
                  mime: file.type,
                  label: '',
                });
              } else {
                reject(new Error('Falha ao ler imagem'));
              }
            };
            reader.onerror = () => reject(new Error('Falha ao ler imagem'));
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then((loadedItems) => {
        let nextImages: SubImageItem[];
        if (isReplacingSingle && replaceIndex !== undefined) {
          nextImages = existingImages.map((item, idx) =>
            idx === replaceIndex
              ? { ...loadedItems[0], id: item.id, label: item.label }
              : item,
          );
        } else {
          nextImages = [...existingImages, ...loadedItems].slice(0, MAX_IMAGES_PER_BLOCK);
        }

        updateBlockMeta(blockId, {
          subImages: nextImages,
          imageDataUrl: nextImages[0]?.dataUrl,
          imageMime: nextImages[0]?.mime,
        });
      })
      .catch(() => {
        setImageErrorByBlock((prev) => ({
          ...prev,
          [blockId]: 'Não foi possível carregar uma das imagens selecionadas.',
        }));
      });
  };

  const handleImageUpload = (blockId: string, file: File) => {
    handleUploadImages(blockId, [file]);
  };

  const handleRemoveSubImage = (blockId: string, removeIndex: number) => {
    const targetBlock = blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;
    const existingImages = getBlockImages(targetBlock);
    const nextImages = existingImages.filter((_, idx) => idx !== removeIndex);
    setImageErrorByBlock((prev) => ({ ...prev, [blockId]: null }));
    updateBlockMeta(blockId, {
      subImages: nextImages.length > 0 ? nextImages : undefined,
      imageDataUrl: nextImages[0]?.dataUrl,
      imageMime: nextImages[0]?.mime,
    });
  };

  const handleClearImage = (blockId: string) => {
    setImageErrorByBlock((prev) => ({ ...prev, [blockId]: null }));
    updateBlockMeta(blockId, {
      subImages: undefined,
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
          onUploadImages={handleUploadImages}
          onRemoveSubImage={handleRemoveSubImage}
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
    <section aria-label="Editor de texto" className="flex-1 min-w-0 h-full flex flex-col bg-surface">
      {/* Barra do painel: mesmo padrão do PDF, com os controles no canto superior direito */}
      {!isCompact && (
        <div className="min-h-10 shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1 flex items-center justify-between gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileEdit className="w-3.5 h-3.5 text-brand-700 shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">Texto</span>
            <span className="text-slate-500 shrink-0">• {blocks.length} blocos</span>
          </div>
          <PaneWindowControls
            label="Texto"
            isMaximized={isMaximized}
            onMaximize={onMaximize}
            onRestore={onRestoreLayout}
            onMinimize={onMinimize}
            minimizeIcon={<Minus className="w-4 h-4" />}
          />
        </div>
      )}

      <div
        className={`@container flex-1 min-h-0 overflow-y-auto flex justify-center ${
          isCompact ? 'px-4 py-4' : 'py-8 pl-24 pr-6 @3xl:pl-28 @3xl:pr-14'
        }`}
      >
      <p className="sr-only" role="status" aria-live="polite">
        {moveAnnouncement}
      </p>
      <div
        className={`w-full ${
          isFullWidth || isCompact ? 'max-w-5xl' : 'max-w-2xl'
        } space-y-2 sm:space-y-3 pb-28 transition-all duration-200`}
      >
        {blocks.map((block, blockIndex) => {
          const activeCollab = activeCollaborators.find((c) => c.activeBlockId === block.id);
          return (
            <div
              key={block.id}
              data-block-id={block.id}
              onFocus={() => {
                setFocusedBlockId(block.id);
                onFocusBlock?.(block.id);
              }}
              onKeyDown={(e) => {
                // Alternativa ao arrastar: Ctrl/Cmd + Shift + ↑/↓ move o bloco
                if (
                  (e.ctrlKey || e.metaKey) &&
                  e.shiftKey &&
                  (e.key === 'ArrowUp' || e.key === 'ArrowDown')
                ) {
                  e.preventDefault();
                  moveBlock(block.id, e.key === 'ArrowUp' ? -1 : 1);
                }
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
              className={`group relative rounded-lg transition-all hover:bg-slate-50/80 dark:hover:bg-slate-900/50 ${
                isCompact
                  ? 'flex flex-col px-1 py-1.5'
                  : 'flex items-start gap-2.5 -ml-24 pl-24 pr-3 py-1.5'
              } ${draggedBlockId === block.id ? 'opacity-40' : ''} ${
                dragOverBlockId === block.id
                  ? 'border-t-2 border-brand-500 bg-brand-50/30'
                  : ''
              } ${activeCollab ? 'ring-1 ring-brand-400/80 bg-brand-50/15' : ''}`}
            >
              {/* Badge Flutuante do Colaborador Ativo no Bloco */}
              {activeCollab && (
                <div
                  className="absolute -top-2.5 right-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-800 border border-brand-300 shadow-xs animate-in fade-in zoom-in-95 duration-150"
                  title={`${activeCollab.user.name} (${activeCollab.user.email}) está editando este bloco`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                  <span>{activeCollab.user.name.split(' ')[0]} está aqui</span>
                </div>
              )}

              <BlockControlsGutter
                blockId={block.id}
                isMenuOpen={activeMenuBlockId === block.id}
                isCompact={isCompact}
                isActive={focusedBlockId === block.id || activeMenuBlockId === block.id}
                canDelete={blocks.length > 1}
                canMoveUp={blockIndex > 0}
                canMoveDown={blockIndex < blocks.length - 1}
                onMoveUp={(id) => moveBlock(id, -1)}
                onMoveDown={(id) => moveBlock(id, 1)}
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
                  onMoveUp={blockIndex > 0 ? () => moveBlock(block.id, -1) : undefined}
                  onMoveDown={
                    blockIndex < blocks.length - 1 ? () => moveBlock(block.id, 1) : undefined
                  }
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
          className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 py-2 px-3 rounded-md hover:bg-slate-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar parágrafo</span>
        </button>
      </div>
      </div>
    </section>
  );
};
