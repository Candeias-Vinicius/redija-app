import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Link2,
  Sigma,
  Superscript as SupIcon,
  Subscript as SubIcon,
  Bookmark,
  Plus,
  Search,
  X,
} from 'lucide-react';
import {
  hasRichHtmlMarkup,
  sanitizeLinkUrl,
  stripHtmlTags,
} from '@/core/transpiler/escape';
import { AcademicReference, CitationFormat } from '@/types/document';
import {
  getReferenceIndexMap,
  resolveCitationDisplay,
  resolveCitationFormat,
  type CitationCallMode,
} from '@/core/transpiler/abntLinter';
import { CitationRenderContext } from './editor/citationRenderContext';
import { CitationNode, InlineMathNode } from './editor/tiptapNodes';

interface RichTextInputProps {
  value: string;
  onChange: (html: string) => void;
  references?: AcademicReference[];
  refIndexMap?: Map<string, number>;
  citationStyle?: 'uppercase' | 'titlecase';
  citationFormat?: CitationFormat;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  openCitationTrigger?: number;
  onOpenNewReferenceModal?: () => void;
  onEnter?: () => void;
  onBackspaceEmpty?: () => void;
  onSlashCommand?: () => void;
}

export const RichTextInput: React.FC<RichTextInputProps> = ({
  value,
  onChange,
  references = [],
  refIndexMap: externalRefIndexMap,
  citationStyle = 'titlecase',
  citationFormat,
  placeholder = 'Digite seu texto, "/" para comandos ou "@" para citar referência...',
  className = '',
  autoFocus = false,
  openCitationTrigger = 0,
  onOpenNewReferenceModal,
  onEnter,
  onBackspaceEmpty,
  onSlashCommand,
}) => {
  const effectiveFormat = resolveCitationFormat({ citationFormat, citationStyle });
  const internalRefIndexMap = useMemo(() => getReferenceIndexMap(references), [references]);
  const refIndexMap = externalRefIndexMap ?? internalRefIndexMap;

  const [hasSelection, setHasSelection] = useState(false);
  const [showCitationPicker, setShowCitationPicker] = useState(false);
  const [citationSearch, setCitationSearch] = useState('');
  const [citeModeDraft, setCiteModeDraft] = useState<CitationCallMode>('parenthetical');
  const [citePageDraft, setCitePageDraft] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrlDraft, setLinkUrlDraft] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showMathInput, setShowMathInput] = useState(false);
  const [mathDraft, setMathDraft] = useState('');
  const [lastSeenTrigger, setLastSeenTrigger] = useState(openCitationTrigger);
  const popoverOpenRef = useRef(false);

  // Permite abrir o seletor de referência quando o usuário escolhe "Chamar Referência" no menu `/`
  if (openCitationTrigger !== lastSeenTrigger) {
    setLastSeenTrigger(openCitationTrigger);
    if (openCitationTrigger > 0) {
      setShowCitationPicker(true);
    }
  }

  useEffect(() => {
    popoverOpenRef.current = showCitationPicker || showLinkInput || showMathInput;
  }, [showCitationPicker, showLinkInput, showMathInput]);

  // Extensão para interceptar Enter, Backspace em vazio e '/' no início
  const KeyboardShortcuts = Extension.create({
    name: 'redijaShortcuts',
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          if (popoverOpenRef.current) return false;
          if (onEnter) {
            onEnter();
            return true;
          }
          return false;
        },
        Backspace: ({ editor: ed }) => {
          if (ed.state.doc.content.size <= 2 && onBackspaceEmpty) {
            onBackspaceEmpty();
            return true;
          }
          const plain = stripHtmlTags(ed.getHTML());
          if (!plain && ed.state.doc.childCount <= 1 && ed.state.doc.firstChild?.childCount === 0 && onBackspaceEmpty) {
            onBackspaceEmpty();
            return true;
          }
          return false;
        },
        Escape: () => {
          if (popoverOpenRef.current) {
            setShowCitationPicker(false);
            setShowLinkInput(false);
            setShowMathInput(false);
            return true;
          }
          return false;
        },
      };
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          protocols: ['https', 'http', 'mailto'],
        },
      }),
      Underline,
      Superscript,
      Subscript,
      CitationNode,
      InlineMathNode,
      Placeholder.configure({
        placeholder,
      }),
      KeyboardShortcuts,
    ],
    content: value,
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: `focus:outline-none min-h-[1.5rem] ${className}`,
      },
      handleTextInput: (view, _from, _to, text) => {
        if (text === '/' && view.state.doc.textContent.trim() === '' && onSlashCommand) {
          onSlashCommand();
          return true;
        }
        if (text === '@') {
          setShowCitationPicker(true);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const normalized = html === '<p></p>' ? '' : html;
      const normalizedValue = value === '<p></p>' ? '' : value;
      if (normalized === normalizedValue) return;

      // Se a única diferença for o wrapping inicial de <p> (ex: plain text "Olá" vs "<p>Olá</p>"),
      // não dispara onChange no primeiro clique/foco
      const plainHtml = stripHtmlTags(normalized).trim();
      const plainValue = stripHtmlTags(normalizedValue).trim();
      const hasMarkup = hasRichHtmlMarkup(normalized);

      if (plainHtml === plainValue && !hasMarkup && !normalizedValue.startsWith('<')) {
        return;
      }

      onChange(normalized);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      const { from, to } = ed.state.selection;
      setHasSelection(to > from);
    },
    onBlur: () => {
      setTimeout(() => setHasSelection(false), 180);
    },
  });

  // Sincroniza quando o projeto é trocado externamente
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const normalizedCurrent = current === '<p></p>' ? '' : current;
    if (value !== normalizedCurrent && !editor.isFocused) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const contextValue = useMemo(
    () => ({
      references,
      refIndexMap,
      citationFormat: effectiveFormat,
    }),
    [references, refIndexMap, effectiveFormat],
  );

  if (!editor) return null;

  const insertReferenceCitation = (ref: AcademicReference) => {
    const refNumber = refIndexMap.get(ref.id) ?? 1;
    const cleanPage = citePageDraft.trim();
    const display = resolveCitationDisplay(ref, {
      format: effectiveFormat,
      mode: citeModeDraft,
      page: cleanPage,
      refNumber,
    });

    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'citationNode',
          attrs: {
            citeId: ref.id,
            citePage: cleanPage,
            citeMode: citeModeDraft,
            fallbackLabel: display.label,
          },
        },
        { type: 'text', text: ' ' },
      ])
      .run();

    setShowCitationPicker(false);
    setCitationSearch('');
    setCitePageDraft('');
  };

  const openLinkPopover = () => {
    const existingHref = String(editor.getAttributes('link').href || '');
    setLinkUrlDraft(existingHref || 'https://');
    setLinkError(null);
    setShowLinkInput(true);
    setShowMathInput(false);
  };

  const applyLink = () => {
    const trimmed = linkUrlDraft.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
      setShowLinkInput(false);
      setLinkError(null);
      return;
    }
    const safeUrl = sanitizeLinkUrl(trimmed);
    if (!safeUrl) {
      setLinkError('Use uma URL válida com https://, http:// ou mailto:');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl }).run();
    setShowLinkInput(false);
    setLinkError(null);
  };

  const openMathPopover = () => {
    const { from, to } = editor.state.selection;
    const selectedText = to > from ? editor.state.doc.textBetween(from, to, ' ').trim() : '';
    setMathDraft(selectedText.replace(/^\$+|\$+$/g, '') || '');
    setShowMathInput(true);
    setShowLinkInput(false);
  };

  const applyMathNode = () => {
    const cleaned = mathDraft.trim().replace(/^\$+|\$+$/g, '').trim();
    if (!cleaned) {
      setShowMathInput(false);
      return;
    }
    editor
      .chain()
      .focus()
      .insertContent([
        { type: 'inlineMathNode', attrs: { math: cleaned } },
        { type: 'text', text: ' ' },
      ])
      .run();
    setShowMathInput(false);
    setMathDraft('');
  };

  const filteredReferences = references.filter((ref) => {
    if (!citationSearch.trim()) return true;
    const q = citationSearch.toLowerCase();
    return (
      ref.authors.toLowerCase().includes(q) ||
      ref.title.toLowerCase().includes(q) ||
      ref.year.toLowerCase().includes(q) ||
      (ref.subtitle && ref.subtitle.toLowerCase().includes(q)) ||
      (ref.journal && ref.journal.toLowerCase().includes(q))
    );
  });

  return (
    <CitationRenderContext.Provider value={contextValue}>
      <div className="relative w-full">
        {/* Barra Flutuante de Formatação Inline (aparece ao selecionar texto) */}
        {hasSelection && (
          <div
            onMouseDown={(e) => e.preventDefault()}
            className="absolute -top-9 left-0 z-30 flex items-center gap-0.5 bg-neutral-900 text-white rounded-lg shadow-lg px-1.5 py-1 text-xs animate-in fade-in duration-100"
          >
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1 rounded hover:bg-neutral-700 ${
                editor.isActive('bold') ? 'bg-emerald-600 text-white' : 'text-neutral-200'
              }`}
              title="Negrito (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1 rounded hover:bg-neutral-700 ${
                editor.isActive('italic') ? 'bg-emerald-600 text-white' : 'text-neutral-200'
              }`}
              title="Itálico (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1 rounded hover:bg-neutral-700 ${
                editor.isActive('underline') ? 'bg-emerald-600 text-white' : 'text-neutral-200'
              }`}
              title="Sublinhado (Ctrl+U)"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={`p-1 rounded hover:bg-neutral-700 ${
                editor.isActive('strike') ? 'bg-emerald-600 text-white' : 'text-neutral-200'
              }`}
              title="Tachado"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1 rounded hover:bg-neutral-700 ${
                editor.isActive('code') ? 'bg-emerald-600 text-white' : 'text-neutral-200'
              }`}
              title="Código Inline"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={openLinkPopover}
              className={`p-1 rounded hover:bg-neutral-700 ${
                editor.isActive('link') ? 'bg-emerald-600 text-white' : 'text-neutral-200'
              }`}
              title="Inserir ou editar Link (URL)"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={openMathPopover}
              className="p-1 rounded hover:bg-neutral-700 text-indigo-300"
              title="Converter em fórmula matemática inline ($...$)"
            >
              <Sigma className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-neutral-700 mx-0.5" />
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              className={`p-1 rounded hover:bg-neutral-700 ${
                editor.isActive('superscript') ? 'bg-emerald-600 text-white' : 'text-neutral-200'
              }`}
              title="Sobrescrito"
            >
              <SupIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              className={`p-1 rounded hover:bg-neutral-700 ${
                editor.isActive('subscript') ? 'bg-emerald-600 text-white' : 'text-neutral-200'
              }`}
              title="Subscrito"
            >
              <SubIcon className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-3.5 bg-neutral-700 mx-0.5" />
            <button
              type="button"
              onClick={() => setShowCitationPicker(true)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-700 text-emerald-300 font-medium"
              title="Inserir chamada de referência"
            >
              <Bookmark className="w-3 h-3" />
              <span>Citar (@)</span>
            </button>
          </div>
        )}

        {/* Popover de Hyperlink */}
        {showLinkInput && (
          <div className="absolute left-0 top-8 z-40 w-80 bg-white border border-neutral-200 rounded-xl shadow-xl p-2.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-neutral-500">
                Inserir Link Clicável
              </span>
              <button
                type="button"
                onClick={() => setShowLinkInput(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={linkUrlDraft}
                onChange={(e) => {
                  setLinkUrlDraft(e.target.value);
                  setLinkError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLink();
                  } else if (e.key === 'Escape') {
                    setShowLinkInput(false);
                  }
                }}
                autoFocus
                placeholder="https://exemplo.org"
                className="flex-1 min-w-0 px-2 py-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
              />
              <button
                type="button"
                onClick={applyLink}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold"
              >
                Aplicar
              </button>
              {editor.isActive('link') && (
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkInput(false);
                  }}
                  className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px]"
                >
                  Remover
                </button>
              )}
            </div>
            {linkError && <p className="text-[10px] text-red-600">{linkError}</p>}
          </div>
        )}

        {/* Popover de Matemática Inline */}
        {showMathInput && (
          <div className="absolute left-0 top-8 z-40 w-80 bg-white border border-neutral-200 rounded-xl shadow-xl p-2.5 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-indigo-700 flex items-center gap-1">
                <Sigma className="w-3 h-3" />
                Matemática Inline (Typst)
              </span>
              <button
                type="button"
                onClick={() => setShowMathInput(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={mathDraft}
                onChange={(e) => setMathDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyMathNode();
                  } else if (e.key === 'Escape') {
                    setShowMathInput(false);
                  }
                }}
                autoFocus
                placeholder="Ex: x^2 + sqrt(y) = alpha"
                className="flex-1 min-w-0 font-mono px-2 py-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded focus:outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={applyMathNode}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold"
              >
                Inserir
              </button>
            </div>
          </div>
        )}

        <div className="flex items-start gap-1.5 group/cite">
          <div className="flex-1 min-w-0">
            <EditorContent editor={editor} />
          </div>

          <div className="opacity-0 group-hover/cite:opacity-100 focus-within:opacity-100 shrink-0 flex items-center gap-1 transition-all select-none">
            <button
              type="button"
              onClick={openMathPopover}
              className="flex items-center px-1.5 py-0.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-indigo-50 hover:border-indigo-300 text-[11px] font-medium text-neutral-500 hover:text-indigo-700 transition-colors"
              title="Inserir expressão matemática inline no texto ($...$)"
              aria-label="Inserir matemática inline"
            >
              <Sigma className="w-3 h-3" />
            </button>

            {/* Botão rápido "+ Referência" que aparece discretamente à direita do parágrafo ao passar o mouse */}
            <button
              type="button"
              onClick={() => setShowCitationPicker((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-emerald-50 hover:border-emerald-300 text-[11px] font-medium text-neutral-500 hover:text-emerald-700 transition-colors"
              title="Chamar uma referência bibliográfica no final ou meio do texto (ou digite @)"
            >
              <Bookmark className="w-3 h-3 text-emerald-600" />
              <span>+ Referência</span>
            </button>
          </div>
        </div>

        {/* Seletor de Chamada de Referência (abre com @, pelo menu / ou pelo botão "+ Referência") */}
        {showCitationPicker && (
          <div className="absolute left-0 top-7 z-30 w-80 bg-white border border-neutral-200 rounded-xl shadow-xl py-2 text-xs">
            <div className="px-3 pb-1.5 text-[10px] font-bold uppercase text-neutral-400 flex items-center justify-between border-b border-neutral-100">
              <span className="flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-emerald-600" />
                Selecionar Referência
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCitationPicker(false);
                  setCitationSearch('');
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                Fechar
              </button>
            </div>

            {references.length === 0 ? (
              <div className="p-3 text-center text-neutral-500 space-y-2">
                <p className="text-[11px]">Nenhuma referência cadastrada neste projeto ainda.</p>
                {onOpenNewReferenceModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCitationPicker(false);
                      onOpenNewReferenceModal();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Referência (DOI/ISBN/.bib)</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Controles de Modo (Parentética / Narrativa) + Página Opcional */}
                <div className="px-2.5 py-1.5 border-b border-neutral-100 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setCiteModeDraft('parenthetical')}
                      className={`px-2 py-1 rounded text-[11px] font-medium border ${
                        citeModeDraft === 'parenthetical'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      Parentética
                    </button>
                    <button
                      type="button"
                      onClick={() => setCiteModeDraft('narrative')}
                      className={`px-2 py-1 rounded text-[11px] font-medium border ${
                        citeModeDraft === 'narrative'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      Narrativa
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={citationSearch}
                        onChange={(e) => setCitationSearch(e.target.value)}
                        placeholder="Buscar autor, título..."
                        autoFocus
                        className="w-full pl-6 pr-5 py-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                      />
                      {citationSearch && (
                        <button
                          type="button"
                          onClick={() => setCitationSearch('')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={citePageDraft}
                      onChange={(e) => setCitePageDraft(e.target.value)}
                      placeholder="p. (opc)"
                      title="Página citada (ex: 42 ou 10-12)"
                      className="w-20 px-2 py-1 text-[11px] bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100">
                  {filteredReferences.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-neutral-400">
                      Nenhuma referência encontrada para &ldquo;{citationSearch}&rdquo;.
                    </div>
                  ) : (
                    filteredReferences.map((ref) => {
                      const formattedCall = resolveCitationDisplay(ref, {
                        format: effectiveFormat,
                        mode: citeModeDraft,
                        page: citePageDraft.trim(),
                        refNumber: refIndexMap.get(ref.id) ?? 1,
                      }).label;
                      return (
                        <button
                          key={ref.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            insertReferenceCitation(ref);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-emerald-50/70 transition-colors flex flex-col gap-0.5 group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-emerald-700 group-hover:text-emerald-800 text-[11px]">
                              {formattedCall}
                            </span>
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {ref.year}
                            </span>
                          </div>
                          <div className="text-[11px] font-medium text-neutral-800 truncate">
                            {ref.title}
                          </div>
                          <div className="text-[10px] text-neutral-500 truncate">
                            {ref.authors}
                          </div>
                        </button>
                      );
                    })
                  )}

                  {onOpenNewReferenceModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCitationPicker(false);
                        onOpenNewReferenceModal();
                      }}
                      className="w-full px-3 py-2 text-center text-emerald-600 hover:bg-emerald-50 font-semibold text-[11px] flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar nova referência...</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </CitationRenderContext.Provider>
  );
};
