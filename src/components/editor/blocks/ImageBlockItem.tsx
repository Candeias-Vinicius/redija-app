import React, { useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { Block } from '@/types/document';
import {
  formatBytes,
  getDataUrlByteSize,
  MAX_PROJECT_IMAGE_BYTES,
} from '@/core/storage/imageQuota';

interface ImageBlockItemProps {
  block: Block;
  totalProjectImageBytes: number;
  imageError?: string | null;
  isBlockReorderDragging: boolean;
  readOnly?: boolean;
  onUpdateMeta: (id: string, meta: NonNullable<Block['meta']>) => void;
  onUploadImage: (blockId: string, file: File) => void;
  onClearImage: (blockId: string) => void;
}

export const ImageBlockItem: React.FC<ImageBlockItemProps> = ({
  block,
  totalProjectImageBytes,
  imageError,
  isBlockReorderDragging,
  readOnly = false,
  onUpdateMeta,
  onUploadImage,
  onClearImage,
}) => {
  const [isDragOverFile, setIsDragOverFile] = useState(false);

  return (
    <div
      tabIndex={0}
      onPaste={(e) => {
        if (readOnly) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              e.preventDefault();
              onUploadImage(block.id, file);
              break;
            }
          }
        }
      }}
      onDragOver={(e) => {
        if (readOnly || isBlockReorderDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverFile(true);
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        setIsDragOverFile(false);
      }}
      onDrop={(e) => {
        if (readOnly || isBlockReorderDragging) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverFile(false);
        const file = e.dataTransfer?.files?.[0];
        if (file && file.type.startsWith('image/')) {
          onUploadImage(block.id, file);
        }
      }}
      className={`border rounded-xl p-4 bg-neutral-50/70 space-y-3 transition-colors focus:outline-none ${
        isDragOverFile
          ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-400'
          : 'border-neutral-200'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
          Figura
        </span>
        <div className="flex items-center gap-2">
          <select
            value={block.meta?.imageWidthPct || 75}
            disabled={readOnly}
            onChange={(e) => {
              if (!readOnly) {
                onUpdateMeta(block.id, {
                  imageWidthPct: Number(e.target.value) as 50 | 75 | 100,
                });
              }
            }}
            title="Largura da imagem na folha A4 do PDF"
            className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded text-neutral-700 disabled:opacity-70"
          >
            <option value={50}>Largura: 50%</option>
            <option value={75}>Largura: 75%</option>
            <option value={100}>Largura: 100%</option>
          </select>

          {!readOnly && (
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium text-[11px] shadow-2xs">
              <Upload className="w-3 h-3 text-blue-600" />
              <span>{block.meta?.imageDataUrl ? 'Trocar imagem' : 'Upload de imagem'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadImage(block.id, file);
                }}
                className="hidden"
              />
            </label>
          )}

          {!readOnly && block.meta?.imageDataUrl && (
            <button
              type="button"
              onClick={() => onClearImage(block.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-red-200 hover:bg-red-50 text-red-600 font-medium text-[11px] transition-colors"
              title="Remover apenas a imagem (mantendo o bloco e as legendas)"
            >
              <Trash2 className="w-3 h-3" />
              <span>Remover imagem</span>
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
          {block.meta?.imageDataUrl && (
            <span className="text-neutral-400 ml-1.5">
              (esta figura: {formatBytes(getDataUrlByteSize(block.meta.imageDataUrl))})
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
          readOnly={readOnly}
          onChange={(e) => {
            if (!readOnly) onUpdateMeta(block.id, { caption: e.target.value });
          }}
          placeholder="Ex: Fluxo de arquitetura do sistema"
          className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
        />
      </div>

      {/* Preview da Imagem ou Área de Arrastar e Colar */}
      {block.meta?.imageDataUrl ? (
        <div className="relative bg-white p-2 rounded-lg border border-neutral-200 flex justify-center">
          <img
            src={block.meta.imageDataUrl}
            alt={block.meta.caption || 'Figura do documento'}
            className="max-h-56 object-contain rounded"
          />
        </div>
      ) : readOnly ? (
        <div className="w-full h-20 bg-neutral-100 border border-dashed border-neutral-300 rounded-lg flex items-center justify-center text-neutral-400 text-xs">
          Nenhuma imagem anexada neste bloco.
        </div>
      ) : (
        <label className="w-full h-28 bg-neutral-100 hover:bg-neutral-200/50 border border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center text-neutral-400 text-xs cursor-pointer transition-colors px-4 text-center">
          <Upload className="w-5 h-5 mb-1.5 text-blue-600" />
          <span className="font-medium text-neutral-600">
            Clique para Upload de imagem, arraste o arquivo aqui ou cole (Ctrl+V)
          </span>
          <span className="text-[11px] text-neutral-400 mt-0.5">
            Suporta PNG, JPG, WebP, GIF (limite total do projeto: 150 MB)
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(block.id, file);
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
          readOnly={readOnly}
          onChange={(e) => {
            if (!readOnly) onUpdateMeta(block.id, { source: e.target.value });
          }}
          placeholder="Ex: Elaborado pelo autor (2026)"
          className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
        />
      </div>
    </div>
  );
};
