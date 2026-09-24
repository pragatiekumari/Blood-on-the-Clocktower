# Blood on the Clocktower — Web App

A real-time companion app for running *Blood on the Clocktower* (Trouble Brewing script) online. One player is the Storyteller (full game-master view); everyone else gets a character-scoped player view. Built with React/TypeScript on the frontend and Node/TypeScript/Socket.IO on the backend.

## Project structure

```
packages/
  shared/   Character data, distribution table, protocol types/schemas (used by both client and server)
  server/   Express REST API + Socket.IO gateway, game session state
  client/   React + Vite frontend
```

## Local development

```bash
npm install
npm run dev:server   # http://localhost:3001
npm run dev:client    # http://localhost:5173
```

The client's Vite dev server proxies `/api` and `/socket.io` to `localhost:3001`, so no extra config is needed locally.

## Running tests / building

```bash
npm run test    # runs all three packages' test suites
npm run build   # builds shared, then server, then client
```

## Deployment

Netlify only serves static sites — it can't run the persistent Node/Socket.IO backend this app needs. So the client and server deploy to two different places:

### 1. Server (Node/Socket.IO) — Render, Railway, Fly.io, or similar

Any host that runs a long-lived Node process works. Using Render as an example:

1. Create a new **Web Service** pointed at this repo.
2. Build command: `npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/server`
3. Start command: `node packages/server/dist/index.js`
4. Environment variables:
   - `PORT` — set automatically by most hosts; the server reads `process.env.PORT`.
   - `CLIENT_ORIGIN` — comma-separated list of allowed frontend origins, e.g. `https://your-app.netlify.app,https://deploy-preview-1--your-app.netlify.app`
   - `CLOCKTOWER_JWT_SECRET` — a random secret string for signing session tokens. Generate one with `openssl rand -hex 32`. Required in production — the code falls back to a dev-only default otherwise.
5. Note the deployed URL (e.g. `https://your-server.onrender.com`).

### 2. Client (React/Vite) — Netlify

This repo includes `netlify.toml` at the root, so Netlify auto-detects the build settings:

1. In Netlify, **Add a new site → Import from Git**, pick this repository.
2. It should pick up `netlify.toml` automatically (build command + publish directory). If prompted manually:
   - Build command: `npm install && npm run build --workspace=packages/shared && npm run build --workspace=packages/client`
   - Publish directory: `packages/client/dist`
3. Add an environment variable in Netlify's site settings:
   - `VITE_SERVER_URL` = the server URL from step 1, e.g. `https://your-server.onrender.com`
4. Deploy. Once both are live, open the Netlify URL, create a game, and share the join code.

### Updating CORS after deploying

The server's `CLIENT_ORIGIN` env var must list the exact Netlify URL(s) allowed to connect — update and redeploy the server if your Netlify URL changes (e.g. after connecting a custom domain).

## Security note

This app uses signed join tokens (JWT) scoped to each game session, but there's no user account system — anyone with a join code can join a lobby. That's fine for running a game with a known group of friends; it is not intended for public, unauthenticated internet exposure beyond that.
