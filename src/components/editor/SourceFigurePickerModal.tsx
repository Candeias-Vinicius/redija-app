import React from 'react';
import {
  AlertCircle,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  Table as TableIcon,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Block, DocumentProject } from '@/types/document';
import { formatBytes, getBlockImages } from '@/core/storage/imageQuota';
import { listSourceVisualBlocks, SourceVisualFigureItem } from '@/core/transpiler/slideGenerator';

interface SourceFigurePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceProject: DocumentProject | null;
  sourceProjectName?: string;
  onInsertVisualBlock: (sourceBlock: Block) => void;
}

export const SourceFigurePickerModal: React.FC<SourceFigurePickerModalProps> = ({
  isOpen,
  onClose,
  sourceProject,
  sourceProjectName,
  onInsertVisualBlock,
}) => {
  if (!isOpen) return null;

  const items: SourceVisualFigureItem[] = sourceProject
    ? listSourceVisualBlocks(sourceProject)
    : [];

  return (
    <Modal onClose={onClose} labelledBy="source-figure-picker-title">
      <div className="bg-surface rounded-2xl w-full max-w-2xl shadow-2xl border border-line overflow-hidden flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-sunken">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 id="source-figure-picker-title" className="font-bold text-fg text-sm">
                Inserir figura ou tabela do trabalho
              </h3>
              <p className="text-xs text-fg-muted">
                {sourceProjectName || sourceProject?.name
                  ? `Origem: ${sourceProjectName || sourceProject?.name}`
                  : 'Copia figuras e tabelas com suas legendas para o slide atual'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Figuras e Tabelas */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {!sourceProject ? (
            <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Trabalho de origem não encontrado</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  O trabalho de origem pode ter sido excluído. As figuras já copiadas para esta
                  apresentação continuam salvas normalmente nos seus slides.
                </p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2 text-xs text-fg-muted">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-fg">
                Nenhuma figura ou tabela encontrada no trabalho de origem
              </p>
              <p className="text-xs text-fg-muted max-w-sm mx-auto">
                Adicione blocos de Figura, Tabela ou Quadro no trabalho original ou insira um bloco
                diretamente pelo comando <kbd className="px-1 py-0.5 border rounded font-mono">/</kbd>.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const images = item.type === 'image' ? getBlockImages(item.block) : [];
              return (
                <div
                  key={item.blockId}
                  className="p-3.5 rounded-xl border border-line bg-surface hover:border-brand-500 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {item.type === 'image' && images.length > 0 ? (
                      <div className="w-16 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={images[0].dataUrl}
                          alt={item.caption}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-surface-sunken border border-line shrink-0 flex items-center justify-center">
                        {item.type === 'image' ? (
                          <ImageIcon className="w-5 h-5 text-blue-600" />
                        ) : item.type === 'box' ? (
                          <LayoutGrid className="w-5 h-5 text-teal-600" />
                        ) : (
                          <TableIcon className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.type === 'image'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.type === 'box'
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {item.type === 'image'
                            ? item.imageCount > 1
                              ? `Figura (${item.imageCount} imagens)`
                              : 'Figura'
                            : item.type === 'box'
                              ? 'Quadro'
                              : 'Tabela'}
                        </span>
                        <span className="text-xs text-fg-muted truncate">
                          Seção: {item.sectionTitle}
                        </span>
                        {item.byteSize > 0 && (
                          <span className="text-xs text-fg-muted">
                            • {formatBytes(item.byteSize)}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-xs text-fg mt-1 truncate">
                        {item.caption}
                      </p>
                      <p className="text-xs text-fg-muted truncate">
                        Fonte: {item.source}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onInsertVisualBlock(item.block);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-xs font-semibold shrink-0 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Inserir no slide</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3 border-t border-line bg-surface-sunken flex items-center justify-between text-xs text-fg-muted">
          <span>
            As imagens inseridas são copiadas para a apresentação e não dependem do arquivo original.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg font-medium text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
