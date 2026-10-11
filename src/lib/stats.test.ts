import { describe, expect, test } from 'bun:test';
import type { Page, Space } from '@/types';
import { computeWritingStats } from '@/lib/stats';
import { dayKey } from '@/lib/utils';

let seq = 0;

function editedAtDaysAgo(days: number): number {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.getTime();
}

function space(id: string): Space {
  return { id, name: `Space ${id}`, icon: 'folder', color: '#fff', order: 0, createdAt: 0, updatedAt: 0 };
}

function page(spaceId: string, words: number, editedDaysAgo: number, isTrashed = false): Page {
  seq += 1;
  const text = Array.from({ length: words }, (_, i) => `w${i}`).join(' ');
  const content = JSON.stringify({
    type: 'doc',
    content: [{ type: 'paragraph', content: words ? [{ type: 'text', text }] : undefined }],
  });
  return {
    id: `p${seq}`,
    spaceId,
    parentId: null,
    title: `Page ${seq}`,
    content,
    order: 0,
    isFavorite: false,
    isTrashed,
    createdAt: 0,
    updatedAt: 0,
    lastEditedAt: editedAtDaysAgo(editedDaysAgo),
  };
}

const spaces = [space('s1'), space('s2')];

describe('computeWritingStats', () => {
  test('totals words across live pages and picks the longest', () => {
    const pages = [
      page('s1', 3, 0),
      page('s1', 7, 0),
      page('s2', 1, 1),
      page('s2', 100, 0, true),
    ];
    const stats = computeWritingStats(pages, spaces);
    expect(stats.totalWords).toBe(11);
    expect(stats.longestPage?.wordCount).toBe(7);
  });

  test('computes current and longest streaks from distinct edit days', () => {
    const pages = [page('s1', 1, 0), page('s1', 1, 1), page('s1', 1, 2), page('s1', 1, 10)];
    const stats = computeWritingStats(pages, spaces);
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
  });

  test('grants a one-day grace when today has no edits yet', () => {
    const stats = computeWritingStats([page('s1', 5, 1)], spaces);
    expect(stats.currentStreak).toBe(1);
    expect(stats.weeklyWords).toBe(5);
  });

  test('heatmap ends today and grades today\u2019s volume', () => {
    const stats = computeWritingStats([page('s1', 1, 0)], spaces);
    const last = stats.heatmapData[stats.heatmapData.length - 1];
    expect(last.date).toBe(dayKey(Date.now()));
    expect(last.level).toBe(1);
    expect(stats.heatmapData.length).toBeGreaterThanOrEqual(180);
  });

  test('ranks spaces by word count and reports the last write date', () => {
    const pages = [page('s1', 2, 0), page('s2', 9, 0), page('s1', 1, 0)];
    const stats = computeWritingStats(pages, spaces);
    expect(stats.topSpaces[0]).toMatchObject({ spaceId: 's2', count: 9 });
    expect(stats.lastWriteDate).toBe(dayKey(Date.now()));
  });
});
