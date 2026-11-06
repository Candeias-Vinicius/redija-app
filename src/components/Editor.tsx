import React, { useState } from 'react';
import { Block, BlockType } from '@/types/document';
import { 
  Heading1, 
  Heading2, 
  Heading3, 
  AlignLeft, 
  Quote, 
  List, 
  ListOrdered, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  GripVertical 
} from 'lucide-react';

interface EditorProps {
  blocks: Block[];
  onChangeBlocks: (blocks: Block[]) => void;
}

export const Editor: React.FC<EditorProps> = ({ blocks, onChangeBlocks }) => {
  const [activeMenuBlockId, setActiveMenuBlockId] = useState<string | null>(null);

  const updateBlockContent = (id: string, content: string) => {
    onChangeBlocks(
      blocks.map((b) => (b.id === id ? { ...b, content } : b))
    );
  };

  const updateBlockMeta = (id: string, meta: Record<string, any>) => {
    onChangeBlocks(
      blocks.map((b) => (b.id === id ? { ...b, meta: { ...b.meta, ...meta } } : b))
    );
  };

  const addBlock = (afterId: string, type: BlockType = 'paragraph') => {
    const newBlock: Block = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      content: '',
      meta: type === 'quote_long' ? { author: 'SOBRENOME', year: '2024', page: '15' } : undefined,
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
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) return;
    onChangeBlocks(blocks.filter((b) => b.id !== id));
  };

  const changeBlockType = (id: string, type: BlockType) => {
    onChangeBlocks(
      blocks.map((b) =>
        b.id === id
          ? {
              ...b,
              type,
              meta: type === 'quote_long' ? { author: 'SOBRENOME', year: '2024', page: '15' } : b.meta,
            }
          : b
      )
    );
    setActiveMenuBlockId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white py-12 px-6 sm:px-16 flex justify-center">
      <div className="w-full max-w-2xl space-y-4">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="group relative flex items-start gap-2 -ml-8 pl-8 py-1 rounded-md transition-colors hover:bg-neutral-50/70"
          >
            {/* Botões de Ação ao passar o mouse */}
            <div className="absolute left-0 top-1.5 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-neutral-400">
              <button
                onClick={() => addBlock(block.id)}
                className="p-1 hover:text-emerald-600 rounded"
                title="Inserir bloco abaixo"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setActiveMenuBlockId(activeMenuBlockId === block.id ? null : block.id)}
                className="p-1 hover:text-neutral-800 rounded"
                title="Mudar tipo de bloco"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              {blocks.length > 1 && (
                <button
                  onClick={() => removeBlock(block.id)}
                  className="p-1 hover:text-red-500 rounded"
                  title="Excluir bloco"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Menu de Transformação de Bloco (Estilo Slash) */}
            {activeMenuBlockId === block.id && (
              <div className="absolute left-6 top-8 z-20 w-48 bg-white border border-neutral-200 shadow-lg rounded-lg py-1 text-xs">
                <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase">
                  Transformar em:
                </div>
                <button
                  onClick={() => changeBlockType(block.id, 'paragraph')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left"
                >
                  <AlignLeft className="w-3.5 h-3.5 text-neutral-500" /> Parágrafo
                </button>
                <button
                  onClick={() => changeBlockType(block.id, 'h1')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left font-bold"
                >
                  <Heading1 className="w-3.5 h-3.5 text-neutral-500" /> Título Primário (H1)
                </button>
                <button
                  onClick={() => changeBlockType(block.id, 'h2')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left font-semibold"
                >
                  <Heading2 className="w-3.5 h-3.5 text-neutral-500" /> Título Secundário (H2)
                </button>
                <button
                  onClick={() => changeBlockType(block.id, 'h3')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left italic"
                >
                  <Heading3 className="w-3.5 h-3.5 text-neutral-500" /> Título Terciário (H3)
                </button>
                <button
                  onClick={() => changeBlockType(block.id, 'quote_long')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left text-emerald-700 font-medium"
                >
                  <Quote className="w-3.5 h-3.5 text-emerald-600" /> Citação Longa (+3 linhas)
                </button>
                <button
                  onClick={() => changeBlockType(block.id, 'bullet')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left"
                >
                  <List className="w-3.5 h-3.5 text-neutral-500" /> Lista de Marcadores
                </button>
                <button
                  onClick={() => changeBlockType(block.id, 'numbered')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left"
                >
                  <ListOrdered className="w-3.5 h-3.5 text-neutral-500" /> Lista Numerada
                </button>
                <button
                  onClick={() => changeBlockType(block.id, 'image')}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-neutral-500" /> Figura com Fonte
                </button>
              </div>
            )}

            {/* Renderização e Edição de cada Bloco */}
            <div className="flex-1">
              {block.type === 'h1' && (
                <input
                  type="text"
                  value={block.content}
                  onChange={(e) => updateBlockContent(block.id, e.target.value)}
                  placeholder="1 INTRODUÇÃO"
                  className="w-full font-bold text-lg text-neutral-900 border-none focus:outline-none placeholder-neutral-300 uppercase tracking-wide"
                />
              )}

              {block.type === 'h2' && (
                <input
                  type="text"
                  value={block.content}
                  onChange={(e) => updateBlockContent(block.id, e.target.value)}
                  placeholder="1.1 Contexto e Justificativa"
                  className="w-full font-bold text-base text-neutral-900 border-none focus:outline-none placeholder-neutral-300"
                />
              )}

              {block.type === 'h3' && (
                <input
                  type="text"
                  value={block.content}
                  onChange={(e) => updateBlockContent(block.id, e.target.value)}
                  placeholder="1.1.1 Detalhes Específicos"
                  className="w-full italic font-medium text-sm text-neutral-800 border-none focus:outline-none placeholder-neutral-300"
                />
              )}

              {block.type === 'paragraph' && (
                <textarea
                  rows={Math.max(1, Math.ceil(block.content.length / 80))}
                  value={block.content}
                  onChange={(e) => updateBlockContent(block.id, e.target.value)}
                  placeholder="Digite seu texto... (Pressione Enter para novo bloco ou use os botões à esquerda)"
                  className="w-full text-sm leading-relaxed text-neutral-800 resize-none border-none focus:outline-none placeholder-neutral-300"
                />
              )}

              {block.type === 'quote_long' && (
                <div className="border-l-4 border-emerald-500 bg-neutral-50/80 p-3 rounded-r-md ml-8 text-xs text-neutral-700">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold mb-1">
                    <Quote className="w-3 h-3" />
                    <span>Citação Direta Longa (ABNT NBR 10520 - Recuo 4cm)</span>
                  </div>
                  <textarea
                    rows={3}
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    placeholder="Cole aqui o trecho textual longo..."
                    className="w-full text-xs leading-normal bg-transparent resize-none border-none focus:outline-none italic text-neutral-700"
                  />
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-neutral-200/60">
                    <input
                      type="text"
                      value={block.meta?.author || ''}
                      onChange={(e) => updateBlockMeta(block.id, { author: e.target.value })}
                      placeholder="Sobrenome do Autor"
                      className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded"
                    />
                    <input
                      type="text"
                      value={block.meta?.year || ''}
                      onChange={(e) => updateBlockMeta(block.id, { year: e.target.value })}
                      placeholder="Ano (ex: 2024)"
                      className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded"
                    />
                    <input
                      type="text"
                      value={block.meta?.page || ''}
                      onChange={(e) => updateBlockMeta(block.id, { page: e.target.value })}
                      placeholder="Página (ex: 42)"
                      className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded"
                    />
                  </div>
                </div>
              )}

              {block.type === 'bullet' && (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1" />
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    placeholder="Item de lista..."
                    className="w-full text-sm text-neutral-800 border-none focus:outline-none"
                  />
                </div>
              )}

              {block.type === 'numbered' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-400">1.</span>
                  <input
                    type="text"
                    value={block.content}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    placeholder="Item numerado..."
                    className="w-full text-sm text-neutral-800 border-none focus:outline-none"
                  />
                </div>
              )}

              {block.type === 'image' && (
                <div className="border border-dashed border-neutral-300 rounded-lg p-4 bg-neutral-50/50 text-center text-xs">
                  <div className="w-full h-24 bg-neutral-100 rounded flex items-center justify-center text-neutral-400 mb-2">
                    <ImageIcon className="w-6 h-6 mr-1" /> Ilustração / Gráfico
                  </div>
                  <input
                    type="text"
                    value={block.meta?.caption || ''}
                    onChange={(e) => updateBlockMeta(block.id, { caption: e.target.value })}
                    placeholder="Legenda da figura (ex: Diagrama da Arquitetura do Sistema)"
                    className="w-full text-xs text-center border-b border-neutral-200 pb-1 mb-1 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={block.meta?.source || ''}
                    onChange={(e) => updateBlockMeta(block.id, { source: e.target.value })}
                    placeholder="Fonte (ex: Dados da pesquisa, 2026)"
                    className="w-full text-[11px] text-center text-neutral-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
