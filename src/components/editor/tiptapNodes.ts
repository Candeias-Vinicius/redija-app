import { Mark, Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CitationNodeView } from './CitationNodeView';
import { InlineMathNodeView } from './InlineMathNodeView';

export const CitationNode = Node.create({
  name: 'citationNode',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      citeId: { default: '' },
      citePage: { default: '' },
      citeMode: { default: 'parenthetical' },
      fallbackLabel: { default: '' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'cite[data-cite-id]',
        getAttrs: (el) => ({
          citeId: el.getAttribute('data-cite-id') || '',
          citePage: el.getAttribute('data-cite-page') || '',
          citeMode:
            el.getAttribute('data-cite-mode') === 'narrative' ? 'narrative' : 'parenthetical',
          fallbackLabel: el.textContent || '',
        }),
      },
      {
        tag: 'span[data-cite-id]',
        getAttrs: (el) => ({
          citeId: el.getAttribute('data-cite-id') || '',
          citePage: el.getAttribute('data-cite-page') || '',
          citeMode:
            el.getAttribute('data-cite-mode') === 'narrative' ? 'narrative' : 'parenthetical',
          fallbackLabel: el.textContent || '',
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const attrs: Record<string, string> = {
      'data-cite-id': String(node.attrs.citeId || ''),
      'data-cite-mode': node.attrs.citeMode === 'narrative' ? 'narrative' : 'parenthetical',
    };
    const page = String(node.attrs.citePage || '').trim();
    if (page) {
      attrs['data-cite-page'] = page;
    }
    const fallback = String(node.attrs.fallbackLabel || '').trim();
    return ['cite', attrs, fallback || 'Ref'];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CitationNodeView);
  },
});

export const InlineMathNode = Node.create({
  name: 'inlineMathNode',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      math: { default: 'x^2' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-inline-math]',
        getAttrs: (el) => ({
          math: el.getAttribute('data-math') || el.textContent || 'x^2',
        }),
      },
    ];
  },

  renderHTML({ node }) {
    const expr = String(node.attrs.math || 'x^2').trim();
    return [
      'span',
      {
        'data-inline-math': 'true',
        'data-math': expr,
      },
      expr,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathNodeView);
  },
});

export const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs) => (attrs.commentId ? { 'data-comment-id': attrs.commentId } : {}),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'mark[data-comment-id]' },
      { tag: 'span[data-comment-id]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(HTMLAttributes, {
        class:
          'redija-comment-highlight bg-amber-100 dark:bg-amber-950/60 border-b-2 border-amber-500 cursor-pointer rounded-xs px-0.5 transition-colors hover:bg-amber-200 dark:hover:bg-amber-900/80',
      }),
      0,
    ];
  },
});
