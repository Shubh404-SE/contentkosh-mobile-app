import { create } from 'zustand';

type ToastKind = 'success' | 'error';

type ToastState = {
  message: string | null;
  kind: ToastKind;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: 'success',
  show: (message, kind = 'success') => set({ message, kind }),
  hide: () => set({ message: null }),
}));
