import type { JSONContent } from '@tiptap/react';
import type { Page, Space, WritingStats, HeatmapCell } from '@/types';
import { countWordsInDoc, dayKey } from '@/lib/utils';
import { differenceInCalendarDays } from 'date-fns';

const DAY = 24 * 60 * 60 * 1000;
const HEATMAP_DAYS = 26 * 7; // ~half year

function heatLevel(words: number): HeatmapCell['level'] {
  if (words <= 0) return 0;
  if (words < 50) return 1;
  if (words < 200) return 2;
  if (words < 600) return 3;
  return 4;
}

export function computeWritingStats(pages: Page[], spaces: Space[]): WritingStats {
  const live = pages.filter((p) => !p.isTrashed);
  let totalWords = 0;
  const wordsByDay = new Map<string, number>();
  const wordsBySpace = new Map<string, number>();
  let longestPage: WritingStats['longestPage'] = null;
  const now = Date.now();
  const todayKey = dayKey(now);

  for (const page of live) {
    const wc = countWordsInDoc(page.content);
    totalWords += wc;
    const key = dayKey(page.lastEditedAt);
    wordsByDay.set(key, (wordsByDay.get(key) ?? 0) + wc);
    wordsBySpace.set(page.spaceId, (wordsBySpace.get(page.spaceId) ?? 0) + wc);
    if (!longestPage || wc > longestPage.wordCount) {
      longestPage = { id: page.id, title: page.title || 'Untitled', wordCount: wc };
    }
  }

  const weekAgo = now - 7 * DAY;
  const weeklyWords = [...wordsByDay.entries()]
    .filter(([key]) => new Date(`${key}T12:00:00`).getTime() >= weekAgo)
    .reduce((sum, [, n]) => sum + n, 0);

  // Streaks over distinct edit days
  const days = [...wordsByDay.keys()].sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    if (prev !== null && differenceInCalendarDays(new Date(`${d}T12:00:00`), new Date(`${prev}T12:00:00`)) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }

  let currentStreak = 0;
  const cursor = new Date(now);
  for (;;) {
    const key = dayKey(cursor.getTime());
    if (wordsByDay.has(key)) {
      currentStreak += 1;
      cursor.setTime(cursor.getTime() - DAY);
    } else if (currentStreak === 0 && key === todayKey) {
      // today not written yet — grace, check yesterday
      cursor.setTime(cursor.getTime() - DAY);
    } else {
      break;
    }
    if (currentStreak > 3650) break; // safety
  }

  // Heatmap: last HEATMAP_DAYS days ending today
  const heatmapData: HeatmapCell[] = [];
  const start = now - (HEATMAP_DAYS - 1) * DAY;
  for (let ts = start; ts <= now; ts += DAY) {
    const key = dayKey(ts);
    const wc = wordsByDay.get(key) ?? 0;
    heatmapData.push({ date: key, wordCount: wc, level: heatLevel(wc) });
  }

  const topSpaces = spaces
    .map((space) => ({
      spaceId: space.id,
      name: space.name,
      color: space.color,
      count: wordsBySpace.get(space.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalWords,
    weeklyWords,
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastWriteDate: days.length ? days[days.length - 1] : null,
    heatmapData,
    topSpaces,
    longestPage,
  };
}
