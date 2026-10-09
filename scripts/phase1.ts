// Isolated development clients only. This script is never bundled into the product.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { io, type Socket } from 'socket.io-client';
import type {
  ClientEvents,
  ServerEvents,
  RoomView,
  CaroView,
  Result,
} from '../packages/shared/src/index.js';

const long = process.argv.includes('--long');
const portProbe = createServer();
await new Promise<void>((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
const address = portProbe.address();
assert(address && typeof address !== 'string');
const port = address.port;
await new Promise<void>((resolve) => portProbe.close(() => resolve()));
const origin = `http://127.0.0.1:${port}`;
const officeCode = randomUUID();
const server = spawn(process.execPath, ['apps/server/dist/index.js'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    ACCESS_CODE: officeCode,
    CORS_ORIGIN: '',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
server.stderr.on('data', (chunk) => {
  serverOutput += String(chunk);
});
const ready = new Promise<void>((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error(`Server did not start: ${serverOutput}`)),
    10_000,
  );
  server.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Server exited ${code}: ${serverOutput}`));
  });
  server.stdout.on('data', (chunk) => {
    if (String(chunk).includes('GameHub listening')) {
      clearTimeout(timer);
      resolve();
    }
  });
});
interface Client {
  socket: Socket<ServerEvents, ClientEvents>;
  id: string;
  token: string;
  room: RoomView | null;
  game: CaroView | null;
}
const clients: Client[] = [];
function client(
  nickname: string,
  identity?: { id: string; token: string },
  accessCode: string = officeCode,
): Client {
  const id = identity?.id ?? randomUUID();
  const token = identity?.token ?? randomUUID();
  const socket: Socket<ServerEvents, ClientEvents> = io(origin, {
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    transports: ['websocket'],
    extraHeaders: { Origin: origin },
    auth: {
      playerId: id,
      sessionToken: token,
      nickname,
      avatar: 0,
      accessCode,
    },
  });
  const entry: Client = { socket, id, token, room: null, game: null };
  socket.on('room:state', (room) => {
    entry.room = room;
  });
  socket.on('game:view', (game) => {
    entry.game = game;
  });
  clients.push(entry);
  return entry;
}
function connect(entry: Client) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connect timeout')), 5000);
    entry.socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    entry.socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    entry.socket.connect();
  });
}
async function send(
  entry: Client,
  event: keyof ClientEvents,
  payload: unknown,
): Promise<Result> {
  return (
    entry.socket.timeout(5000).emitWithAck as (
      name: keyof ClientEvents,
      data: unknown,
    ) => Promise<Result>
  )(event, payload);
}
async function ok(entry: Client, event: keyof ClientEvents, payload: unknown) {
  const result = await send(entry, event, payload);
  assert(result.ok, `${event}: ${!result.ok ? result.error.message : ''}`);
  return result;
}
async function denied(
  entry: Client,
  event: keyof ClientEvents,
  payload: unknown,
  expected: string,
) {
  const result = await send(entry, event, payload);
  assert(!result.ok);
  assert.equal(result.error.code, expected);
}
async function until(predicate: () => boolean, timeout = 4000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) throw new Error('State wait timed out');
    await delay(25);
  }
}
try {
  await ready;
  assert.equal((await fetch(`${origin}/health`)).status, 200);
  await assert.rejects(
    connect(client('Wrong office', undefined, 'wrong-office-code')),
    /Mã văn phòng/,
  );
  const a = client('An');
  let b = client('Bình');
  const c = client('Chi');
  await Promise.all([connect(a), connect(b), connect(c)]);
  await assert.rejects(
    connect(client('Impersonator', { id: a.id, token: randomUUID() })),
    /danh tính/,
  );
  const created = await ok(a, 'room:create', { gameId: 'caro', maxPlayers: 2 });
  const code = created.code;
  assert(code && /^[A-HJKMNP-Z2-9]{4}$/.test(code));
  assert.equal((await fetch(`${origin}/room/${code}`)).status, 200);
  await denied(a, 'room:start', {}, 'NEED_PLAYERS');
  await ok(b, 'room:join', { code });
  await denied(c, 'room:join', { code }, 'ROOM_FULL');
  await denied(b, 'room:start', {}, 'HOST_ONLY');
  await denied(
    c,
    'game:action',
    { type: 'place', row: 0, col: 0 },
    'NOT_IN_ROOM',
  );
  await ok(a, 'room:start', {});
  await until(() => !!a.game && !!b.game);
  assert.equal(a.game?.yourMark, 'X');
  assert.equal(b.game?.yourMark, 'O');
  assert(!JSON.stringify(a.room).includes(a.token));
  assert(!JSON.stringify(b.game).includes(b.token));
  await denied(
    b,
    'game:action',
    { type: 'place', row: 0, col: 0 },
    'INVALID_MOVE',
  );
  await denied(
    a,
    'game:action',
    { type: 'place', row: -1, col: 0 },
    'INVALID_PAYLOAD',
  );
  await denied(
    a,
    'game:action',
    { type: 'place', row: 0, col: 0, playerId: b.id },
    'INVALID_PAYLOAD',
  );
  await delay(1100);
  await ok(a, 'chat:send', { text: '<b>Không chạy HTML</b>' });
  await ok(a, 'chat:send', { text: 'Chào đồng đội' });
  await ok(a, 'chat:send', { text: 'Làm một ván' });
  await denied(a, 'chat:send', { text: 'Spam thứ tư' }, 'RATE_LIMITED');
  await until(() => b.room?.chat.length === 3);
  assert.equal(b.room?.chat[0]?.text, '<b>Không chạy HTML</b>');
  await delay(1100);
  for (let col = 0; col < 5; col++) {
    await ok(a, 'game:action', { type: 'place', row: 7, col });
    if (col === 0)
      await denied(
        b,
        'game:action',
        { type: 'place', row: 7, col: 0 },
        'INVALID_MOVE',
      );
    if (col < 4) await ok(b, 'game:action', { type: 'place', row: 8, col });
  }
  await until(
    () => a.game?.status === 'finished' && b.game?.status === 'finished',
  );
  assert.equal(a.game?.winnerId, a.id);
  assert.equal(b.game?.winningLine.length, 5);
  console.info(
    'PASS: access code, seat ownership, room permissions, payload validation, chat rate limit, complete two-client Caro match',
  );
  await delay(1100);
  await ok(a, 'room:rematch', {});
  await until(() => b.game?.status === 'playing' && b.game?.yourMark === 'X');
  await ok(b, 'game:action', { type: 'place', row: 0, col: 0 });
  await until(() => a.game?.board[0] === 'X');
  const before = JSON.stringify(b.game?.board);
  const identity = { id: a.id, token: a.token };
  a.socket.disconnect();
  await until(
    () => b.room?.players.some((p) => p.id === a.id && !p.online) === true,
  );
  assert.equal(b.room?.deadline, null);
  await denied(
    b,
    'game:action',
    { type: 'place', row: 0, col: 1 },
    'WAITING_RECONNECT',
  );
  await delay(1500);
  const restored = client('An', identity);
  await connect(restored);
  await ok(restored, 'room:rejoin', { code });
  await until(
    () =>
      restored.game?.board[0] === 'X' &&
      b.room?.players.every((p) => p.online) === true,
  );
  assert.equal(JSON.stringify(restored.game?.board), before);
  assert.equal(restored.game?.turnId, a.id);
  assert.equal(restored.room?.hostId, a.id);
  assert((restored.room?.deadline ?? 0) > Date.now());
  console.info(
    'PASS: tab-close simulation, 60-second seat reservation, paused clock, same identity/room/board after reconnect, alternating rematch',
  );
  await ok(restored, 'game:action', { type: 'place', row: 1, col: 0 });
  if (long) {
    const absentIdentity = { id: b.id, token: b.token };
    b.socket.disconnect();
    await until(() => restored.room?.deadline === null);
    console.info('Waiting through the real 60-second reconnect window...');
    await until(() => restored.game?.status === 'finished', 65_000);
    assert.equal(restored.game?.winnerId, restored.id);
    assert.equal(restored.game?.reason, 'absent');
    b = client('Bình', absentIdentity);
    await connect(b);
    await denied(b, 'room:rejoin', { code }, 'SEAT_EXPIRED');
    await ok(b, 'room:join', { code });
    assert.equal(restored.game?.status, 'finished');
    await ok(restored, 'room:rematch', {});
    console.info(
      'PASS: actual 60-second absence awards the opponent; expired reconnect cannot revive the old match',
    );
  }
  await ok(restored, 'room:leave', {});
  await until(() => b.room?.hostId === b.id && b.game?.winnerId === b.id);
  assert.equal(b.game?.winnerId, b.id);
  console.info(
    'PASS: host transfer, voluntary departure forfeits, production HTTP/SPA/WebSocket',
  );
} finally {
  clients.forEach((entry) => entry.socket.disconnect());
  server.kill();
}
