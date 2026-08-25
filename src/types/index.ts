export interface Space {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Page {
  id: string;
  spaceId: string;
  parentId: string | null;
  title: string;
  content: string; // TipTap JSON
  order: number;
  isFavorite: boolean;
  isTrashed: boolean;
  tagIds?: string[];
  createdAt: number;
  updatedAt: number;
  lastEditedAt: number;
}

// App views
export type ViewType =
  | 'notes'
  | 'search'
  | 'graph'
  | 'stats'
  | 'templates'
  | 'trash'
  | 'settings';

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  content: string; // TipTap JSON
  icon: string;
  color: string;
  isBuiltIn: boolean;
  createdAt: number;
}

export interface Settings {
  id: string;
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface Block {
  id: string;
  pageId: string;
  type: string;
  content: unknown;
  order: number;
  createdAt: number;
  updatedAt: number;
}

// Wikilink for autocomplete
export interface WikilinkSuggestion {
  id: string;
  title: string;
  spaceId: string;
}

// Search result
export interface SearchResult {
  page: Page;
  space: Space;
  highlights: string[];
  score: number;
}

// Graph data
export interface GraphNode {
  id: string;
  title: string;
  spaceId: string;
  spaceColor: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isFavorite: boolean;
  linkCount: number;
}

export interface GraphLink {
  source: string;
  target: string;
  strength: number;
}

// Stats
export interface WritingStats {
  totalWords: number;
  weeklyWords: number;
  currentStreak: number;
  longestStreak: number;
  lastWriteDate: string | null;
  heatmapData: HeatmapCell[];
  topSpaces: { spaceId: string; name: string; count: number; color: string }[];
  longestPage: { id: string; title: string; wordCount: number } | null;
}

export interface HeatmapCell {
  date: string; // YYYY-MM-DD
  level: 0 | 1 | 2 | 3 | 4;
  wordCount: number;
}

// Command palette item
import type { ReactNode } from 'react';

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  section: string;
  keywords: string[];
}

// Toast
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

// Editor state
export interface EditorState {
  content: string;
  wordCount: number;
  readingTime: number;
  isDirty: boolean;
  lastSaved: number | null;
}