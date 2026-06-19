/**
 * Toast notification store (Zustand).
 *
 * Holds the active toast queue and exposes `addToast`/`removeToast`; each toast
 * auto-expires after its `duration` (default 5s). The standalone `toast(...)`
 * helper lets non-React code (e.g. event handlers) enqueue a notification.
 */

import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-remove after duration
    const duration = toast.duration ?? 5000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export function toast({
  title,
  description,
  type = 'info',
  duration,
}: Omit<ToastMessage, 'id' | 'type'> & { type?: ToastType }) {
  useToastStore.getState().addToast({ title, description, type, duration });
}
