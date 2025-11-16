import { useEffect, useState } from 'react';
import { formatTimestamp } from '../utils/youtube';

type SeekBarProps = {
  currentTime: number;
  duration: number;
  disabled: boolean;
  onSeek: (time: number) => void;
};

export const SeekBar = ({ currentTime, duration, disabled, onSeek }: SeekBarProps) => {
  const [value, setValue] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!dragging) {
      setValue(currentTime);
    }
  }, [currentTime, dragging]);

  const handleCommit = () => {
    setDragging(false);
    onSeek(value);
  };

  const sliderMax = Math.max(duration, 0.1);

  return (
    <div className="seekbar">
      <span className="timecode">{formatTimestamp(value)}</span>
      <input
        type="range"
        min={0}
        max={sliderMax}
        step={0.1}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          setValue(Number(event.target.value));
          setDragging(true);
        }}
        onMouseDown={() => setDragging(true)}
        onTouchStart={() => setDragging(true)}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        onKeyUp={handleCommit}
      />
      <span className="timecode">{formatTimestamp(duration || 0)}</span>
    </div>
  );
};
