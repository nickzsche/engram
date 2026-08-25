import { Mark, mergeAttributes, markInputRule } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikilink: {
      /** Set a wikilink mark on the selection */
      setWikilink: (attrs: { pageId?: string | null; title: string }) => ReturnType;
      /** Remove wikilink mark from selection */
      unsetWikilink: () => ReturnType;
    };
  }
}

/**
 * Wikilink mark — renders `[[Page Title]]` links that navigate between pages.
 * Stores the target pageId when known, otherwise resolves by title at click time.
 */
export const Wikilink = Mark.create({
  name: 'wikilink',
  inclusive: false,

  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-page-id'),
        renderHTML: (attributes) => ({
          'data-page-id': attributes.pageId ?? undefined,
        }),
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') ?? '',
        renderHTML: (attributes) => ({ 'data-title': attributes.title }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-wikilink]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-wikilink': 'true',
        class: 'wikilink',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setWikilink:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetWikilink:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },

  addInputRules() {
    return [
      // Typing [[Title]] converts to a wikilink mark (title-only; resolved on click)
      markInputRule({
        find: /\[\[([^\][\n]+)\]\]$/,
        type: this.type,
        getAttributes: (match) => ({ title: match[1]?.trim() ?? '', pageId: null }),
      }),
    ];
  },
});

// CSS applied globally (globals.css) styles .wikilink
