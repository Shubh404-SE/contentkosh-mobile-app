import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { io, type Socket } from 'socket.io-client';
import { ANNOUNCEMENT_SOCKET_EVENTS, type AnnouncementSocketPayload } from '../constants/announcementSocket';
import { ANNOUNCEMENT_QUERY_KEYS } from '../constants/announcementQueryKeys';
import { getAnnouncementSocketBaseUrl } from '../lib/socketUrl';
import { useAnnouncementSocketStore } from '../store/announcementSocketStore';

const SOCKET_RECONNECT_DELAY_MAX_MS = 10_000;
const DEDUPE_MS = 400;

/**
 * Mirrors web `useAnnouncementSocketBridge`: one Socket.IO client; on announcement events,
 * refresh the announcements bundle query (React Query cache) instead of a window event.
 */
export function useAnnouncementSocketBridge(enabled: boolean, businessId: number | undefined): void {
  const queryClient = useQueryClient();
  const setStatus = useAnnouncementSocketStore((s) => s.setStatus);
  const setLastError = useAnnouncementSocketStore((s) => s.setLastError);
  const dedupeRef = useRef<Map<number, number>>(new Map());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected === false || state.isInternetReachable === false) {
        setStatus('offline');
      } else if (socketRef.current?.connected) {
        setStatus('connected');
      }
    });
    return () => {
      unsub();
    };
  }, [setStatus]);

  useEffect(() => {
    if (!enabled || businessId === undefined) {
      setStatus('idle');
      setLastError(null);
      return undefined;
    }

    const baseUrl = getAnnouncementSocketBaseUrl();
    setStatus('reconnecting');

    const socket: Socket = io(baseUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: SOCKET_RECONNECT_DELAY_MAX_MS,
      timeout: 20_000,
    });

    socketRef.current = socket;

    const shouldProcessPayload = (payload: AnnouncementSocketPayload): boolean => {
      if (payload.id === undefined || payload.businessId === undefined) return false;
      if (payload.businessId !== businessId) return false;
      const now = Date.now();
      const last = dedupeRef.current.get(payload.id);
      if (last !== undefined && now - last < DEDUPE_MS) return false;
      dedupeRef.current.set(payload.id, now);
      return true;
    };

    const invalidateBundle = (): void => {
      void queryClient.invalidateQueries({ queryKey: ANNOUNCEMENT_QUERY_KEYS.bundle() });
    };

    const onNew = (payload: AnnouncementSocketPayload) => {
      if (!shouldProcessPayload(payload)) return;
      invalidateBundle();
    };

    const onUpdated = (payload: AnnouncementSocketPayload) => {
      if (!shouldProcessPayload(payload)) return;
      invalidateBundle();
    };

    const onDeleted = (payload: AnnouncementSocketPayload) => {
      if (!shouldProcessPayload(payload)) return;
      if (payload.id !== undefined) {
        queryClient.removeQueries({ queryKey: ANNOUNCEMENT_QUERY_KEYS.detail(payload.id) });
      }
      invalidateBundle();
    };

    const onConnect = () => {
      setLastError(null);
      setStatus('connected');
    };

    const onDisconnect = () => {
      void NetInfo.fetch().then((state) => {
        if (state.isConnected === false || state.isInternetReachable === false) {
          setStatus('offline');
        } else {
          setStatus('reconnecting');
        }
      });
    };

    const onReconnectAttempt = () => {
      setStatus('reconnecting');
    };

    const onConnectError = (err: unknown) => {
      const raw = err instanceof Error ? err.message : 'Connection error';
      const normalized = raw.toLowerCase();
      // Avoid surfacing confusing auth transport errors like "no token provided" at the top of the UI.
      const safeMessage =
        normalized.includes('token') || normalized.includes('unauthorized') ? null : raw;
      setLastError(safeMessage);
      setStatus('disconnected');
    };

    const onUnauthorized = () => {
      // Server can emit "No token" during cookie/session edge cases; treat as disconnected and retry silently.
      setLastError(null);
      setStatus('disconnected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on(ANNOUNCEMENT_SOCKET_EVENTS.NEW, onNew);
    socket.on(ANNOUNCEMENT_SOCKET_EVENTS.UPDATED, onUpdated);
    socket.on(ANNOUNCEMENT_SOCKET_EVENTS.DELETED, onDeleted);
    socket.on(ANNOUNCEMENT_SOCKET_EVENTS.UNAUTHORIZED, onUnauthorized);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.off(ANNOUNCEMENT_SOCKET_EVENTS.NEW, onNew);
      socket.off(ANNOUNCEMENT_SOCKET_EVENTS.UPDATED, onUpdated);
      socket.off(ANNOUNCEMENT_SOCKET_EVENTS.DELETED, onDeleted);
      socket.off(ANNOUNCEMENT_SOCKET_EVENTS.UNAUTHORIZED, onUnauthorized);
      socket.disconnect();
      socketRef.current = null;
      setStatus('idle');
      setLastError(null);
    };
  }, [businessId, enabled, queryClient, setLastError, setStatus]);
}
