import type { Toast } from '@/types';

type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();

export const toastBus = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  show(message: string, type: Toast['type'] = 'info', duration = 3200): void {
    const toast: Toast = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, message, duration };
    listeners.forEach((fn) => fn(toast));
  },
  success(message: string): void {
    toastBus.show(message, 'success');
  },
  error(message: string): void {
    toastBus.show(message, 'error');
  },
};
