import { useToastStore } from '../store/toastStore';

export function showToast(message: string, kind: 'success' | 'error' = 'success'): void {
  useToastStore.getState().show(message, kind);
}
