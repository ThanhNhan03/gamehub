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
  PokerView,
  Result,
} from '../packages/shared/src/index.js';

const probe = createServer();
await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
const address = probe.address();
assert(address && typeof address !== 'string');
const port = address.port;
await new Promise<void>((resolve) => probe.close(() => resolve()));
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['apps/server/dist/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port), ACCESS_CODE: '', CORS_ORIGIN: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
server.stderr.on('data', (chunk) => (output += String(chunk)));
const ready = new Promise<void>((resolve, reject) => {
  const timer = setTimeout(
    () => reject(new Error(`Server did not start: ${output}`)),
    10_000,
  );
  server.once('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Server exited ${code}: ${output}`));
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
  room: RoomView | null;
  game: PokerView | null;
}
const clients: Client[] = [];
function client(nickname: string): Client {
  const id = randomUUID();
  const socket: Socket<ServerEvents, ClientEvents> = io(origin, {
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    transports: ['websocket'],
    extraHeaders: { Origin: origin },
    auth: {
      playerId: id,
      sessionToken: randomUUID(),
      nickname,
      avatar: 0,
      accessCode: '',
    },
  });
  const entry: Client = { socket, id, room: null, game: null };
  socket.on('room:state', (room) => (entry.room = room));
  socket.on('game:view', (game) => {
    entry.game = game?.gameId === 'poker' ? game : null;
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
async function until(predicate: () => boolean, timeout = 5000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout)
      throw new Error('Poker state wait timed out');
    await delay(20);
  }
}
function signature(game: PokerView | null) {
  if (!game) return '';
  return JSON.stringify({
    handNumber: game.handNumber,
    street: game.street,
    turnId: game.turnId,
    pot: game.pot,
    stacks: game.players.map((player) => [
      player.id,
      player.chips,
      player.roundBet,
      player.folded,
    ]),
  });
}

try {
  await ready;
  assert.equal((await fetch(`${origin}/health`)).status, 200);
  const a = client('An');
  const b = client('Bình');
  const c = client('Chi');
  const spectator = client('Xem');
  await Promise.all([a, b, c, spectator].map(connect));
  const created = await ok(a, 'room:create', {
    gameId: 'poker',
    maxPlayers: 8,
  });
  const code = created.code;
  assert(code);
  await ok(b, 'room:join', { code });
  await ok(c, 'room:join', { code });
  await ok(spectator, 'room:spectate', { code });
  await until(() => a.room?.gameId === 'poker' && a.room.players.length === 3);
  assert.equal(a.room?.maxPlayers, 8);
  await ok(a, 'room:start', {});
  await until(() => !!a.game && !!b.game && !!c.game && !!spectator.game);
  assert.equal(
    a.game?.players.find((player) => player.id === a.id)?.holeCards.length,
    2,
  );
  assert.equal(
    a.game?.players.find((player) => player.id === b.id)?.holeCards.length,
    0,
  );
  assert.equal(
    b.game?.players.find((player) => player.id === b.id)?.holeCards.length,
    2,
  );
  assert(
    spectator.game?.players.every((player) => player.holeCards.length === 0),
  );

  await ok(spectator, 'chat:send', { text: 'Mình đang xem nhé!' });
  await until(
    () =>
      a.room?.chat.some((message) => message.text === 'Mình đang xem nhé!') ??
      false,
  );
  await ok(spectator, 'room:seat-request', {});
  await until(
    () =>
      a.room?.spectators.some(
        (viewer) => viewer.id === spectator.id && viewer.requestedSeat,
      ) ?? false,
  );

  const seats = new Map([a, b, c].map((entry) => [entry.id, entry]));
  for (let step = 0; step < 8 && a.game?.street !== 'between-hands'; step++) {
    const current = a.game;
    assert(current?.turnId);
    const actor = seats.get(current.turnId);
    assert(actor);
    const before = signature(current);
    await ok(actor, 'game:action', { type: 'fold' });
    await until(() => signature(a.game) !== before);
  }
  await until(() => a.game?.street === 'between-hands');
  assert.equal(a.game?.payouts.length, 1);
  assert.equal(a.game?.payouts[0]?.playerId, c.id);
  assert.equal(
    a.game?.players.reduce((sum, player) => sum + player.chips, 0),
    3000,
  );

  await ok(a, 'room:rematch', {});
  await until(() => a.game?.handNumber === 2 && a.game.street === 'preflop');
  assert.equal(
    a.game?.players.find((player) => player.id === c.id)?.chips,
    1000,
  );
  assert.equal(
    a.game!.players.reduce((sum, player) => sum + player.chips, 0) +
      a.game!.pot,
    3000,
  );
  const deniedRestart = await send(b, 'room:restart', {});
  assert(!deniedRestart.ok && deniedRestart.error.code === 'HOST_ONLY');
  await ok(spectator, 'room:take-seat', {});
  await until(
    () =>
      a.room?.players.some(
        (player) => player.id === spectator.id && !!player.waitingForNextHand,
      ) ?? false,
  );
  assert(!spectator.game?.players.some((player) => player.id === spectator.id));
  const deniedAction = await send(spectator, 'game:action', { type: 'all-in' });
  assert(!deniedAction.ok && deniedAction.error.code === 'WAITING_NEXT_HAND');
  await ok(b, 'room:leave', {});
  await until(() => !a.room?.players.some((player) => player.id === b.id));
  await until(
    () => !!a.game?.players.find((player) => player.id === b.id)?.folded,
  );
  for (let step = 0; step < 8 && a.game?.street !== 'between-hands'; step++) {
    const current = a.game;
    assert(current?.turnId);
    const actor = seats.get(current.turnId);
    assert(actor);
    const before = signature(current);
    await ok(actor, 'game:action', { type: 'fold' });
    await until(() => signature(a.game) !== before);
  }
  await ok(a, 'room:rematch', {});
  await until(
    () => a.game?.handNumber === 3 && spectator.game?.handNumber === 3,
  );
  assert(!a.game?.players.some((player) => player.id === b.id));
  assert.equal(
    spectator.game?.players.find((player) => player.id === spectator.id)
      ?.holeCards.length,
    2,
  );
  assert(
    a.game?.players.find((player) => player.id === spectator.id)?.holeCards
      .length === 0,
  );
  await ok(a, 'room:restart', {});
  await until(() => a.game?.handNumber === 4);
  assert.equal(a.game?.street, 'preflop');
  assert.equal(
    a.game?.players.reduce(
      (total, player) => total + player.chips + player.contribution,
      0,
    ),
    3000,
  );
  assert(a.room?.chat.some((message) => message.text === 'Mình đang xem nhé!'));
  console.info(
    'PASS: Poker privacy/chat, chip-preserving next hand, live spectator seat, departure cleanup, host-only live reset',
  );
} finally {
  clients.forEach((entry) => entry.socket.disconnect());
  server.kill();
}
