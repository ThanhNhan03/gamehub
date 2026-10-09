// Development-only clients; never imported by the server or included in web output.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import type {
  ServerEvents,
  ClientEvents,
} from '../packages/shared/src/types.js';

const origin = process.env.TEST_URL ?? 'http://localhost:3001';
const sockets: Socket<ServerEvents, ClientEvents>[] = [];
function client(playerId = randomUUID()) {
  const socket: Socket<ServerEvents, ClientEvents> = io(origin, {
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    timeout: 4000,
    transports: ['websocket'],
    auth: {
      playerId,
      nickname: 'Smoke test',
      avatar: 0,
      accessCode: process.env.TEST_ACCESS_CODE ?? '',
    },
  });
  sockets.push(socket);
  return socket;
}
function presence(
  socket: Socket<ServerEvents, ClientEvents>,
  expected: number,
) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('lobby:state', listener);
      reject(new Error(`Expected ${expected} connected identities`));
    }, 5000);
    function listener({ online }: { online: number }) {
      if (online === expected) {
        clearTimeout(timer);
        socket.off('lobby:state', listener);
        resolve();
      }
    }
    socket.on('lobby:state', listener);
  });
}
try {
  const health = await fetch(`${origin}/health`);
  assert.equal(health.status, 200);
  assert.equal(((await health.json()) as { status: string }).status, 'ok');
  for (const route of ['/', '/design-system']) {
    const response = await fetch(`${origin}${route}`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Góc Chơi Văn Phòng/);
  }
  const first = client();
  const firstPresence = presence(first, 1);
  first.connect();
  await firstPresence;
  const second = client();
  const secondPresence = presence(first, 2);
  second.connect();
  await secondPresence;
  const duplicate = client((first.auth as { playerId: string }).playerId);
  const deduplicated = presence(first, 2);
  duplicate.connect();
  await deduplicated;
  const afterLeave = presence(first, 1);
  second.disconnect();
  await afterLeave;
  const invalid = client('invalid-id');
  const rejected = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Invalid identity was not rejected')),
      5000,
    );
    invalid.once('connect_error', () => {
      clearTimeout(timer);
      resolve();
    });
    invalid.once('connect', () => {
      clearTimeout(timer);
      reject(new Error('Invalid identity connected'));
    });
  });
  invalid.connect();
  await rejected;
  console.info(
    'PASS: health, SPA routes, WebSocket presence, identity deduplication, disconnect, invalid identity',
  );
} finally {
  sockets.forEach((socket) => socket.disconnect());
}
