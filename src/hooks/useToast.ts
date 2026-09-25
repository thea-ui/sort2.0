import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: ReactNode;
}

/**
 * Toast wrapper API (SMART master handoff Part 4 §5). Every piece of feedback
 * goes through this surface — never the underlying store directly. Success and
 * info dismiss after 4s; errors and warnings stay for 6s so they can be read
 * (never faster than the reference defaults).
 */
const DEFAULT_DURATION: Record<ToastKind, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
};

let toastItems: ToastItem[] = [];
let toastListeners: Array<(items: ToastItem[]) => void> = [];
const toastTimers = new Map<number, ReturnType<typeof setTimeout>>();
let nextToastId = 1;

function emitToastChange() {
  for (const listener of toastListeners) listener(toastItems);
}

function clearTimer(id: number) {
  const timer = toastTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    toastTimers.delete(id);
  }
}

function removeToast(id: number) {
  clearTimer(id);
  toastItems = toastItems.filter((item) => item.id !== id);
  emitToastChange();
}

function scheduleDismiss(id: number, duration: number) {
  clearTimer(id);
  if (duration <= 0) return;
  toastTimers.set(
    id,
    setTimeout(() => removeToast(id), duration),
  );
}

function pushToast(kind: ToastKind, message: ReactNode, duration = DEFAULT_DURATION[kind]): number {
  const id = nextToastId++;
  toastItems = [...toastItems, { id, kind, message }];
  emitToastChange();
  scheduleDismiss(id, duration);
  return id;
}

function updateToast(id: number, kind: ToastKind, message: ReactNode, duration = DEFAULT_DURATION[kind]) {
  toastItems = toastItems.map((item) => (item.id === id ? { ...item, kind, message } : item));
  emitToastChange();
  scheduleDismiss(id, duration);
}

type ToastMessage = ReactNode;
type ToastMessageFactory<T> = ToastMessage | ((value: T) => ToastMessage);

export const toast = {
  success: (message: ToastMessage, duration?: number) => pushToast('success', message, duration),
  error: (message: ToastMessage, duration?: number) => pushToast('error', message, duration),
  warning: (message: ToastMessage, duration?: number) => pushToast('warning', message, duration),
  info: (message: ToastMessage, duration?: number) => pushToast('info', message, duration),
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: ToastMessage;
      success: ToastMessageFactory<T>;
      error: ToastMessageFactory<unknown>;
    },
  ): Promise<T> => {
    const id = pushToast('info', options.loading, 0);
    return promise.then(
      (data) => {
        updateToast(id, 'success', typeof options.success === 'function' ? options.success(data) : options.success);
        return data;
      },
      (error: unknown) => {
        updateToast(id, 'error', typeof options.error === 'function' ? options.error(error) : options.error);
        throw error;
      },
    );
  },
  dismiss: (id?: number) => {
    if (id === undefined) {
      toastItems = [];
      for (const timer of toastTimers.values()) clearTimeout(timer);
      toastTimers.clear();
      emitToastChange();
      return;
    }
    removeToast(id);
  },
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
