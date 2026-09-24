import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './http/app.js';
import { SessionStore } from './session/store.js';
import { registerGatewayHandlers } from './gateway/index.js';

const PORT = Number(process.env.PORT ?? 3001);
// Comma-separated list of allowed origins, e.g. "https://your-app.netlify.app,https://deploy-preview-1--your-app.netlify.app"
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const store = new SessionStore();
const app = createApp(store, CLIENT_ORIGINS);
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

registerGatewayHandlers(io, store);

// Bound memory for long-lived processes; ephemeral game sessions don't need to live forever.
setInterval(() => store.cleanupIdleSessions(), 30 * 60 * 1000);

httpServer.listen(PORT, () => {
  console.log(`Blood on the Clocktower server listening on http://localhost:${PORT}`);
});
