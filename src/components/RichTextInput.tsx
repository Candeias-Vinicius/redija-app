import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, Superscript as SupIcon, Subscript as SubIcon, Bookmark } from 'lucide-react';
import { stripHtmlTags } from '@/core/transpiler/escape';
import { AcademicReference } from '@/types/document';
import { formatShortCitation } from '@/core/transpiler/abntLinter';

interface RichTextInputProps {
  value: string;
  onChange: (html: string) => void;
  references?: AcademicReference[];
  citationStyle?: 'uppercase' | 'titlecase';
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onBackspaceEmpty?: () => void;
  onSlashCommand?: () => void;
}

export const RichTextInput: React.FC<RichTextInputProps> = ({
  value,
  onChange,
  references = [],
  citationStyle = 'uppercase',
  placeholder = 'Digite seu texto ou "/" para comandos...',
  className = '',
  autoFocus = false,
  onEnter,
  onBackspaceEmpty,
  onSlashCommand,
}) => {
  const [hasSelection, setHasSelection] = useState(false);
  const [showCitationPicker, setShowCitationPicker] = useState(false);

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
        Backspace: ({ editor }) => {
          const plain = stripHtmlTags(editor.getHTML());
          if (!plain && onBackspaceEmpty) {
            onBackspaceEmpty();
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
        if (text === '@' && references.length > 0) {
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
        </div>
      )}

      <EditorContent editor={editor} />

      {/* Seletor rápido de citação ao digitar @ */}
      {showCitationPicker && references.length > 0 && (
        <div className="absolute left-0 top-7 z-30 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 text-xs">
          <div className="px-3 py-1 text-[10px] font-bold uppercase text-neutral-400 flex items-center justify-between border-b border-neutral-100">
            <span className="flex items-center gap-1">
              <Bookmark className="w-3 h-3 text-emerald-600" />
              Inserir Citação ABNT (@)
            </span>
            <button
              type="button"
              onClick={() => setShowCitationPicker(false)}
              className="text-neutral-400 hover:text-neutral-600"
            >
              Esc
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-neutral-50">
            {references.map((ref) => {
              const cite = formatShortCitation(ref, citationStyle);
              return (
                <button
                  key={ref.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().insertContent(` ${cite} `).run();
                    setShowCitationPicker(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-emerald-50/70 transition-colors"
                >
                  <div className="font-semibold text-emerald-800">{cite}</div>
                  <div className="text-[11px] text-neutral-600 truncate">{ref.title}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
