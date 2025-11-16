import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ConnectionStatus, SessionState } from '../types/session';

const DEFAULT_SOCKET_URL = import.meta.env.DEV
  ? 'http://localhost:4000'
  : typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4000';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || DEFAULT_SOCKET_URL;

const defaultState: SessionState = {
  videoUrl: null,
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  updatedAt: Date.now(),
  userCount: 0,
};

export const useSessionSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [session, setSession] = useState<SessionState>(defaultState);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    const requestServerSync = () => socket.emit('sync-request');

    const handleSessionState = (payload: Partial<SessionState>) => {
      setSession((prev) => ({
        ...prev,
        ...payload,
        userCount: typeof payload.userCount === 'number' ? payload.userCount : prev.userCount,
      }));
    };

    const handleConnect = () => {
      setStatus('connected');
      requestServerSync();
    };
    const handleDisconnect = () => setStatus('disconnected');
    const handleConnectError = () => setStatus('disconnected');
    const handleReconnectAttempt = () => setStatus('connecting');
    const handleReconnect = () => {
      setStatus('connected');
      requestServerSync();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);
    socket.io.on('reconnect', handleReconnect);
    socket.on('session-state', handleSessionState);
    socket.on('user-count', (count: number) =>
      setSession((prev) => ({
        ...prev,
        userCount: count,
      })),
    );

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.io.off('reconnect', handleReconnect);
      socket.off('session-state', handleSessionState);
      socket.disconnect();
    };
  }, []);

  const emit = useCallback((event: string, payload?: Record<string, unknown>) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, payload);
  }, []);

  const setVideo = useCallback(
    (videoUrl: string) => emit('set-video', { videoUrl }),
    [emit],
  );

  const play = useCallback(
    (currentTime: number) => emit('play', { currentTime }),
    [emit],
  );

  const pause = useCallback(
    (currentTime: number) => emit('pause', { currentTime }),
    [emit],
  );

  const seek = useCallback(
    (currentTime: number) => emit('seek', { currentTime }),
    [emit],
  );

  const requestSync = useCallback(() => emit('sync-request'), [emit]);

  return {
    session,
    status,
    actions: {
      setVideo,
      play,
      pause,
      seek,
      requestSync,
    },
  };
};
