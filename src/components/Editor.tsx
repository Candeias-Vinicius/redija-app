import React, { useState } from 'react';
import { Block, BlockType, AcademicReference } from '@/types/document';
import { RichTextInput } from './RichTextInput';
import {
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  Quote,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  MessageSquareQuote,
  Scissors,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Upload,
  Search,
  X,
} from 'lucide-react';

interface EditorProps {
  blocks: Block[];
  references: AcademicReference[];
  citationStyle?: 'uppercase' | 'titlecase';
  onChangeBlocks: (blocks: Block[]) => void;
}

interface SlashMenuOption {
  type: BlockType;
  label: string;
  description: string;
  keywords: string;
  icon: React.ReactNode;
}

const SLASH_OPTIONS: SlashMenuOption[] = [
  {
    type: 'paragraph',
    label: 'Parágrafo ABNT',
    description: 'Texto corrido justificado com recuo de 1,25 cm',
    keywords: 'paragrafo texto normal p',
    icon: <AlignLeft className="w-4 h-4 text-neutral-500" />,
  },
  {
    type: 'h1',
    label: 'Seção Primária (1)',
    description: 'Título de capítulo em caixa alta e negrito (quebra página)',
    keywords: 'titulo 1 h1 capitulo secao primaria',
    icon: <Heading1 className="w-4 h-4 text-neutral-700" />,
  },
  {
    type: 'h2',
    label: 'Seção Secundária (1.1)',
    description: 'Subtítulo em negrito',
    keywords: 'titulo 2 h2 subsecao secundaria',
    icon: <Heading2 className="w-4 h-4 text-neutral-700" />,
  },
  {
    type: 'h3',
    label: 'Seção Terciária (1.1.1)',
    description: 'Subseção de 3º nível em itálico',
    keywords: 'titulo 3 h3 subsecao terciaria',
    icon: <Heading3 className="w-4 h-4 text-neutral-700" />,
  },
  {
    type: 'quote_long',
    label: 'Citação Direta Longa',
    description: 'Mais de 3 linhas: recuo de 4 cm, fonte 10 pt (NBR 10520)',
    keywords: 'citacao longa direta recuo 4cm autor',
    icon: <Quote className="w-4 h-4 text-emerald-600" />,
  },
  {
    type: 'image',
    label: 'Figura com Upload',
    description: 'Ilustração/gráfico com legenda no topo e fonte abaixo',
    keywords: 'figura imagem foto grafico upload ilustracao',
    icon: <ImageIcon className="w-4 h-4 text-blue-600" />,
  },
  {
    type: 'table',
    label: 'Tabela ABNT / IBGE',
    description: 'Tabela aberta nas laterais com título no topo e fonte abaixo',
    keywords: 'tabela quadro dados linhas colunas',
    icon: <TableIcon className="w-4 h-4 text-purple-600" />,
  },
  {
    type: 'bullet',
    label: 'Lista de Marcadores',
    description: 'Alíneas e tópicos não ordenados',
    keywords: 'lista marcadores topicos bullet',
    icon: <List className="w-4 h-4 text-neutral-500" />,
  },
  {
    type: 'numbered',
    label: 'Lista Numerada',
    description: 'Itens sequenciais numerados automaticamente',
    keywords: 'lista numerada ordenada 1 2 3',
    icon: <ListOrdered className="w-4 h-4 text-neutral-500" />,
  },
  {
    type: 'footnote',
    label: 'Nota de Rodapé',
    description: 'Nota explicativa numerada no rodapé da página',
    keywords: 'nota rodape explicacao referencia',
    icon: <MessageSquareQuote className="w-4 h-4 text-amber-600" />,
  },
  {
    type: 'pagebreak',
    label: 'Quebra de Página',
    description: 'Força o conteúdo seguinte a iniciar em nova folha A4',
    keywords: 'quebra pagina nova folha pagebreak',
    icon: <Scissors className="w-4 h-4 text-neutral-500" />,
  },
];

function createDefaultMetaForType(type: BlockType): Block['meta'] {
  if (type === 'quote_long') {
    return { author: 'SOBRENOME', year: '2025', page: '15' };
  }
  if (type === 'image') {
    return { caption: 'Descrição da figura', source: 'do autor' };
  }
  if (type === 'table') {
    return {
      caption: 'Comparativo de resultados',
      source: 'Dados da pesquisa',
      headers: ['Critério', 'Resultado'],
      rows: [
        ['Item A', '98%'],
        ['Item B', '94%'],
      ],
    };
  }
  return undefined;
}

export const Editor: React.FC<EditorProps> = ({
  blocks,
  references,
  citationStyle = 'uppercase',
  onChangeBlocks,
}) => {
  const [activeMenuBlockId, setActiveMenuBlockId] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  const updateBlockContent = (id: string, content: string) => {
    onChangeBlocks(blocks.map((b) => (b.id === id ? { ...b, content } : b)));
  };

  const updateBlockMeta = (id: string, meta: NonNullable<Block['meta']>) => {
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

  const moveBlock = (id: string, direction: -1 | 1) => {
    const index = blocks.findIndex((b) => b.id === id);
    const targetIndex = index + direction;
    if (index === -1 || targetIndex < 0 || targetIndex >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    onChangeBlocks(next);
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

  const handleImageUpload = (blockId: string, file: File) => {
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

  // Calcula numeração progressiva automática (1, 1.1, 1.1.1) para exibição visual no editor
  const computeSectionNumbers = (): Record<string, string> => {
    let h1 = 0;
    let h2 = 0;
    let h3 = 0;
    const map: Record<string, string> = {};

    for (const b of blocks) {
      if (b.type === 'h1') {
        h1 += 1;
        h2 = 0;
        h3 = 0;
        map[b.id] = `${h1}`;
      } else if (b.type === 'h2') {
        if (h1 === 0) h1 = 1;
        h2 += 1;
        h3 = 0;
        map[b.id] = `${h1}.${h2}`;
      } else if (b.type === 'h3') {
        if (h1 === 0) h1 = 1;
        if (h2 === 0) h2 = 1;
        h3 += 1;
        map[b.id] = `${h1}.${h2}.${h3}`;
      }
    }
    return map;
  };

  const sectionNumbers = computeSectionNumbers();

  const filteredOptions = SLASH_OPTIONS.filter((opt) => {
    const q = menuSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      opt.label.toLowerCase().includes(q) ||
      opt.description.toLowerCase().includes(q) ||
      opt.keywords.includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto bg-white py-10 px-6 sm:px-14 flex justify-center">
      <div className="w-full max-w-2xl space-y-3 pb-24">
        {/* Dica rápida no topo do editor */}
        <div className="mb-6 pb-3 border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
          <span>
            Dica: digite <kbd className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded border border-neutral-200 font-mono">/</kbd> em um bloco vazio para abrir os blocos ABNT ou selecione texto para formatar.
          </span>
          <span>{blocks.length} blocos</span>
        </div>

        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className="group relative flex items-start gap-2 -ml-14 pl-14 py-1.5 rounded-lg transition-colors hover:bg-neutral-50/80"
          >
            {/* Controles laterais do bloco */}
            <div className="absolute left-0 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-neutral-400 transition-opacity">
              <button
                type="button"
                onClick={() => addBlock(block.id)}
                className="p-1 hover:text-emerald-600 hover:bg-neutral-100 rounded"
                title="Inserir bloco abaixo (Enter)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveMenuBlockId(activeMenuBlockId === block.id ? null : block.id);
                  setMenuSearch('');
                }}
                className="p-1 hover:text-neutral-800 hover:bg-neutral-100 rounded"
                title="Mudar tipo de bloco (/)"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
              <div className="flex flex-col">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveBlock(block.id, -1)}
                  className="p-0.5 hover:text-neutral-800 disabled:opacity-25"
                  title="Mover para cima"
                >
                  <ArrowUp className="w-2.5 h-2.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === blocks.length - 1}
                  onClick={() => moveBlock(block.id, 1)}
                  className="p-0.5 hover:text-neutral-800 disabled:opacity-25"
                  title="Mover para baixo"
                >
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
              </div>
              {blocks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  className="p-1 hover:text-red-500 hover:bg-red-50 rounded"
                  title="Excluir bloco"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Menu Slash (`/`) com Busca */}
            {activeMenuBlockId === block.id && (
              <div className="absolute left-12 top-9 z-30 w-72 bg-white border border-neutral-200 shadow-xl rounded-xl overflow-hidden text-xs">
                <div className="p-2 border-b border-neutral-100 flex items-center gap-2 bg-neutral-50">
                  <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setActiveMenuBlockId(null);
                      } else if (e.key === 'Enter' && filteredOptions.length > 0) {
                        e.preventDefault();
                        changeBlockType(block.id, filteredOptions[0].type);
                      }
                    }}
                    autoFocus
                    placeholder="Buscar elemento ABNT..."
                    className="w-full bg-transparent text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveMenuBlockId(null)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto py-1 divide-y divide-neutral-50">
                  {filteredOptions.length === 0 ? (
                    <div className="p-3 text-center text-neutral-400">
                      Nenhum bloco encontrado.
                    </div>
                  ) : (
                    filteredOptions.map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        onClick={() => changeBlockType(block.id, opt.type)}
                        className="w-full flex items-start gap-2.5 px-3 py-2 hover:bg-emerald-50/70 text-left transition-colors"
                      >
                        <div className="mt-0.5 p-1.5 rounded-md bg-neutral-100 shrink-0">
                          {opt.icon}
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-800">{opt.label}</div>
                          <div className="text-[11px] text-neutral-500 leading-tight">
                            {opt.description}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Conteúdo de cada tipo de bloco */}
            <div className="flex-1 min-w-0">
              {(block.type === 'h1' || block.type === 'h2' || block.type === 'h3') && (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded select-none">
                    {sectionNumbers[block.id]}
                  </span>
                  <input
                    type="text"
                    value={block.content}
                    autoFocus={focusedBlockId === block.id}
                    onChange={(e) => updateBlockContent(block.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBlock(block.id, 'paragraph');
                      } else if (e.key === 'Backspace' && !block.content) {
                        e.preventDefault();
                        removeBlock(block.id);
                      }
                    }}
                    placeholder={
                      block.type === 'h1'
                        ? 'TÍTULO DA SEÇÃO PRIMÁRIA'
                        : block.type === 'h2'
                          ? 'Título da subseção secundária'
                          : 'Título da subseção terciária'
                    }
                    className={`w-full border-none bg-transparent focus:outline-none placeholder-neutral-300 ${
                      block.type === 'h1'
                        ? 'font-bold text-lg text-neutral-900 uppercase tracking-wide'
                        : block.type === 'h2'
                          ? 'font-bold text-base text-neutral-900'
                          : 'italic font-medium text-sm text-neutral-800'
                    }`}
                  />
                </div>
              )}

              {block.type === 'paragraph' && (
                <RichTextInput
                  value={block.content}
                  references={references}
                  citationStyle={citationStyle}
                  autoFocus={focusedBlockId === block.id}
                  onChange={(html) => updateBlockContent(block.id, html)}
                  onEnter={() => addBlock(block.id, 'paragraph')}
                  onBackspaceEmpty={() => removeBlock(block.id)}
                  onSlashCommand={() => {
                    setActiveMenuBlockId(block.id);
                    setMenuSearch('');
                  }}
                  placeholder='Digite seu parágrafo, "/" para comandos ABNT ou "@" para citar referência...'
                  className="text-sm leading-relaxed text-neutral-800"
                />
              )}

              {block.type === 'bullet' && (
                <div className="flex items-start gap-2.5 pl-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 mt-2 shrink-0" />
                  <RichTextInput
                    value={block.content}
                    autoFocus={focusedBlockId === block.id}
                    onChange={(html) => updateBlockContent(block.id, html)}
                    onEnter={() => addBlock(block.id, 'bullet')}
                    onBackspaceEmpty={() => changeBlockType(block.id, 'paragraph')}
                    placeholder="Item de lista..."
                    className="text-sm leading-relaxed text-neutral-800"
                  />
                </div>
              )}

              {block.type === 'numbered' && (
                <div className="flex items-start gap-2.5 pl-2">
                  <span className="text-xs font-bold text-neutral-500 mt-1 shrink-0">1.</span>
                  <RichTextInput
                    value={block.content}
                    autoFocus={focusedBlockId === block.id}
                    onChange={(html) => updateBlockContent(block.id, html)}
                    onEnter={() => addBlock(block.id, 'numbered')}
                    onBackspaceEmpty={() => changeBlockType(block.id, 'paragraph')}
                    placeholder="Item numerado..."
                    className="text-sm leading-relaxed text-neutral-800"
                  />
                </div>
              )}

              {block.type === 'quote_long' && (
                <div className="border-l-4 border-emerald-500 bg-neutral-50/90 p-3.5 rounded-r-lg ml-8 text-xs text-neutral-700 space-y-2">
                  <div className="flex items-center justify-between text-emerald-700 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Quote className="w-3.5 h-3.5" />
                      Citação Direta Longa (ABNT NBR 10520 — Recuo 4 cm, fonte 10 pt)
                    </span>
                  </div>
                  <RichTextInput
                    value={block.content}
                    autoFocus={focusedBlockId === block.id}
                    onChange={(html) => updateBlockContent(block.id, html)}
                    onEnter={() => addBlock(block.id, 'paragraph')}
                    placeholder="Digite ou cole o trecho de mais de 3 linhas (sem aspas)..."
                    className="text-xs leading-normal text-neutral-700"
                  />
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-200/70">
                    <input
                      type="text"
                      value={block.meta?.author || ''}
                      onChange={(e) => updateBlockMeta(block.id, { author: e.target.value })}
                      placeholder="Autor (ex: SILVA)"
                      className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      value={block.meta?.year || ''}
                      onChange={(e) => updateBlockMeta(block.id, { year: e.target.value })}
                      placeholder="Ano (ex: 2024)"
                      className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
                    />
                    <input
                      type="text"
                      value={block.meta?.page || ''}
                      onChange={(e) => updateBlockMeta(block.id, { page: e.target.value })}
                      placeholder="Página (ex: 42)"
                      className="px-2 py-1 text-[11px] bg-white border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {block.type === 'image' && (
                <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/70 space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      Figura ABNT (NBR 14724 — Legenda acima, fonte abaixo)
                    </span>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-700 font-medium text-[11px] shadow-2xs">
                      <Upload className="w-3 h-3 text-blue-600" />
                      <span>{block.meta?.imageDataUrl ? 'Trocar imagem' : 'Enviar imagem'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/gif"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(block.id, file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Legenda no topo */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-neutral-400 block mb-0.5">
                      Título / Legenda Superior
                    </label>
                    <input
                      type="text"
                      value={block.meta?.caption || ''}
                      onChange={(e) => updateBlockMeta(block.id, { caption: e.target.value })}
                      placeholder="Ex: Fluxo de arquitetura do sistema"
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  {/* Preview da Imagem ou Espaço Reservado */}
                  {block.meta?.imageDataUrl ? (
                    <div className="relative bg-white p-2 rounded-lg border border-neutral-200 flex justify-center">
                      <img
                        src={block.meta.imageDataUrl}
                        alt={block.meta.caption || 'Figura do documento'}
                        className="max-h-56 object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-neutral-100 border border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center text-neutral-400 text-xs">
                      <ImageIcon className="w-5 h-5 mb-1" />
                      <span>Nenhuma imagem enviada (um quadro de espaço reservado será exibido no PDF)</span>
                    </div>
                  )}

                  {/* Fonte na base */}
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-neutral-400 block mb-0.5">
                      Fonte Inferior
                    </label>
                    <input
                      type="text"
                      value={block.meta?.source || ''}
                      onChange={(e) => updateBlockMeta(block.id, { source: e.target.value })}
                      placeholder="Ex: Elaborado pelo autor (2026)"
                      className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              )}

              {block.type === 'table' && (
                <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/70 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
                      <TableIcon className="w-3.5 h-3.5 text-purple-600" />
                      Tabela ABNT / IBGE
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const headers = [...(block.meta?.headers ?? ['Coluna 1', 'Coluna 2'])];
                          const rows = (block.meta?.rows ?? [['', '']]).map((r) => [...r, '']);
                          headers.push(`Coluna ${headers.length + 1}`);
                          updateBlockMeta(block.id, { headers, rows });
                        }}
                        className="px-2 py-1 bg-white border border-neutral-200 rounded hover:bg-neutral-100 text-[11px]"
                      >
                        + Coluna
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const headers = block.meta?.headers ?? ['Coluna 1', 'Coluna 2'];
                          const rows = [...(block.meta?.rows ?? [])];
                          rows.push(Array(headers.length).fill(''));
                          updateBlockMeta(block.id, { headers, rows });
                        }}
                        className="px-2 py-1 bg-white border border-neutral-200 rounded hover:bg-neutral-100 text-[11px]"
                      >
                        + Linha
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={block.meta?.caption || ''}
                    onChange={(e) => updateBlockMeta(block.id, { caption: e.target.value })}
                    placeholder="Título da Tabela (acima)"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  />

                  <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr className="bg-neutral-100 border-b border-neutral-300">
                          {(block.meta?.headers ?? ['Coluna 1', 'Coluna 2']).map((h, cIdx) => (
                            <th key={cIdx} className="p-1.5 border-r last:border-r-0 border-neutral-200">
                              <input
                                type="text"
                                value={h}
                                onChange={(e) => {
                                  const nextHeaders = [...(block.meta?.headers ?? ['Coluna 1', 'Coluna 2'])];
                                  nextHeaders[cIdx] = e.target.value;
                                  updateBlockMeta(block.id, { headers: nextHeaders });
                                }}
                                className="w-full font-bold bg-transparent focus:outline-none"
                              />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(block.meta?.rows ?? [['', '']]).map((row, rIdx) => (
                          <tr key={rIdx} className="border-b last:border-b-0 border-neutral-200">
                            {(block.meta?.headers ?? ['Coluna 1', 'Coluna 2']).map((_, cIdx) => (
                              <td key={cIdx} className="p-1.5 border-r last:border-r-0 border-neutral-200">
                                <input
                                  type="text"
                                  value={row[cIdx] ?? ''}
                                  onChange={(e) => {
                                    const nextRows = (block.meta?.rows ?? [['', '']]).map((r) => [...r]);
                                    nextRows[rIdx][cIdx] = e.target.value;
                                    updateBlockMeta(block.id, { rows: nextRows });
                                  }}
                                  placeholder="..."
                                  className="w-full bg-transparent focus:outline-none"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <input
                    type="text"
                    value={block.meta?.source || ''}
                    onChange={(e) => updateBlockMeta(block.id, { source: e.target.value })}
                    placeholder="Fonte da Tabela (abaixo)"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              {block.type === 'footnote' && (
                <div className="flex items-start gap-2 bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 text-xs">
                  <MessageSquareQuote className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block mb-0.5">
                      Nota de Rodapé
                    </span>
                    <RichTextInput
                      value={block.content}
                      autoFocus={focusedBlockId === block.id}
                      onChange={(html) => updateBlockContent(block.id, html)}
                      onEnter={() => addBlock(block.id, 'paragraph')}
                      placeholder="Texto explicativo que aparecerá no rodapé da página..."
                      className="text-xs text-neutral-700"
                    />
                  </div>
                </div>
              )}

              {block.type === 'pagebreak' && (
                <div className="my-2 flex items-center gap-3 text-[11px] text-neutral-400 select-none">
                  <div className="flex-1 border-t border-dashed border-neutral-300" />
                  <span className="flex items-center gap-1 font-medium uppercase tracking-wider">
                    <Scissors className="w-3 h-3" /> Quebra de Página A4
                  </span>
                  <div className="flex-1 border-t border-dashed border-neutral-300" />
                </div>
              )}
            </div>
          </div>
        ))}

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
