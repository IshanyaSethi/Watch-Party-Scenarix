import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractVideoId } from '../utils/youtube';

type PlayerStateMap = {
  UNSTARTED: -1;
  ENDED: 0;
  PLAYING: 1;
  PAUSED: 2;
  BUFFERING: 3;
  CUED: 5;
};

const PLAYER_STATE: PlayerStateMap = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

const READY_VIDEO_STATES = new Set<number>([
  PLAYER_STATE.CUED,
  PLAYER_STATE.PLAYING,
  PLAYER_STATE.PAUSED,
]);

type YouTubePlayerHandle = {
  playVideo?: () => void;
  pauseVideo?: () => void;
  stopVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  destroy?: () => void;
  getCurrentTime?: () => number;
  getDuration?: () => number;
  getPlayerState?: () => number;
};

type PlayerEvent = {
  target: YouTubePlayerHandle;
  data: number;
};

type PlayerOptions = {
  videoId?: string;
  height?: string | number;
  width?: string | number;
  playerVars?: Record<string, unknown>;
  events?: {
    onReady?: (event: PlayerEvent) => void;
    onStateChange?: (event: PlayerEvent) => void;
    onError?: () => void;
  };
};

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: PlayerOptions) => YouTubePlayerHandle;
  PlayerState?: PlayerStateMap;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYER_VARS: Record<string, number> = {
  autoplay: 0,
  controls: 0,
  rel: 0,
  modestbranding: 1,
  disablekb: 1,
  playsinline: 1,
};

const loadYouTubeIframeApi = (() => {
  let promise: Promise<YouTubeNamespace> | null = null;

  return () => {
    if (promise) {
      return promise;
    }

    if (typeof window === 'undefined') {
      return Promise.reject(new Error('YouTube API is not available in this environment.'));
    }

    if (window.YT?.Player) {
      promise = Promise.resolve(window.YT);
      return promise;
    }

    promise = new Promise<YouTubeNamespace>((resolve, reject) => {
      const cleanupOnError = (error: Error) => {
        promise = null;
        reject(error);
      };

      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => cleanupOnError(new Error('Unable to load the YouTube IFrame API.'));

      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head?.appendChild(script);
      }

      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        if (window.YT?.Player) {
          resolve(window.YT);
        } else {
          cleanupOnError(new Error('The YouTube API failed to initialize.'));
        }
      };
    });

    return promise;
  };
})();

type PlayerShellProps = {
  videoUrl: string | null;
  shouldPlay: boolean;
  targetTime: number;
  onTimeUpdate: (time: number) => void;
  onDuration: (duration: number) => void;
};

type TeardownOptions = {
  resetState?: boolean;
  clearError?: boolean;
};

export const PlayerShell = ({ videoUrl, shouldPlay, targetTime, onTimeUpdate, onDuration }: PlayerShellProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerHandle | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoId = useMemo(() => extractVideoId(videoUrl ?? ''), [videoUrl]);

  const teardownPlayer = useCallback((options: TeardownOptions = {}) => {
    const { resetState = false, clearError = false } = options;

    if (playerRef.current) {
      try {
        playerRef.current.stopVideo?.();
        playerRef.current.destroy?.();
      } catch {
        // ignoring teardown errors keeps the UI responsive
      }
      playerRef.current = null;
    }

    if (resetState) {
      setPlayerReady(false);
      setVideoReady(false);
    }

    if (clearError) {
      setError(null);
    }
  }, []);

  useEffect(() => () => teardownPlayer(), [teardownPlayer]);

  useEffect(() => {
    let cancelled = false;

    if (!videoId || !containerRef.current) {
      return undefined;
    }

    loadYouTubeIframeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        containerRef.current.innerHTML = '';

        const player = new YT.Player(containerRef.current, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: PLAYER_VARS,
          events: {
              onReady: (event: PlayerEvent) => {
                if (cancelled) return;
                playerRef.current = event.target;
                setPlayerReady(true);
                setVideoReady(true);
                onDuration(event.target?.getDuration?.() ?? 0);
                onTimeUpdate(event.target?.getCurrentTime?.() ?? 0);
              },
              onStateChange: (event: PlayerEvent) => {
                if (cancelled) return;
                const duration = event.target?.getDuration?.() ?? 0;
                if (duration) {
                  onDuration(duration);
                }
                if (READY_VIDEO_STATES.has(event.data)) {
                  setVideoReady(true);
                }
              },
              onError: () => {
                if (cancelled) return;
                setVideoReady(false);
                setError('Unable to load this video. It may be blocked from embedding.');
              },
          },
        });

        playerRef.current = player;
      })
      .catch((apiError) => {
        if (cancelled) return;
        const message =
          apiError instanceof Error ? apiError.message : 'Unable to load the YouTube player. Please try again.';
        setError(message);
      });

    return () => {
      cancelled = true;
      teardownPlayer({ resetState: true, clearError: true });
    };
  }, [videoId, onDuration, onTimeUpdate, teardownPlayer]);

  const syncPlayback = useCallback(() => {
    if (!playerReady || !videoReady || !playerRef.current || typeof targetTime !== 'number') {
      return;
    }

    const player = playerRef.current;
    const currentTime = player.getCurrentTime?.() ?? 0;
    if (Number.isFinite(targetTime) && Math.abs(currentTime - targetTime) > 0.6) {
      player.seekTo?.(targetTime, true);
    }

    const playerState = player.getPlayerState?.();
    const isActivelyPlaying =
      playerState === PLAYER_STATE.PLAYING || playerState === PLAYER_STATE.BUFFERING;

    if (shouldPlay) {
      if (!isActivelyPlaying) {
        player.playVideo?.();
      }
    } else if (isActivelyPlaying || playerState === PLAYER_STATE.CUED) {
      player.pauseVideo?.();
    }
  }, [playerReady, videoReady, shouldPlay, targetTime]);

  useEffect(() => {
    syncPlayback();
  }, [syncPlayback]);

  useEffect(() => {
    if (!playerReady || !videoReady || !playerRef.current) return;
    const interval = setInterval(() => {
      const current = playerRef.current?.getCurrentTime?.() ?? 0;
      if (Number.isFinite(current)) {
        onTimeUpdate(current);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [onTimeUpdate, playerReady, videoReady]);

  return (
    <section className="panel player-panel">
      <div className="player-stage">
        {!videoId && (
          <div className="player-placeholder">
            <p>Paste a YouTube link to start the shared session.</p>
          </div>
        )}
        {videoId && <div className="youtube-frame" ref={containerRef} />}
      </div>
      {error && <p className="error-text">{error}</p>}
    </section>
  );
};
