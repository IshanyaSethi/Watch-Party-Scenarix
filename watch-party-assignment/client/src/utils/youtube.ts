const ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export const extractVideoId = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.replace('/', '');
    }

    if (url.searchParams.has('v')) {
      return url.searchParams.get('v');
    }

    const segments = url.pathname.split('/');
    const shortsIndex = segments.findIndex((segment) => segment === 'shorts');
    if (shortsIndex !== -1 && shortsIndex + 1 < segments.length) {
      return segments[shortsIndex + 1];
    }

    if (segments.includes('embed') && segments[segments.length - 1]) {
      return segments[segments.length - 1];
    }
  } catch (error) {
    return null;
  }

  return null;
};

export const formatTimestamp = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const paddedMins = hrs > 0 ? mins.toString().padStart(2, '0') : mins.toString();
  const paddedSecs = secs.toString().padStart(2, '0');

  return hrs > 0 ? `${hrs}:${paddedMins}:${paddedSecs}` : `${mins}:${paddedSecs}`;
};

export const sampleVideos = [
  {
    label: 'Lo-fi hip hop radio',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    label: 'NASA Live: Earth from space',
    url: 'https://www.youtube.com/watch?v=21X5lGlDOfg',
  },
  {
    label: 'React Conf Keynote 2021',
    url: 'https://www.youtube.com/watch?v=FZ0cG47msEk',
  },
];
