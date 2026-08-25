import { clsx, type ClassValue } from 'clsx';
import type { JSONContent } from '@tiptap/react';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

let idCounter = 0;
export function uid(prefix = ''): string {
  idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rand}${idCounter.toString(36)}`;
}

/** Extract plain text from a TipTap JSON doc. */
export function extractText(node: JSONContent | undefined | null): string {
  if (!node) return '';
  let text = '';
  if (node.type === 'text' && node.text) text += node.text;
  const children = node.content;
  if (Array.isArray(children)) {
    for (const child of children) {
      text += extractText(child as JSONContent);
      if ((child as JSONContent).type === 'paragraph' || (child as JSONContent).type?.startsWith('heading')) {
        text += '\n';
      }
    }
  }
  return text;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countWordsInDoc(doc: JSONContent | string | null): number {
  if (!doc) return 0;
  let json: JSONContent | null = null;
  if (typeof doc === 'string') {
    try {
      json = JSON.parse(doc) as JSONContent;
    } catch {
      return wordCount(doc);
    }
  } else {
    json = doc;
  }
  return wordCount(extractText(json));
}

export function readingTime(words: number): number {
  // ~220 wpm
  return Math.max(1, Math.round(words / 220));
}

/** Collect wikilink targets {pageId,title} from a TipTap doc. */
export function collectWikilinks(
  node: JSONContent | string | null,
): { pageId: string; title: string }[] {
  if (!node) return [];
  let root: JSONContent | null = null;
  if (typeof node === 'string') {
    try {
      root = JSON.parse(node) as JSONContent;
    } catch {
      return [];
    }
  } else {
    root = node;
  }
  const out: { pageId: string; title: string }[] = [];
  const walk = (n: JSONContent) => {
    if (Array.isArray(n.marks)) {
      for (const mark of n.marks) {
        if (mark.type === 'wikilink' && mark.attrs) {
          const pageId = String(mark.attrs.pageId ?? '');
          const title = String(mark.attrs.title ?? '');
          if (pageId) out.push({ pageId, title });
        }
      }
    }
    if (Array.isArray(n.content)) n.content.forEach((c) => walk(c as JSONContent));
  };
  walk(root);
  return out;
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  const wrapped = (...args: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => {
    if (t) clearTimeout(t);
    t = null;
  };
  return wrapped;
}
