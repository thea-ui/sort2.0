import { useEffect, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const TOAST_DURATION_MS = 4000;

let toastItems: ToastItem[] = [];
let toastListeners: Array<(items: ToastItem[]) => void> = [];
let nextToastId = 1;

function emitToastChange() {
  for (const listener of toastListeners) listener(toastItems);
}

function pushToast(kind: ToastKind, message: string, duration = TOAST_DURATION_MS) {
  const id = nextToastId++;
  toastItems = [...toastItems, { id, kind, message }];
  emitToastChange();
  setTimeout(() => {
    toastItems = toastItems.filter((item) => item.id !== id);
    emitToastChange();
  }, duration);
}

/**
 * Global toast API (SMART/Sonner-style surface, no dependency):
 * `toast.success('Saved')`, `toast.error('Failed')`, `toast.info('Heads up')`.
 * Render `<ToastViewport />` once near the app root.
 */
export const toast = {
  success: (message: string, duration?: number) => pushToast('success', message, duration),
  error: (message: string, duration?: number) => pushToast('error', message, duration),
  info: (message: string, duration?: number) => pushToast('info', message, duration),
};

export function useToast() {
  return toast;
}

/** Subscription used by the viewport component. */
export function useToastItems(): ToastItem[] {
  const [items, setItems] = useState<ToastItem[]>(toastItems);

  useEffect(() => {
    toastListeners.push(setItems);
    setItems(toastItems);
    return () => {
      toastListeners = toastListeners.filter((listener) => listener !== setItems);
    };
  }, []);

  return items;
}
