## Watch-Party Assignment

A minimal full-stack watch party where everyone who opens the app joins the same global session and stays in sync while watching any embeddable YouTube video. The project is split into a Node.js/Socket.IO server and a Vite + React client with a component-driven layout.

### Tech Stack
- `server/`: Node.js, Express, Socket.IO
- `client/`: Vite, React, TypeScript, `react-youtube`, Socket.IO client

### Project Structure
```
.
├── server/          # Express + Socket.IO backend
├── client/          # React frontend
└── README.md
```

### Local Development
1. **Install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
2. **Start the backend**
   ```bash
   cd server
   npm run dev
   # server listens on http://localhost:4000 by default
   ```
3. **Start the frontend (in a second terminal)**
   ```bash
   cd client
   npm run dev
   # Vite serves the UI on http://localhost:5173
   ```
4. **Configure the client (optional)**
   The client points to `http://localhost:4000` automatically. To target a different server set `VITE_SOCKET_URL` in `client/.env`.

### Architecture Overview
- **Server state**: The Node.js server stores the canonical session (video URL, play/pause flag, timestamp, and last update time). Whenever a user performs an action (`set-video`, `play`, `pause`, `seek`), the server updates this state and broadcasts a `session-state` payload to every socket.
- **Time reconciliation**: Instead of broadcasting timestamps continuously, the server keeps the last known timestamp and `updatedAt`. Joining clients compute the expected playback position based on elapsed wall-clock time, then instruct their local player to seek + play, keeping drift minimal.
- **Client synchronization**: The React client wraps the YouTube iframe via `react-youtube`. A `useSessionSocket` hook abstracts Socket.IO wiring and exposes high-level actions. The UI is decomposed into dedicated components (`SessionHeader`, `PlayerShell`, `SeekBar`, `ControlBar`, `VideoUrlForm`, `InfoCard`) to keep presentation, transport, and playback concerns separate.

### Key Technical Decisions
- **Single source of truth on the server**: Avoids conflicting peer-to-peer updates and simplifies late-join sync.
- **Derived timestamps**: Calculating the current playback time from `updatedAt` + elapsed milliseconds prevents needless spam over the socket channel and smooths client joins.
- **Custom controls with hidden YouTube chrome**: The iframe runs with `controls: 0` so all actions route through our buttons/slider, ensuring every change is propagated through the server.
- **Component-driven client**: Each UI responsibility lives in its own component, which keeps React state localized and matches the assignment request for a component-wise structure.

### Testing the Experience
1. Run the client in two browser tabs.
2. Load a YouTube URL in one tab – the video should appear everywhere.
3. Click Play/Pause in either tab – both tabs should follow immediately.
4. Drag the seek bar – all tabs jump to the same timestamp.
5. Paste a different URL – everyone resets to the new video and paused state.
6. Open a fresh tab – it should join at the current video/time and display the viewer count.

### Known Limitations / Next Steps
- The in-memory session resets when the Node process restarts. Persisting to Redis or a database would allow restarts or horizontal scaling.
- No authentication or identity is implemented; every visitor is anonymous.
- Network jitter is mitigated but not fully corrected; adding periodic drift checks (e.g., every few seconds) could tighten synchronization further.
- Mobile UI is responsive, but tactile controls (e.g., haptics, larger buttons) could improve usability on phones.

### Deployment

#### Render (single URL)
1. Push this repository to GitHub (or any Git provider Render supports).
2. In Render select **New ➜ Blueprint** and point it at the repo. The provided `render.yaml` provisions a single Node service that:
   - Installs backend and frontend dependencies
   - Builds the Vite client
   - Serves the compiled assets directly from the Express server
3. Click **Deploy** – Render will supply a URL such as `https://watch-party-app.onrender.com` that serves both the UI and the Socket.IO backend.
4. (Optional) Replace the `CLIENT_ORIGIN` env var in Render with the final URL for stricter CORS.

#### Other platforms
- **Backend**: Deploy `server/` to any Node host (Fly.io, Railway, etc.). Run `npm install --prefix server` during build and `npm --prefix server start` at runtime. Set `CLIENT_ORIGIN` to the exact frontend origin (or leave as `*` for testing).
- **Frontend**: Build with `npm install --prefix client && npm run build --prefix client`. Deploy the `client/dist` folder to Netlify, Vercel, S3, etc. Remember to set `VITE_SOCKET_URL` to your backend URL before running `npm run build` so the bundle knows where to find the socket server.
