import type { JSONContent } from '@tiptap/react';

type Inline = JSONContent | string;

/** Coerce a string into a TipTap text node; pass inline nodes through untouched. */
const inline = (node: Inline): JSONContent =>
  typeof node === 'string' ? { type: 'text', text: node } : node;

/** Tiny helpers for building TipTap JSON documents concisely. */
export const t = {
  doc: (...content: JSONContent[]): JSONContent => ({ type: 'doc', content }),
  p: (text?: string): JSONContent => ({
    type: 'paragraph',
    content: text ? [{ type: 'text', text }] : undefined,
  }),
  /** A paragraph mixing plain strings and inline nodes (e.g. wikilinks). */
  p2: (...parts: Inline[]): JSONContent => ({
    type: 'paragraph',
    content: parts.map(inline),
  }),
  /** Inline `[[title]]` link mark that backlinks & the graph can resolve. */
  wikilink: (text: string, pageId: string): JSONContent => ({
    type: 'text',
    text,
    marks: [{ type: 'wikilink', attrs: { pageId, title: text } }],
  }),
  h: (level: 1 | 2 | 3, text: string): JSONContent => ({
    type: 'heading',
    attrs: { level },
    content: [{ type: 'text', text }],
  }),
  bullet: (items: string[]): JSONContent => ({
    type: 'bulletList',
    content: items.map(
      (i): JSONContent => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: i }] }],
      }),
    ),
  }),
  tasks: (items: { done?: boolean; text: string }[]): JSONContent => ({
    type: 'taskList',
    content: items.map(
      (i): JSONContent => ({
        type: 'taskItem',
        attrs: { checked: !!i.done },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: i.text }] }],
      }),
    ),
  }),
  quote: (text: string): JSONContent => ({
    type: 'blockquote',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  }),
  code: (language: string, code: string): JSONContent => ({
    type: 'codeBlock',
    attrs: { language },
    content: [{ type: 'text', text: code }],
  }),
  divider: (): JSONContent => ({ type: 'horizontalRule' }),
  table: (rows: string[][]): JSONContent => ({
    type: 'table',
    content: rows.map(
      (cells, ri): JSONContent => ({
        type: 'tableRow',
        content: cells.map(
          (c): JSONContent => ({
            type: ri === 0 ? 'tableHeader' : 'tableCell',
            content: [{ type: 'paragraph', content: c ? [{ type: 'text', text: c }] : undefined }],
          }),
        ),
      }),
    ),
  }),
};

export interface BuiltInTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  color: string;
  content: JSONContent;
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: 'tpl-daily-journal',
    name: 'Daily Journal',
    category: 'Journaling',
    icon: 'notebook-pen',
    color: '#a855f7',
    content: t.doc(
      t.h(2, '{{date}}'),
      t.h(3, 'Three good things'),
      t.tasks([
        { text: '…' },
        { text: '…' },
        { text: '…' },
      ]),
      t.h(3, 'What happened today'),
      t.p(''),
      t.quote('One line about how today felt.'),
    ),
  },
  {
    id: 'tpl-meeting-notes',
    name: 'Meeting Notes',
    category: 'Work',
    icon: 'users',
    color: '#22d3ee',
    content: t.doc(
      t.h(2, 'Meeting — {{date}}'),
      t.table([
        ['Attendees', ''],
        ['Agenda', ''],
        ['Outcome', ''],
      ]),
      t.h(3, 'Notes'),
      t.bullet(['']),
      t.h(3, 'Action items'),
      t.tasks([{ text: 'Owner — task' }]),
    ),
  },
  {
    id: 'tpl-project-brief',
    name: 'Project Brief',
    category: 'Work',
    icon: 'briefcase',
    color: '#f59e0b',
    content: t.doc(
      t.h(2, 'Project brief'),
      t.p('One paragraph: what is this project and why does it matter?'),
      t.h(3, 'Goals'),
      t.tasks([{ text: 'Goal one' }, { text: 'Goal two' }]),
      t.h(3, 'Milestones'),
      t.table([
        ['Milestone', 'Target date', 'Status'],
        ['', '', ''],
        ['', '', ''],
      ]),
      t.h(3, 'Open questions'),
      t.bullet(['']),
    ),
  },
  {
    id: 'tpl-book-notes',
    name: 'Book Notes',
    category: 'Reading',
    icon: 'book-open',
    color: '#34d399',
    content: t.doc(
      t.h(2, 'Book title'),
      t.p('By — finished {{date}} · ★★★★☆'),
      t.h(3, 'Big ideas'),
      t.bullet(['']),
      t.h(3, 'Passages worth keeping'),
      t.quote('Paste memorable passages here.'),
      t.h(3, 'How I will apply this'),
      t.tasks([{ text: '' }]),
    ),
  },
  {
    id: 'tpl-weekly-review',
    name: 'Weekly Review',
    category: 'Productivity',
    icon: 'rotate-ccw',
    color: '#818cf8',
    content: t.doc(
      t.h(2, 'Week of {{date}}'),
      t.h(3, 'Wins'),
      t.bullet(['']),
      t.h(3, 'Friction'),
      t.bullet(['']),
      t.h(3, 'Next week'),
      t.tasks([{ text: '' }, { text: '' }, { text: '' }]),
      t.divider(),
      t.p('Keep it honest, short, and forward-looking.'),
    ),
  },
];
