# Signal — Video Call Platform Frontend

React + Vite + Tailwind CSS v4 frontend for the FastAPI video calling backend
(auth, rooms, WebRTC signaling).

## Stack

- React 19 + React Router 7
- Tailwind CSS v4 (via `@tailwindcss/vite`, no `tailwind.config.js` needed —
  design tokens live in `src/index.css` under `@theme`)
- Axios for the REST API
- Native `RTCPeerConnection` for WebRTC (mesh topology), no external SDK

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies:

- `/api/*` -> `http://localhost:8000/*` (your FastAPI backend)
- `/ws/*`  -> `ws://localhost:8000/ws/*` (the signaling WebSocket)

So just run your FastAPI backend on port 8000 alongside `npm run dev` and
everything wires up automatically -- no `.env` needed in development.

## Production build

```bash
npm run build
```

Set these two env vars (see `.env.example`) before building for production,
since there's no dev proxy in a static build:

- `VITE_API_BASE_URL` -- e.g. `https://api.yourapp.com`
- `VITE_WS_BASE_URL` -- e.g. `wss://api.yourapp.com`

## How the pieces fit together

- `src/api/client.js` -- Axios instance that attaches the JWT from
  `localStorage`, redirects to `/login` on 401, and builds the signaling
  WebSocket URL.
- `src/context/AuthContext.jsx` -- register/login/logout, persists the token
  and user in `localStorage`.
- `src/hooks/useRoomCall.js` -- the core of the call: owns the signaling
  WebSocket, `getUserMedia`, and a **mesh** of `RTCPeerConnection`s (one per
  remote participant). On `room-state` it offers to everyone already in the
  room; on `peer-joined` it waits for their offer. Exposes local/remote
  streams, mic/camera toggles, chat, and `leave()`.
- Pages: `LoginPage` / `RegisterPage` -> `DashboardPage` (create/join a room)
  -> `PreJoinPage` (camera/mic check lobby) -> `RoomPage` (the call itself).

## Design

Visual identity is built around a broadcast **tally light** motif (the small
lit dot that shows a camera is live) -- used for connection status, room
codes styled like studio slate tags (`RoomCodeChip`, monospace), and the
"on air" framing on auth/lobby screens. Dark `ink` surfaces for anything
video-related (lobby, in-call), a lighter `paper` surface for auth and the
dashboard. Type: Space Grotesk (display) + Inter (body) + JetBrains Mono
(room codes, timestamps).
