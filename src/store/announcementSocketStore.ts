import { create } from 'zustand';

export type AnnouncementSocketUiStatus =
  | 'idle'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'offline';

type State = {
  status: AnnouncementSocketUiStatus;
  lastErrorMessage: string | null;
  setStatus: (status: AnnouncementSocketUiStatus) => void;
  setLastError: (message: string | null) => void;
};

export const useAnnouncementSocketStore = create<State>((set) => ({
  status: 'idle',
  lastErrorMessage: null,
  setStatus: (status) => set({ status }),
  setLastError: (lastErrorMessage) => set({ lastErrorMessage }),
}));
