import { useCallback, useSyncExternalStore } from 'react';
import type { User } from '../api/types';

const STORAGE_KEY = 'lab_user';

let cachedRaw: string | null = null;
let cachedUser: User | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedUser;
  cachedRaw = raw;
  if (!raw) {
    cachedUser = null;
    return null;
  }
  try {
    cachedUser = JSON.parse(raw) as User;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
}

export function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useSession() {
  const user = useSyncExternalStore(subscribe, getStoredUser);
  const login = useCallback((u: User) => setStoredUser(u), []);
  const logout = useCallback(() => setStoredUser(null), []);
  return { user, login, logout };
}

// ---- 轻量 toast ----

export interface ToastItem {
  id: number;
  text: string;
}

let toastId = 0;
let toasts: ToastItem[] = [];
const toastListeners = new Set<() => void>();

function emitToast() {
  toastListeners.forEach((fn) => fn());
}

export function toast(text: string) {
  const item: ToastItem = { id: ++toastId, text };
  toasts = [...toasts, item];
  emitToast();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id);
    emitToast();
  }, 2600);
}

function subscribeToasts(fn: () => void) {
  toastListeners.add(fn);
  return () => toastListeners.delete(fn);
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribeToasts, () => toasts);
}
