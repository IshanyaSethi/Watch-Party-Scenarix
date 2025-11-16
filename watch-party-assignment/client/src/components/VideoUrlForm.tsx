import { type FormEvent, useEffect, useState } from 'react';
import { extractVideoId, sampleVideos } from '../utils/youtube';

type VideoUrlFormProps = {
  currentUrl: string | null;
  onSubmit: (url: string) => void;
  disabled: boolean;
};

export const VideoUrlForm = ({ currentUrl, onSubmit, disabled }: VideoUrlFormProps) => {
  const [value, setValue] = useState(currentUrl ?? '');
  const [error, setError] = useState('');

  useEffect(() => {
    setValue(currentUrl ?? '');
    setError('');
  }, [currentUrl]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Paste a YouTube URL to play together.');
      return;
    }
    const videoId = extractVideoId(trimmed);
    if (!videoId) {
      setError('That does not look like a valid YouTube URL.');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  const handleSampleClick = (sampleUrl: string) => {
    setValue(sampleUrl);
    setError('');
    onSubmit(sampleUrl);
  };

  return (
    <section className="panel">
      <h2 className="panel-title">Select a video</h2>
      <form className="url-form" onSubmit={handleSubmit}>
        <label htmlFor="youtube-url">YouTube URL</label>
        <div className="input-row">
          <input
            id="youtube-url"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
          />
          <button type="submit" disabled={disabled} className="primary">
            Load
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </form>
      <div className="sample-grid">
        {sampleVideos.map((sample) => (
          <button
            type="button"
            key={sample.url}
            className="ghost-button"
            onClick={() => handleSampleClick(sample.url)}
            disabled={disabled}
          >
            {sample.label}
          </button>
        ))}
      </div>
    </section>
  );
};
