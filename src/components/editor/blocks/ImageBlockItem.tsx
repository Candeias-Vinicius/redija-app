import React, { useState } from 'react';
import { Grid2X2, Image as ImageIcon, Plus, Trash2, Upload } from 'lucide-react';
import { Block, ImageGridLayout } from '@/types/document';
import {
  calculateBlockImageBytes,
  formatBytes,
  getBlockImages,
  MAX_IMAGES_PER_BLOCK,
  MAX_PROJECT_IMAGE_BYTES,
} from '@/core/storage/imageQuota';

interface ImageBlockItemProps {
  block: Block;
  totalProjectImageBytes: number;
  imageError?: string | null;
  isBlockReorderDragging: boolean;
  onUpdateMeta: (id: string, meta: NonNullable<Block['meta']>) => void;
  onUploadImage: (blockId: string, file: File) => void;
  onUploadImages?: (blockId: string, files: File[], replaceIndex?: number) => void;
  onRemoveSubImage?: (blockId: string, index: number) => void;
  onClearImage: (blockId: string) => void;
}

export const ImageBlockItem: React.FC<ImageBlockItemProps> = ({
  block,
  totalProjectImageBytes,
  imageError,
  isBlockReorderDragging,
  onUpdateMeta,
  onUploadImage,
  onUploadImages,
  onRemoveSubImage,
  onClearImage,
}) => {
  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const images = getBlockImages(block);
  const blockBytes = calculateBlockImageBytes(block);
  const canAddMore = images.length < MAX_IMAGES_PER_BLOCK;
  const currentLayout: ImageGridLayout = block.meta?.imageLayout ?? 'auto';

  const handleFilesSelected = (fileList: FileList | File[] | null, replaceIndex?: number) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    if (onUploadImages) {
      onUploadImages(block.id, files, replaceIndex);
    } else {
      onUploadImage(block.id, files[0]);
    }
  };

  const handleUpdateSubLabel = (idx: number, nextLabel: string) => {
    const nextSubImages = images.map((item, i) =>
      i === idx ? { ...item, label: nextLabel } : item,
    );
    onUpdateMeta(block.id, {
      subImages: nextSubImages,
      imageDataUrl: nextSubImages[0]?.dataUrl,
      imageMime: nextSubImages[0]?.mime,
    });
  };

  const gridClass =
    images.length <= 1
      ? 'grid-cols-1'
      : currentLayout === 'stack'
        ? 'grid-cols-1'
        : currentLayout === 'grid_2x2'
          ? 'grid-cols-1 sm:grid-cols-2'
          : currentLayout === 'row'
            ? images.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : images.length === 3
                ? 'grid-cols-1 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-4'
            : images.length === 3
              ? 'grid-cols-1 sm:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2';

  return (
    <div
      tabIndex={0}
      onPaste={(e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const pastedFiles: File[] = [];
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) pastedFiles.push(file);
          }
        }
        if (pastedFiles.length > 0) {
          e.preventDefault();
          handleFilesSelected(pastedFiles);
        }
      }}
      onDragOver={(e) => {
        if (isBlockReorderDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverFile(true);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        setIsDragOverFile(false);
      }}
      onDrop={(e) => {
        if (isBlockReorderDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverFile(false);
        if (e.dataTransfer?.files?.length) {
          handleFilesSelected(e.dataTransfer.files);
        }
      }}
      className={`border rounded-xl p-4 bg-neutral-50/70 space-y-3 transition-colors focus:outline-none ${
        isDragOverFile
          ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-400'
          : 'border-neutral-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            Figura
          </span>
          <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
            {images.length}/{MAX_IMAGES_PER_BLOCK} {images.length === 1 ? 'imagem' : 'imagens'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {images.length > 1 && (
            <div className="flex items-center gap-1">
              <Grid2X2 className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={currentLayout}
                onChange={(e) =>
                  onUpdateMeta(block.id, {
                    imageLayout: e.target.value as ImageGridLayout,
                  })
                }
                title="Modo de disposição das imagens juntas na figura"
                className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded text-neutral-700"
              >
                <option value="auto">Disposição: Automática (Grade / Lado a lado)</option>
                <option value="grid_2x2">Grade 2×2 (2 por linha)</option>
                <option value="row">Lado a lado na mesma linha (1×{images.length})</option>
                <option value="stack">Uma abaixo da outra (Mesma figura)</option>
              </select>
            </div>
          )}

          <select
            value={block.meta?.imageWidthPct || 75}
            onChange={(e) =>
              onUpdateMeta(block.id, {
                imageWidthPct: Number(e.target.value) as 50 | 75 | 100,
              })
            }
            title="Largura da figura na folha A4 do PDF"
            className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded text-neutral-700"
          >
            <option value={50}>Largura: 50%</option>
            <option value={75}>Largura: 75%</option>
            <option value={100}>Largura: 100%</option>
          </select>

          {canAddMore && (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium text-[11px] shadow-2xs">
              {images.length === 0 ? (
                <>
                  <Upload className="w-3 h-3 text-blue-600" />
                  <span>Upload de imagens (até 4)</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 text-blue-600" />
                  <span>Adicionar imagem ({images.length}/{MAX_IMAGES_PER_BLOCK})</span>
                </>
              )}
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  handleFilesSelected(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          )}

          {images.length > 0 && (
            <button
              type="button"
              onClick={() => onClearImage(block.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-red-200 hover:bg-red-50 text-red-600 font-medium text-[11px] transition-colors"
              title="Remover todas as imagens deste bloco (mantendo a legenda e fonte)"
            >
              <Trash2 className="w-3 h-3" />
              <span>{images.length > 1 ? 'Limpar imagens' : 'Remover imagem'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Quota de Armazenamento de Imagens do Projeto (150 MB) */}
      <div className="flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200 text-[11px]">
        <span className="text-neutral-500">
          Uso de imagens no projeto:{' '}
          <strong className="text-neutral-800">{formatBytes(totalProjectImageBytes)}</strong> / 150
          MB
          {images.length > 0 && (
            <span className="text-neutral-400 ml-1.5">
              (esta figura: {formatBytes(blockBytes)})
            </span>
          )}
        </span>
        <div className="w-28 h-1.5 bg-neutral-200 rounded-full overflow-hidden shrink-0">
          <div
            className={`h-full rounded-full transition-all ${
              totalProjectImageBytes / MAX_PROJECT_IMAGE_BYTES > 0.85
                ? 'bg-red-500'
                : 'bg-emerald-500'
            }`}
            style={{
              width: `${Math.min(
                100,
                Math.max(1, (totalProjectImageBytes / MAX_PROJECT_IMAGE_BYTES) * 100),
              )}%`,
            }}
          />
        </div>
      </div>

      {imageError && (
        <div className="p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium">
          {imageError}
        </div>
      )}

      {/* Legenda no topo */}
      <div>
        <label className="text-[10px] font-semibold uppercase text-neutral-400 block mb-0.5">
          Título / Legenda Superior
        </label>
        <input
          type="text"
          value={block.meta?.caption || ''}
          onChange={(e) => onUpdateMeta(block.id, { caption: e.target.value })}
          placeholder="Ex: Comparação dos cenários avaliados (a, b, c, d)"
          className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
        />
      </div>

      {/* Preview das Imagens (1 a 4 imagens juntas) ou Área de Arrastar e Colar */}
      {images.length > 0 ? (
        <div className={`grid ${gridClass} gap-2.5`}>
          {images.map((item, idx) => {
            const subLetter = String.fromCharCode(97 + idx);
            return (
              <div
                key={item.id || idx}
                className="bg-white p-2 rounded-lg border border-neutral-200 flex flex-col justify-between gap-2"
              >
                <div className="relative flex items-center justify-center min-h-[120px] bg-neutral-50/60 rounded overflow-hidden">
                  <img
                    src={item.dataUrl}
                    alt={item.label || block.meta?.caption || `Imagem ${idx + 1}`}
                    className="max-h-52 object-contain rounded"
                  />
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    <label
                      className="cursor-pointer px-1.5 py-0.5 rounded bg-white/90 hover:bg-white border border-neutral-200 text-[10px] font-medium text-neutral-700 shadow-2xs"
                      title="Trocar esta imagem"
                    >
                      Trocar
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(e) => {
                          handleFilesSelected(e.target.files, idx);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>
                    {images.length > 1 && onRemoveSubImage && (
                      <button
                        type="button"
                        onClick={() => onRemoveSubImage(block.id, idx)}
                        className="px-1.5 py-0.5 rounded bg-white/90 hover:bg-red-50 border border-red-200 text-[10px] font-medium text-red-600 shadow-2xs"
                        title="Remover esta imagem do conjunto"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                {images.length > 1 && (
                  <input
                    type="text"
                    value={item.label || ''}
                    onChange={(e) => handleUpdateSubLabel(idx, e.target.value)}
                    placeholder={`(${subLetter}) Sublegenda opcional`}
                    className="w-full text-[11px] px-2 py-1 bg-neutral-50 border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <label className="w-full h-28 bg-neutral-100 hover:bg-neutral-200/50 border border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center text-neutral-400 text-xs cursor-pointer transition-colors px-4 text-center">
          <Upload className="w-5 h-5 mb-1.5 text-blue-600" />
          <span className="font-medium text-neutral-600">
            Clique para selecionar até 4 imagens juntas, arraste os arquivos aqui ou cole (Ctrl+V)
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5">
            Suporta PNG, JPG, WebP, GIF • Lado a lado ou em grade 2×2 (limite do projeto: 150 MB)
          </span>
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              handleFilesSelected(e.target.files);
              e.target.value = '';
            }}
            className="hidden"
          />
        </label>
      )}

      {/* Fonte na base */}
      <div>
        <label className="text-[10px] font-semibold uppercase text-neutral-400 block mb-0.5">
          Fonte Inferior
        </label>
        <input
          type="text"
          value={block.meta?.source || ''}
          onChange={(e) => onUpdateMeta(block.id, { source: e.target.value })}
          placeholder="Ex: Elaborado pelo autor (2026)"
          className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
        />
      </div>
    </div>
  );
};
