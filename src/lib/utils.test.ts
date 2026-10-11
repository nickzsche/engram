import { describe, expect, test } from 'bun:test';
import type { JSONContent } from '@tiptap/react';
import {
  collectWikilinks,
  countWordsInDoc,
  dayKey,
  extractText,
  formatDate,
  readingTime,
  uid,
  wordCount,
} from '@/lib/utils';

const text = (value: string): JSONContent => ({ type: 'text', text: value });

describe('extractText', () => {
  test('returns empty string for null/undefined', () => {
    expect(extractText(null)).toBe('');
    expect(extractText(undefined)).toBe('');
  });

  test('joins nested text and separates block nodes with newlines', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [text('Title')] },
        { type: 'paragraph', content: [text('one '), text('two')] },
      ],
    };
    expect(extractText(doc)).toBe('Title\none two\n');
  });
});

describe('wordCount', () => {
  test('counts whitespace-separated tokens', () => {
    expect(wordCount('one two three')).toBe(3);
    expect(wordCount('  a   b  ')).toBe(2);
  });

  test('empty and whitespace-only are zero', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('   \n\t ')).toBe(0);
  });
});

describe('countWordsInDoc', () => {
  test('counts words in a TipTap JSON string', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [text('alpha beta')] }],
    });
    expect(countWordsInDoc(json)).toBe(2);
  });

  test('falls back to raw word count when the string is not JSON', () => {
    expect(countWordsInDoc('just some plain text')).toBe(4);
  });

  test('handles null', () => {
    expect(countWordsInDoc(null)).toBe(0);
  });
});

describe('collectWikilinks', () => {
  test('collects wikilink marks from nested nodes', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'see ', marks: [{ type: 'bold' }] },
            {
              type: 'text',
              text: 'Note',
              marks: [{ type: 'wikilink', attrs: { pageId: 'p1', title: 'Note' } }],
            },
          ],
        },
      ],
    };
    expect(collectWikilinks(doc)).toEqual([{ pageId: 'p1', title: 'Note' }]);
  });

  test('accepts a JSON string and ignores invalid JSON', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'x', marks: [{ type: 'wikilink', attrs: { pageId: 'p2', title: 'X' } }] },
          ],
        },
      ],
    });
    expect(collectWikilinks(json)).toEqual([{ pageId: 'p2', title: 'X' }]);
    expect(collectWikilinks('{not json')).toEqual([]);
  });

  test('skips marks without a pageId', () => {
    const doc: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x', marks: [{ type: 'wikilink', attrs: { title: 'NoId' } }] }],
        },
      ],
    };
    expect(collectWikilinks(doc)).toEqual([]);
  });
});

describe('readingTime', () => {
  test('is at least one minute', () => {
    expect(readingTime(0)).toBe(1);
    expect(readingTime(10)).toBe(1);
  });

  test('rounds at ~220 wpm', () => {
    expect(readingTime(440)).toBe(2);
    expect(readingTime(221)).toBe(1);
  });
});

describe('dayKey', () => {
  test('formats a local calendar date as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 0, 5, 12).getTime())).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31, 23).getTime())).toBe('2026-12-31');
  });
});

describe('formatDate', () => {
  test('reports very recent timestamps as just now', () => {
    expect(formatDate(Date.now() - 5_000)).toBe('just now');
  });

  test('reports minutes and yesterday', () => {
    expect(formatDate(Date.now() - 5 * 60_000)).toBe('5m ago');
    expect(formatDate(Date.now() - 25 * 60 * 60_000)).toBe('yesterday');
  });
});

describe('uid', () => {
  test('produces unique, prefixed ids', () => {
    const a = uid('p-');
    const b = uid('p-');
    expect(a.startsWith('p-')).toBe(true);
    expect(a).not.toBe(b);
  });
});
