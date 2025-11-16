type ControlBarProps = {
  disabled: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResync: () => void;
};

export const ControlBar = ({ disabled, isPlaying, onPlay, onPause, onResync }: ControlBarProps) => {
  return (
    <div className="control-bar">
      <button type="button" onClick={onPlay} disabled={disabled || isPlaying} className="primary">
        Play
      </button>
      <button type="button" onClick={onPause} disabled={disabled || !isPlaying}>
        Pause
      </button>
      <button type="button" onClick={onResync} disabled={disabled} className="ghost-button">
        Resync
      </button>
    </div>
  );
};
