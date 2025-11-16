import { useCallback, useMemo, useState } from 'react';
import './App.css';
import { SessionHeader } from './components/SessionHeader';
import { VideoUrlForm } from './components/VideoUrlForm';
import { PlayerShell } from './components/PlayerShell';
import { SeekBar } from './components/SeekBar';
import { ControlBar } from './components/ControlBar';
import { InfoCard } from './components/InfoCard';
import { useSessionSocket } from './hooks/useSessionSocket';
import { extractVideoId } from './utils/youtube';

function App() {
  const { session, status, actions } = useSessionSocket();
  const [localTime, setLocalTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const hasVideo = useMemo(() => Boolean(extractVideoId(session.videoUrl ?? '')), [session.videoUrl]);

  const targetTime = useMemo(() => {
    if (!session.isPlaying) return session.currentTime;
    const elapsed = (Date.now() - session.updatedAt) / 1000;
    return session.currentTime + Math.max(0, elapsed);
  }, [session.currentTime, session.updatedAt, session.isPlaying]);

  const handleTimeUpdate = useCallback((time: number) => setLocalTime(time), []);

  const handleDuration = useCallback((value: number) => {
    setDuration(Math.max(0, value));
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      setLocalTime(time);
      actions.seek(time);
    },
    [actions],
  );

  const handlePlay = useCallback(() => {
    actions.play(localTime);
  }, [actions, localTime]);

  const handlePause = useCallback(() => {
    actions.pause(localTime);
  }, [actions, localTime]);

  const handleSetVideo = useCallback(
    (url: string) => {
      actions.setVideo(url);
      setLocalTime(0);
      setDuration(0);
    },
    [actions],
  );

  return (
    <div className="app-shell">
      <SessionHeader status={status} userCount={session.userCount} />
      <main className="layout">
        <div className="primary-column">
          <PlayerShell
            videoUrl={session.videoUrl}
            shouldPlay={session.isPlaying}
            targetTime={targetTime}
            onTimeUpdate={handleTimeUpdate}
            onDuration={handleDuration}
          />
          <SeekBar currentTime={localTime} duration={duration} disabled={!hasVideo || duration === 0} onSeek={handleSeek} />
          <ControlBar
            disabled={!hasVideo}
            isPlaying={session.isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onResync={actions.requestSync}
          />
        </div>
        <aside className="sidebar">
          <VideoUrlForm currentUrl={session.videoUrl} onSubmit={handleSetVideo} disabled={status !== 'connected'} />
          <InfoCard
            title="Real-time sync"
            items={[
              'Everyone shares the same playback controls.',
              'Actions propagate instantly over WebSockets.',
              'New viewers jump to the most recent timestamp automatically.',
            ]}
          />
          <InfoCard
            title="Acceptance checklist"
            items={[
              'Play / pause stays in sync across browser tabs.',
              'Seeking broadcasts to every viewer.',
              'Changing the URL resets the shared session.',
              'Joining late matches the current playback state.',
            ]}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
