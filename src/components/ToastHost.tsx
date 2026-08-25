'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toastBus } from '@/lib/toast';
import type { Toast } from '@/types';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastBus.subscribe((toast) => {
      setToasts((cur) => [...cur.filter((t) => t.id !== toast.id), toast]);
      setTimeout(() => {
        setToasts((cur) => cur.filter((t) => t.id !== toast.id));
      }, toast.duration ?? 3200);
    });
    return unsubscribe;
  }, []);

  return (
    <AnimatePresence>
      {toasts.slice(-3).map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <motion.div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <Icon
              size={17}
              className={
                toast.type === 'success' ? 'text-green-400' : toast.type === 'error' ? 'text-red-400' : 'text-accent-cyan'
              }
            />
            {toast.message}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
