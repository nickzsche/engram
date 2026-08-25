'use client';

import { Extension } from '@tiptap/core';
import type { Editor, Range } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { createSuggestionRender, type MenuItem } from '@/components/editor/SuggestionMenu';

interface SlashCommandProps {
  editor: Editor;
  range: Range;
}

function insertTable(editor: Editor, range: Range) {
  editor
    .chain()
    .focus()
    .insertContentAt(range, {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [] }] },
            { type: 'tableHeader', content: [{ type: 'paragraph', content: [] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [] }] },
          ],
        },
        {
          type: 'tableRow',
          content: [
            { type: 'tableCell', content: [{ type: 'paragraph', content: [] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [] }] },
            { type: 'tableCell', content: [{ type: 'paragraph', content: [] }] },
          ],
        },
      ],
    })
    .run();
}

const SLASH_ITEMS: (MenuItem & { command: ({ editor, range }: SlashCommandProps) => void })[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    hint: 'Big section heading',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    hint: 'Medium section heading',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    hint: 'Small section heading',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'bulletList',
    label: 'Bullet list',
    hint: 'Simple bulleted list',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    label: 'Numbered list',
    hint: 'Ordered list',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'taskList',
    label: 'To-do list',
    hint: 'Track tasks with checkboxes',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: 'codeBlock',
    label: 'Code block',
    hint: 'Syntax-highlighted code',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: 'blockquote',
    label: 'Quote',
    hint: 'Capture a quotation',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: 'divider',
    label: 'Divider',
    hint: 'Visually split sections',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    id: 'table',
    label: 'Table',
    hint: '3×3 table',
    command: ({ editor, range }) => insertTable(editor, range),
  },
  {
    id: 'image',
    label: 'Image',
    hint: 'Embed from a URL',
    command: ({ editor, range }) => {
      const url = window.prompt('Image URL');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      } else {
        editor.chain().focus().deleteRange(range).run();
      }
    },
  },
];

/** Typing "/" opens the block menu. */
export const SlashMenu = Extension.create<SlashMenuOptions>({
  name: 'slashMenu',

  addOptions() {
    return {
      suggestion: undefined as unknown as Partial<SuggestionOptions<MenuItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<MenuItem>({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }) => {
          const q = query.toLowerCase();
          return SLASH_ITEMS.filter(
            (item) => item.label.toLowerCase().includes(q) || item.id.includes(q.replace(/\s/g, '')),
          ).slice(0, 10);
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        render: () => createSuggestionRender(),
      }),
    ];
  },
});

interface SlashMenuOptions {
  suggestion: Partial<SuggestionOptions<MenuItem>>;
}

export interface PageRefItem extends MenuItem {
  pageId: string;
}

export interface WikilinkMenuOptions {
  getPages?: () => { id: string; title: string; spaceName?: string }[];
}

/** Typing "[[" opens a live page-linker. */
export const WikilinkMenu = Extension.create<WikilinkMenuOptions>({
  name: 'wikilinkMenu',

  addOptions() {
    return {
      getPages: () => [],
    };
  },

  addProseMirrorPlugins() {
    const getPages = this.options.getPages ?? (() => []);
    return [
      Suggestion<PageRefItem>({
        editor: this.editor,
        char: '[[',
        allowSpaces: true,
        allowedPrefixes: null,
        startOfLine: false,
        items: ({ query }) => {
          const q = query.toLowerCase().trim();
          return getPages()
            .filter((p) => !q || p.title.toLowerCase().includes(q))
            .slice(0, 8)
            .map((p) => ({ id: p.id, label: p.title, hint: p.spaceName, pageId: p.id }));
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'text',
                text: props.label,
                marks: [{ type: 'wikilink', attrs: { pageId: props.pageId, title: props.label } }],
              },
              { type: 'text', text: ' ' },
            ])
            .run();
        },
        render: () => createSuggestionRender(),
      }),
    ];
  },
});
