import { describe, expect, test } from 'bun:test';
import { BUILT_IN_TEMPLATES, t } from '@/lib/templates';

describe('template helpers', () => {
  test('doc and p wrap content in a doc node', () => {
    expect(t.doc(t.p('hi'))).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
    });
  });

  test('h sets the heading level', () => {
    expect(t.h(2, 'Title')).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Title' }],
    });
  });

  test('wikilink attaches a resolvable wikilink mark', () => {
    expect(t.wikilink('Note', 'p1').marks).toEqual([
      { type: 'wikilink', attrs: { pageId: 'p1', title: 'Note' } },
    ]);
  });

  test('tasks honour the done flag', () => {
    const list = t.tasks([{ text: 'a', done: true }, { text: 'b' }]);
    const checked = (list.content ?? []).map((item) => item.attrs?.checked);
    expect(checked).toEqual([true, false]);
  });

  test('table marks the first row as headers', () => {
    const table = t.table([
      ['H1', 'H2'],
      ['c1', 'c2'],
    ]);
    const rowTypes = (table.content ?? []).map((row) => (row.content ?? []).map((cell) => cell.type));
    expect(rowTypes).toEqual([
      ['tableHeader', 'tableHeader'],
      ['tableCell', 'tableCell'],
    ]);
  });
});

describe('BUILT_IN_TEMPLATES', () => {
  test('every template is a doc with a unique id', () => {
    const ids = BUILT_IN_TEMPLATES.map((tpl) => tpl.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BUILT_IN_TEMPLATES.length).toBeGreaterThan(0);
    for (const tpl of BUILT_IN_TEMPLATES) {
      expect(tpl.content.type).toBe('doc');
      expect(Array.isArray(tpl.content.content)).toBe(true);
    }
  });
});
