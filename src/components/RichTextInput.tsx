import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, Superscript as SupIcon, Subscript as SubIcon } from 'lucide-react';
import { stripHtmlTags } from '@/core/transpiler/escape';

interface RichTextInputProps {
  value: string;
  onChange: (html: string) => void;
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
  placeholder = 'Digite seu texto ou "/" para comandos...',
  className = '',
  autoFocus = false,
  onEnter,
  onBackspaceEmpty,
  onSlashCommand,
}) => {
  const [hasSelection, setHasSelection] = useState(false);

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
    </div>
  );
};
