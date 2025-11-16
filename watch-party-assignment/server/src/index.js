const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
app.use(cors({ origin: CLIENT_ORIGIN }));

app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

const initialState = {
  videoUrl: null,
  isPlaying: false,
  currentTime: 0,
  playbackRate: 1,
  updatedAt: Date.now(),
};

let sessionState = { ...initialState };
let userCount = 0;

const sanitizeTime = (value) => {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return Math.max(0, num);
};

const computeEffectiveState = () => {
  if (!sessionState.isPlaying) {
    return { ...sessionState, userCount };
  }

  const now = Date.now();
  const elapsed = (now - sessionState.updatedAt) / 1000;

  return {
    ...sessionState,
    currentTime: sessionState.currentTime + Math.max(0, elapsed),
    updatedAt: now,
    userCount,
  };
};

const emitState = () => {
  io.emit('session-state', computeEffectiveState());
};

io.on('connection', (socket) => {
  userCount += 1;
  socket.emit('session-state', computeEffectiveState());
  io.emit('user-count', userCount);

  socket.on('set-video', (payload = {}) => {
    const { videoUrl } = payload;
    if (typeof videoUrl !== 'string' || videoUrl.trim() === '') {
      return;
    }

    sessionState = {
      ...sessionState,
      videoUrl: videoUrl.trim(),
      isPlaying: false,
      currentTime: 0,
      updatedAt: Date.now(),
    };
    emitState();
  });

  socket.on('play', (payload = {}) => {
    const { currentTime } = payload;
    sessionState = {
      ...sessionState,
      isPlaying: true,
      currentTime: sanitizeTime(currentTime),
      updatedAt: Date.now(),
    };
    emitState();
  });

  socket.on('pause', (payload = {}) => {
    const { currentTime } = payload;
    sessionState = {
      ...sessionState,
      isPlaying: false,
      currentTime: sanitizeTime(currentTime),
      updatedAt: Date.now(),
    };
    emitState();
  });

  socket.on('seek', (payload = {}) => {
    const { currentTime } = payload;
    sessionState = {
      ...sessionState,
      currentTime: sanitizeTime(currentTime),
      updatedAt: Date.now(),
    };
    emitState();
  });

  socket.on('sync-request', () => {
    socket.emit('session-state', computeEffectiveState());
  });

  socket.on('disconnect', () => {
    userCount = Math.max(0, userCount - 1);
    io.emit('user-count', userCount);
  });
});

const clientDistPath = path.resolve(__dirname, '../../client/dist');
const clientIndexPath = path.join(clientDistPath, 'index.html');
const canServeClient = fs.existsSync(clientDistPath) && fs.existsSync(clientIndexPath);

if (canServeClient) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(clientIndexPath);
  });
} else {
  console.warn('Client build output not found. Static assets will not be served by the server.');
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Watch-party server listening on port ${PORT}`);
});
