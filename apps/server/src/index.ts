import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import {
  caro,
  EMPTY_ROOM_MS,
  type ClientEvents,
  type ServerEvents,
  type PlayerInfo,
  type Ack,
} from '@gamehub/shared';
import { poker } from '@gamehub/shared/poker';
import { authenticate } from './socket/auth.js';
import { RoomStore, RoomError, type Room } from './rooms/RoomStore.js';
import {
  codeSchema,
  createSchema,
  emptySchema,
  actionSchema,
  chatSchema,
  spectatorIdSchema,
  seatRequestResponseSchema,
  seatInviteResponseSchema,
  allowEvent,
} from './socket/events.js';

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
interface SocketData {
  player: PlayerInfo;
}
const io = new Server<
  ClientEvents,
  ServerEvents,
  Record<string, never>,
  SocketData
>(http, {
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
app.get('/health', (_req, res) =>
  res
    .status(closing ? 503 : 200)
    .json({ status: closing ? 'restarting' : 'ok', phase: 4 }),
);
const webRoot = fileURLToPath(new URL('../../web/dist/', import.meta.url));
app.use(express.static(webRoot));
app.get('/{*path}', (_req, res) =>
  res.sendFile('index.html', { root: webRoot }),
);

function playerSockets(playerId: string) {
  return [...io.sockets.sockets.values()].filter(
    (s) => s.data.player.id === playerId,
  );
}
function publishRoom(room: Room) {
  for (const player of [...room.players, ...room.spectators]) {
    const view = room.game
      ? {
          ...(room.game.gameId === 'caro'
            ? caro.getViewFor(room.game, player.id)
            : poker.getViewFor(room.game, player.id)),
          roomCode: room.code,
          deadline: room.deadline,
          serverTime: Date.now(),
        }
      : null;
    for (const socket of playerSockets(player.id)) {
      socket.emit('room:state', rooms.view(room));
      socket.emit('game:view', view);
    }
  }
}
function publishLobby() {
  io.emit('lobby:state', {
    online: rooms.connections.size,
    rooms: rooms.list(),
  });
}
const rooms = new RoomStore(
  publishRoom,
  (playerId) => {
    for (const socket of playerSockets(playerId)) {
      socket.emit('room:state', null);
      socket.emit('game:view', null);
    }
  },
  publishLobby,
);
const identities = new Map<string, { token: string; seenAt: number }>();
const rateBuckets = new Map<
  string,
  Map<string, { since: number; count: number }>
>();
const identityCleanup = setInterval(() => {
  for (const [id, owner] of identities)
    if (
      !rooms.isOnline(id) &&
      !rooms.membership.has(id) &&
      Date.now() - owner.seenAt >= EMPTY_ROOM_MS
    ) {
      identities.delete(id);
      rateBuckets.delete(id);
    }
}, 60_000);
identityCleanup.unref();
io.use((socket, next) => {
  if (closing) return next(new Error('Máy chủ đang khởi động lại.'));
  const result = authenticate(socket.handshake.auth, env.ACCESS_CODE);
  if (result.error) return next(new Error(result.error));
  const { playerId, sessionToken, nickname, avatar } = result.identity;
  const known = identities.get(playerId);
  if (known && known.token !== sessionToken)
    return next(
      new Error(
        'Thông tin danh tính không khớp. Dùng lại trình duyệt đã vào phòng nhé.',
      ),
    );
  identities.set(playerId, { token: sessionToken, seenAt: Date.now() });
  socket.data.player = { id: playerId, nickname, avatar };
  next();
});
type GameSocket = Socket<
  ClientEvents,
  ServerEvents,
  Record<string, never>,
  SocketData
>;
function handle<T>(
  socket: GameSocket,
  schema: z.ZodType<T>,
  payload: unknown,
  ack: Ack | undefined,
  operation: (data: T) => string | void,
  chat = false,
) {
  try {
    if (closing)
      throw new RoomError('SERVER_RESTARTING', 'Máy chủ đang khởi động lại.');
    const buckets = rateBuckets.get(socket.data.player.id) ?? new Map();
    rateBuckets.set(socket.data.player.id, buckets);
    if (
      !allowEvent(buckets, 'all', 12) ||
      (chat && !allowEvent(buckets, 'chat', 3))
    )
      throw new RoomError(
        'RATE_LIMITED',
        chat
          ? 'Nhắn chậm một chút nhé, tối đa 3 tin mỗi giây.'
          : 'Bấm chậm một chút nhé.',
      );
    const parsed = schema.safeParse(payload);
    if (!parsed.success)
      throw new RoomError('INVALID_PAYLOAD', 'Thông tin gửi lên chưa hợp lệ.');
    const code = operation(parsed.data);
    if (typeof ack === 'function') ack({ ok: true, ...(code ? { code } : {}) });
  } catch (error) {
    const detail =
      error instanceof RoomError
        ? { code: error.code, message: error.message }
        : {
            code: 'SERVER_ERROR',
            message: 'Có chút trục trặc. Bạn thử lại nhé.',
          };
    if (!(error instanceof RoomError))
      console.error('GameHub operation failed');
    socket.emit('error', detail);
    if (typeof ack === 'function') ack({ ok: false, error: detail });
  }
}
io.on('connection', (socket) => {
  const player = socket.data.player;
  rooms.connect(player, socket.id);
  socket.on('room:create', (payload, ack) =>
    handle(socket, createSchema, payload, ack, (data) =>
      rooms.create(player, data.gameId),
    ),
  );
  socket.on('room:join', (payload, ack) =>
    handle(socket, codeSchema, payload, ack, (data) =>
      rooms.join(player, data.code),
    ),
  );
  socket.on('room:spectate', (payload, ack) =>
    handle(socket, codeSchema, payload, ack, (data) =>
      rooms.spectate(player, data.code),
    ),
  );
  socket.on('room:seat-request', (payload, ack) =>
    handle(socket, emptySchema, payload, ack, () =>
      rooms.requestSeat(player.id),
    ),
  );
  socket.on('room:take-seat', (payload, ack) =>
    handle(socket, emptySchema, payload, ack, () => rooms.takeSeat(player.id)),
  );
  socket.on('room:seat-request-response', (payload, ack) =>
    handle(socket, seatRequestResponseSchema, payload, ack, (data) =>
      rooms.answerSeatRequest(player.id, data.spectatorId, data.accept),
    ),
  );
  socket.on('room:seat-invite', (payload, ack) =>
    handle(socket, spectatorIdSchema, payload, ack, (data) =>
      rooms.inviteSpectator(player.id, data.spectatorId),
    ),
  );
  socket.on('room:seat-invite-response', (payload, ack) =>
    handle(socket, seatInviteResponseSchema, payload, ack, (data) =>
      rooms.answerSeatInvite(player.id, data.accept),
    ),
  );
  socket.on('room:rejoin', (payload, ack) =>
    handle(socket, codeSchema, payload, ack, (data) =>
      rooms.join(player, data.code, true),
    ),
  );
  socket.on('room:leave', (payload, ack) =>
    handle(socket, emptySchema, payload, ack, () => rooms.leave(player.id)),
  );
  socket.on('room:start', (payload, ack) =>
    handle(socket, emptySchema, payload, ack, () =>
      rooms.start(player.id, false),
    ),
  );
  socket.on('room:rematch', (payload, ack) =>
    handle(socket, emptySchema, payload, ack, () =>
      rooms.start(player.id, true),
    ),
  );
  socket.on('room:restart', (payload, ack) =>
    handle(socket, emptySchema, payload, ack, () =>
      rooms.restartPoker(player.id),
    ),
  );
  socket.on('game:action', (payload, ack) =>
    handle(socket, actionSchema, payload, ack, (data) =>
      rooms.action(player.id, data),
    ),
  );
  socket.on('chat:send', (payload, ack) =>
    handle(
      socket,
      chatSchema,
      payload,
      ack,
      (data) => rooms.chat(player.id, data.text).room.code,
      true,
    ),
  );
  socket.on('disconnect', () => rooms.disconnect(player.id, socket.id));
});
function shutdown() {
  if (closing) return;
  closing = true;
  console.info('GameHub: shutting down');
  io.emit(
    'server:restarting',
    'Máy chủ đang khởi động lại. Phòng hiện tại sẽ đóng, bạn chờ một chút nhé!',
  );
  rooms.dispose();
  clearInterval(identityCleanup);
  setTimeout(() => io.close(() => process.exit(0)), 500);
  setTimeout(() => process.exit(1), 8000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
http.listen(env.PORT, '0.0.0.0', () =>
  console.info(`GameHub listening on port ${env.PORT}`),
);
