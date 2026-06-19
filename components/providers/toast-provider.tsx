'use client';

/**
 * Toast viewport — renders the live toast queue from the Zustand toast store in
 * an `aria-live="assertive"` region (so notifications are announced), with
 * type-based styling and a dismiss button. Entrance/exit motion respects
 * `prefers-reduced-motion`.
 */

import { useToastStore } from '@/stores/toast-store';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export function ToastProvider() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full p-4 pointer-events-none md:max-w-sm"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout={!reduceMotion}
            initial={reduceMotion ? false : { opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
            }
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg glass ${
              toast.type === 'success'
                ? 'border-emerald-200/50 bg-emerald-50/90 text-emerald-950 dark:bg-emerald-950/90 dark:border-emerald-900/50'
                : toast.type === 'error'
                  ? 'border-red-200/50 bg-red-50/90 text-red-950 dark:bg-red-950/90 dark:border-red-900/50'
                  : 'border-blue-200/50 bg-blue-50/90 text-blue-950 dark:bg-blue-950/90 dark:border-blue-900/50'
            }`}
          >
            {/* Status Icons */}
            <span className="mt-0.5 flex-shrink-0">
              {toast.type === 'success' && (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              )}
              {toast.type === 'info' && (
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </span>

            {/* Content */}
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-semibold tracking-tight leading-none">{toast.title}</h4>
              {toast.description && (
                <p className="text-xs opacity-90 leading-normal">{toast.description}</p>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 rounded-md p-1.5 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label={`Close ${toast.title} notification`}
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
