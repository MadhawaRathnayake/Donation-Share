import { createContext } from 'react';

export type ToastTone = 'success' | 'error' | 'info';
export interface ToastMessage { id: string; title: string; message?: string; tone: ToastTone }
export interface ToastContextValue { notify: (toast: Omit<ToastMessage, 'id'>) => void }

export const ToastContext = createContext<ToastContextValue | null>(null);
