import type { ConnectionStatus } from '../types/session';

type SessionHeaderProps = {
  status: ConnectionStatus;
  userCount: number;
};

const statusCopy: Record<ConnectionStatus, string> = {
  connecting: 'Connecting...',
  connected: 'Live',
  disconnected: 'Offline',
};

export const SessionHeader = ({ status, userCount }: SessionHeaderProps) => {
  return (
    <header className="session-header">
      <div>
        <p className="eyebrow">Global Session</p>
        <h1>Watch Party</h1>
      </div>
      <div className="session-meta">
        <span className={`status-badge status-${status}`} aria-live="polite">
          <span className="status-dot" />
          {statusCopy[status]}
        </span>
        <span className="divider" aria-hidden="true" />
        <span className="viewer-count">
          {userCount} {userCount === 1 ? 'viewer' : 'viewers'}
        </span>
      </div>
    </header>
  );
};
