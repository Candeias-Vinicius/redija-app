import React, { useEffect, useState } from 'react';
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
  Superscript as SupIcon,
  Subscript as SubIcon,
  Bookmark,
  Plus,
} from 'lucide-react';
import { stripHtmlTags } from '@/core/transpiler/escape';
import { AcademicReference } from '@/types/document';
import { formatShortCitation, formatNarrativeCitation } from '@/core/transpiler/abntLinter';

interface RichTextInputProps {
  value: string;
  onChange: (html: string) => void;
  references?: AcademicReference[];
  citationStyle?: 'uppercase' | 'titlecase';
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
  citationStyle = 'uppercase',
  placeholder = 'Digite seu texto, "/" para comandos ou "@" para citar referência...',
  className = '',
  autoFocus = false,
  openCitationTrigger = 0,
  onOpenNewReferenceModal,
  onEnter,
  onBackspaceEmpty,
  onSlashCommand,
}) => {
  const [hasSelection, setHasSelection] = useState(false);
  const [showCitationPicker, setShowCitationPicker] = useState(false);
  const [citationPage, setCitationPage] = useState('');
  const [lastSeenTrigger, setLastSeenTrigger] = useState(openCitationTrigger);

  // Permite abrir o seletor de referência quando o usuário escolhe "Chamar Referência" no menu `/`
  if (openCitationTrigger !== lastSeenTrigger) {
    setLastSeenTrigger(openCitationTrigger);
    if (openCitationTrigger > 0) {
      setShowCitationPicker(true);
    }
  }

  // Extensão para interceptar Enter, Backspace em vazio e '/' no início
  const KeyboardShortcuts = Extension.create({
    name: 'redijaShortcuts',
    addKeyboardShortcuts() {
      return {
        Enter: () => {
          if (onEnter) {
            onEnter();
            return true;
          }
          return false;
        },
        Backspace: ({ editor: ed }) => {
          const plain = stripHtmlTags(ed.getHTML());
          if (!plain && onBackspaceEmpty) {
            onBackspaceEmpty();
            return true;
          }
          return false;
        },
        Escape: () => {
          if (showCitationPicker) {
            setShowCitationPicker(false);
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
      }),
      Underline,
      Superscript,
      Subscript,
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
      onChange(html === '<p></p>' ? '' : html);
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

  if (!editor) return null;

  const insertReferenceText = (textToInsert: string) => {
    editor.chain().focus().insertContent(` ${textToInsert} `).run();
    setShowCitationPicker(false);
    setCitationPage('');
  };

  return (
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
            title="Inserir chamada de referência ABNT"
          >
            <Bookmark className="w-3 h-3" />
            <span>Citar (@)</span>
          </button>
        </div>
      )}

      <div className="flex items-start gap-1.5 group/cite">
        <div className="flex-1 min-w-0">
          <EditorContent editor={editor} />
        </div>

        {/* Botão rápido "+ Citar" que aparece discretamente à direita do parágrafo ao passar o mouse */}
        <button
          type="button"
          onClick={() => setShowCitationPicker((prev) => !prev)}
          className="opacity-0 group-hover/cite:opacity-100 focus:opacity-100 shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-emerald-50 hover:border-emerald-300 text-[11px] font-medium text-neutral-500 hover:text-emerald-700 transition-all select-none"
          title="Chamar uma referência bibliográfica no final ou meio do texto (ou digite @)"
        >
          <Bookmark className="w-3 h-3 text-emerald-600" />
          <span>+ Referência</span>
        </button>
      </div>

      {/* Seletor de Chamada de Referência (abre com @, pelo menu / ou pelo botão "+ Referência") */}
      {showCitationPicker && (
        <div className="absolute left-0 top-7 z-30 w-80 bg-white border border-neutral-200 rounded-xl shadow-xl py-2 text-xs">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase text-neutral-400 flex items-center justify-between border-b border-neutral-100">
            <span className="flex items-center gap-1">
              <Bookmark className="w-3 h-3 text-emerald-600" />
              Chamar Referência no Texto (NBR 10520)
            </span>
            <button
              type="button"
              onClick={() => setShowCitationPicker(false)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              Fechar
            </button>
          </div>

          {/* Campo opcional de página */}
          <div className="px-3 py-1.5 bg-neutral-50 border-b border-neutral-100 flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-500">Página (opcional):</span>
            <input
              type="text"
              value={citationPage}
              onChange={(e) => setCitationPage(e.target.value)}
              placeholder="Ex: 42"
              className="w-24 px-2 py-0.5 text-[11px] bg-white border border-neutral-200 rounded focus:outline-none focus:border-emerald-600"
            />
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
                  <span>Cadastrar Referência (DOI/ISBN)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100">
              {references.map((ref) => {
                const parenthetical = formatShortCitation(ref, citationStyle, citationPage);
                const narrative = formatNarrativeCitation(ref, citationPage);
                return (
                  <div
                    key={ref.id}
                    className="px-3 py-2 hover:bg-neutral-50 transition-colors space-y-1.5"
                  >
                    <div className="text-[11px] font-medium text-neutral-800 truncate">
                      {ref.title}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertReferenceText(parenthetical);
                        }}
                        className="flex-1 px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] text-center border border-emerald-200 transition-colors"
                        title="Inserir chamada entre parênteses no final da frase"
                      >
                        {parenthetical}
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertReferenceText(narrative);
                        }}
                        className="flex-1 px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-[11px] text-center border border-neutral-200 transition-colors"
                        title="Inserir chamada narrativa com o nome do autor fora dos parênteses (Ex: Segundo Silva (2023)...)"
                      >
                        {narrative}
                      </button>
                    </div>
                  </div>
                );
              })}

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
          )}
        </div>
      )}
    </div>
  );
};
