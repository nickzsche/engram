'use client';

import { useMemo } from 'react';
import { Flame, Trophy, Type, CalendarRange } from 'lucide-react';
import { computeWritingStats } from '@/lib/stats';
import type { Page, Space } from '@/types';

interface StatsViewProps {
  spaces: Space[];
  pages: Page[];
  onSelectPage: (id: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function StatsView({ spaces, pages, onSelectPage }: StatsViewProps) {
  const stats = useMemo(() => computeWritingStats(pages, spaces), [pages, spaces]);

  // Group heatmap cells into weeks (columns), Monday-first
  const weeks = useMemo(() => {
    const cols: typeof stats.heatmapData[] = [];
    let current: typeof stats.heatmapData = [];
    stats.heatmapData.forEach((cell, i) => {
      const d = new Date(`${cell.date}T12:00:00`);
      current.push(cell);
      if (d.getDay() === 0 || i === stats.heatmapData.length - 1) {
        cols.push(current);
        current = [];
      }
    });
    return cols;
  }, [stats.heatmapData]);

  const cards = [
    { label: 'Total words', value: stats.totalWords.toLocaleString(), icon: Type, tint: 'text-accent-violet' },
    { label: 'This week', value: stats.weeklyWords.toLocaleString(), icon: CalendarRange, tint: 'text-accent-cyan' },
    { label: 'Current streak', value: `${stats.currentStreak}d`, icon: Flame, tint: 'text-amber-400' },
    { label: 'Longest streak', value: `${stats.longestStreak}d`, icon: Trophy, tint: 'text-emerald-400' },
  ];

  const maxSpaceWords = Math.max(1, ...stats.topSpaces.map((s) => s.count));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-violet">Insights</p>
        <h1 className="font-display text-3xl font-bold">Writing stats</h1>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="glass-card !p-4">
            <card.icon size={18} className={`mb-2 ${card.tint}`} />
            <p className="font-display text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-ink-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <section className="glass-card mb-8 overflow-x-auto !p-5">
        <h2 className="mb-4 text-sm font-semibold text-ink-200">Activity — last 26 weeks</h2>
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, di) => {
                const cell = week[di];
                if (!cell) return <span key={di} className="heatmap-cell opacity-0" />;
                const title = `${cell.date}: ${cell.wordCount.toLocaleString()} words`;
                return <span key={di} className={`heatmap-cell heatmap-cell-level-${cell.level}`} title={title} />;
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
          Less
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={`heatmap-cell heatmap-cell-level-${level}`} />
          ))}
          More
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top spaces */}
        <section className="glass-card !p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-200">Words by space</h2>
          {stats.topSpaces.length === 0 && <p className="text-sm text-ink-500">No data yet.</p>}
          <div className="flex flex-col gap-3">
            {stats.topSpaces.map((space) => (
              <div key={space.spaceId}>
                <div className="mb-1 flex justify-between text-xs text-ink-400">
                  <span>{space.name}</span>
                  <span>{space.count.toLocaleString()}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(2, (space.count / maxSpaceWords) * 100)}%`,
                      background: `linear-gradient(90deg, ${space.color}, ${space.color}88)`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Longest page */}
        <section className="glass-card !p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-200">Deepest note</h2>
          {stats.longestPage ? (
            <button
              className="w-full rounded-xl border border-ink-700/50 bg-ink-800/40 p-4 text-left transition-colors hover:border-accent-violet/40"
              onClick={() => stats.longestPage && onSelectPage(stats.longestPage.id)}
            >
              <p className="truncate font-medium">{stats.longestPage.title}</p>
              <p className="mt-1 text-xs text-ink-500">
                {stats.longestPage.wordCount.toLocaleString()} words ·{' '}
                {Math.max(1, Math.round(stats.longestPage.wordCount / 220))} min read
              </p>
            </button>
          ) : (
            <p className="text-sm text-ink-500">Write something first.</p>
          )}
          {stats.lastWriteDate && (
            <p className="mt-4 text-xs text-ink-500">Last entry: {stats.lastWriteDate}</p>
          )}
        </section>
      </div>
    </div>
  );
}
