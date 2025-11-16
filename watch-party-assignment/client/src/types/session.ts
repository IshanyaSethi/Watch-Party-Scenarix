export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface SessionState {
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  playbackRate: number;
  updatedAt: number;
  userCount: number;
}
