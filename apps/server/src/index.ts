import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { z } from 'zod';
import type { ClientEvents, ServerEvents } from '@gamehub/shared';
import { authenticate } from './socket/auth.js';

const env = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    CORS_ORIGIN: z.union([z.literal(''), z.url()]).default(''),
    ACCESS_CODE: z.string().max(128).default(''),
  })
  .parse(process.env);
const app = express();
app.disable('x-powered-by');
const http = createServer(app);
const io = new Server<ClientEvents, ServerEvents>(http, {
  maxHttpBufferSize: 1_000_000,
  cors: env.CORS_ORIGIN ? { origin: env.CORS_ORIGIN } : undefined,
  allowRequest(req, callback) {
    const origin = req.headers.origin;
    const sameOrigin =
      origin &&
      URL.canParse(origin) &&
      new URL(origin).host === req.headers.host;
    callback(null, !origin || !!sameOrigin || origin === env.CORS_ORIGIN);
  },
});
let closing = false;
app.get('/health', (_req, res) => {
  res
    .status(closing ? 503 : 200)
    .json({ status: closing ? 'restarting' : 'ok', phase: 0 });
});
const webRoot = fileURLToPath(new URL('../../web/dist/', import.meta.url));
app.use(express.static(webRoot));
app.get('/{*path}', (_req, res) =>
  res.sendFile('index.html', { root: webRoot }),
);

io.use((socket, next) => {
  if (closing) return next(new Error('Máy chủ đang khởi động lại.'));
  const result = authenticate(socket.handshake.auth, env.ACCESS_CODE);
  if (result.error) return next(new Error(result.error));
  socket.data.playerId = result.identity.playerId;
  next();
});
function broadcastPresence() {
  const online = new Set(
    [...io.sockets.sockets.values()].map((s) => s.data.playerId as string),
  ).size;
  io.emit('lobby:state', { online });
}
io.on('connection', (socket) => {
  broadcastPresence();
  socket.on('disconnect', broadcastPresence);
});
function shutdown() {
  if (closing) return;
  closing = true;
  console.info('GameHub: shutting down');
  io.emit(
    'server:restarting',
    'Máy chủ đang khởi động lại. Bạn chờ một chút nhé!',
  );
  setTimeout(() => io.close(() => process.exit(0)), 500);
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
http.listen(env.PORT, '0.0.0.0', () =>
  console.info(`GameHub listening on port ${env.PORT}`),
);
