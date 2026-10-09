import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomStore } from './RoomStore.js';
const a = { id: 'a', nickname: 'An', avatar: 0 };
const b = { id: 'b', nickname: 'Bình', avatar: 1 };
const c = { id: 'c', nickname: 'Chi', avatar: 2 };
let store: RoomStore;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  store = new RoomStore(vi.fn(), vi.fn(), vi.fn());
  store.connect(a, 'a1');
  store.connect(b, 'b1');
  store.connect(c, 'c1');
});
afterEach(() => {
  store.dispose();
  vi.useRealTimers();
});
function table() {
  const code = store.create(a);
  store.join(b, code);
  store.start(a.id, false);
  return store.rooms.get(code)!;
}
describe('rooms and reconnect', () => {
  it('expires a late reconnect even when the scheduled timer has not run yet', () => {
    const room = table();
    store.disconnect('b', 'b1');
    vi.setSystemTime(60_001);
    store.connect(b, 'b2');
    expect(room.game?.reason).toBe('absent');
    expect(room.game?.winnerId).toBe('a');
    expect(store.membership.has('b')).toBe(false);
    expect(room.players.some((p) => p.id === 'b')).toBe(false);
  });
  it('requires two online people and only lets the host start', () => {
    const code = store.create(a);
    expect(() => store.start(a.id, false)).toThrow('hai đồng nghiệp');
    store.join(b, code);
    expect(() => store.start(b.id, false)).toThrow('Chủ phòng');
    expect(() => store.join(c, code)).toThrow('đủ hai người');
    store.disconnect('b', 'b1');
    expect(() => store.start(a.id, false)).toThrow('hai đồng nghiệp');
    store.connect(b, 'b2');
    store.start(a.id, false);
    expect(store.rooms.get(code)?.game?.status).toBe('playing');
  });
  it('counts duplicate tabs as one person; disconnecting one tab keeps the seat online', () => {
    const room = table();
    store.connect(b, 'b2');
    store.disconnect('b', 'b1');
    expect(room.players[1]?.online).toBe(true);
    expect(room.deadline).toBe(30_000);
    expect(store.connections.size).toBe(3);
  });
  it('pauses the turn, restores the same board and resumes remaining time within 60 seconds', () => {
    const room = table();
    store.action('a', { type: 'place', row: 0, col: 0 });
    vi.advanceTimersByTime(10_000);
    store.disconnect('b', 'b1');
    expect(room.deadline).toBeNull();
    expect(room.players[1]?.reconnectUntil).toBe(70_000);
    expect(() => store.action('b', { type: 'place', row: 0, col: 1 })).toThrow(
      'Chờ đồng nghiệp',
    );
    vi.advanceTimersByTime(45_000);
    expect(room.game?.status).toBe('playing');
    store.connect(b, 'b2');
    store.join(b, room.code, true);
    expect(room.game?.board[0]).toBe('X');
    expect(room.game?.turnId).toBe('b');
    expect(room.deadline).toBe(75_000);
    vi.advanceTimersByTime(20_000);
    expect(room.game?.winnerId).toBe('a');
    expect(room.game?.reason).toBe('timeout');
  });
  it('awards the opponent after 60 seconds and prevents reviving an expired seat', () => {
    const room = table();
    store.disconnect('b', 'b1');
    vi.advanceTimersByTime(59_999);
    expect(room.game?.status).toBe('playing');
    vi.advanceTimersByTime(1);
    expect(room.game?.winnerId).toBe('a');
    expect(room.game?.reason).toBe('absent');
    expect(store.membership.has('b')).toBe(false);
    expect(() => store.join(b, room.code, true)).toThrow('hết thời gian giữ');
    store.connect(b, 'b2');
    store.join(b, room.code);
    expect(room.game?.status).toBe('finished');
    store.start('a', true);
    expect(room.game?.players[0]?.id).toBe('b');
    expect(room.game?.board.every((v) => v === null)).toBe(true);
  });
  it('transfers host when the host leaves or exceeds the reconnect grace', () => {
    const code = store.create(a);
    store.join(b, code);
    store.leave('a');
    expect(store.rooms.get(code)?.hostId).toBe('b');
    store.join(a, code);
    store.disconnect('b', 'b1');
    vi.advanceTimersByTime(60_000);
    expect(store.rooms.get(code)?.hostId).toBe('a');
  });
  it('ends a game when a player deliberately leaves', () => {
    const room = table();
    store.leave('a');
    expect(room.game?.winnerId).toBe('b');
    expect(room.hostId).toBe('b');
  });
  it('expires empty rooms after ten minutes, and preserves chat without executing markup', () => {
    const code = store.create(a);
    store.chat('a', '<script>alert(1)</script>');
    expect(store.rooms.get(code)?.chat[0]?.text).toBe(
      '<script>alert(1)</script>',
    );
    store.leave('a');
    vi.advanceTimersByTime(599_999);
    expect(store.rooms.has(code)).toBe(true);
    vi.advanceTimersByTime(1);
    expect(store.rooms.has(code)).toBe(false);
  });
});

describe('Poker seat changes and new games', () => {
  function pokerRoom() {
    const code = store.create(a, 'poker');
    store.join(b, code);
    store.start(a.id, false);
    return store.rooms.get(code)!;
  }
  it('lets only the host reset a live game, resetting stacks and its turn clock while preserving chat', () => {
    const room = pokerRoom();
    store.chat('b', 'Ván mới nhé');
    expect(() => store.restartPoker('b')).toThrow('Chỉ chủ phòng');
    vi.advanceTimersByTime(5000);
    store.restartPoker('a');
    expect(room.game?.gameId).toBe('poker');
    if (room.game?.gameId !== 'poker') throw new Error('Expected Poker');
    expect(room.game.handNumber).toBe(2);
    expect(room.game.communityCards).toEqual([]);
    expect(room.game.payouts).toEqual([]);
    expect(room.game.pot).toBe(30);
    expect(
      room.game.players.reduce(
        (total, player) => total + player.chips + player.contribution,
        0,
      ),
    ).toBe(2000);
    expect(room.deadline).toBe(35_000);
    expect(room.chat[0]?.text).toBe('Ván mới nhé');
    vi.advanceTimersByTime(25_000);
    expect(room.game.street).toBe('preflop');
  });
  it('reserves a spectator seat during play and deals them in only on the next hand', () => {
    const room = pokerRoom();
    store.spectate(c, room.code);
    store.takeSeat('c');
    expect(
      room.players.find((player) => player.id === 'c')?.waitingForNextHand,
    ).toBe(true);
    expect(room.spectators.some((player) => player.id === 'c')).toBe(false);
    expect(room.game?.players.some((player) => player.id === 'c')).toBe(false);
    expect(() => store.action('c', { type: 'all-in' })).toThrow(
      'ván tiếp theo',
    );
    store.action('a', { type: 'fold' });
    store.start('a', true);
    if (room.game?.gameId !== 'poker') throw new Error('Expected Poker');
    expect(
      room.game.players.find((player) => player.id === 'c')?.holeCards,
    ).toHaveLength(2);
    expect(
      room.players.find((player) => player.id === 'c')?.waitingForNextHand,
    ).toBe(false);
    const winner = room.game.players.find((player) => player.id === 'b')!;
    expect(winner.chips + winner.contribution).toBe(1010);
  });
  it('allows any seated player to invite a spectator during a hand and includes waiting seats on restart', () => {
    const room = pokerRoom();
    store.spectate(c, room.code);
    store.inviteSpectator('b', 'c');
    store.answerSeatInvite('c', true);
    expect(
      room.players.find((player) => player.id === 'c')?.waitingForNextHand,
    ).toBe(true);
    store.restartPoker('a');
    if (room.game?.gameId !== 'poker') throw new Error('Expected Poker');
    expect(room.game.players).toHaveLength(3);
    expect(
      room.game.players.find((player) => player.id === 'c')?.holeCards,
    ).toHaveLength(2);
    expect(room.players.every((player) => !player.waitingForNextHand)).toBe(
      true,
    );
  });
  it('does not let competing spectators take the same last seat', () => {
    const room = pokerRoom();
    for (let index = 0; index < 5; index++) {
      const player = { id: `seat${index}`, nickname: 'Đồng đội', avatar: 0 };
      store.connect(player, player.id);
      store.join(player, room.code);
    }
    const d = { id: 'd', nickname: 'Dũng', avatar: 3 };
    store.connect(d, 'd1');
    store.spectate(c, room.code);
    store.spectate(d, room.code);
    store.takeSeat('c');
    expect(() => store.takeSeat('d')).toThrow('Ghế chơi');
    expect(room.players).toHaveLength(8);
    expect(room.spectators.map((player) => player.id)).toEqual(['d']);
  });
  it('removes departed players from room seats and the next hand while preserving surviving stacks', () => {
    const code = store.create(a, 'poker');
    store.join(b, code);
    store.join(c, code);
    store.start('a', false);
    const room = store.rooms.get(code)!;
    store.leave('b');
    expect(room.players.map((player) => player.id)).toEqual(['a', 'c']);
    if (room.game?.gameId !== 'poker') throw new Error('Expected Poker');
    while (room.game.street !== 'between-hands')
      store.action(room.game.turnId!, { type: 'fold' });
    store.start('a', true);
    expect(room.game.players.map((player) => player.id)).toEqual(['a', 'c']);
    expect(
      room.game.players.reduce(
        (total, player) => total + player.chips + player.contribution,
        room.game.deadPot,
      ),
    ).toBe(3000);
  });
  it('keeps live Caro seats closed and does not allow Poker restart on Caro', () => {
    const room = table();
    store.spectate(c, room.code);
    expect(() => store.takeSeat('c')).toThrow('duyệt yêu cầu');
    expect(() => store.restartPoker('a')).toThrow('dành cho Poker');
    expect(() => store.inviteSpectator('a', 'c')).toThrow('ghế trống');
  });
  it('queues someone who leaves and returns under the same identity, without reviving their current hand', () => {
    const code = store.create(a, 'poker');
    store.join(b, code);
    store.join(c, code);
    store.start('a', false);
    const room = store.rooms.get(code)!;
    store.leave('b');
    store.spectate(b, code);
    store.takeSeat('b');
    expect(() => store.action('b', { type: 'check' })).toThrow('ván tiếp theo');
    if (room.game?.gameId !== 'poker') throw new Error('Expected Poker');
    while (room.game.street !== 'between-hands')
      store.action(room.game.turnId!, { type: 'fold' });
    store.start('a', true);
    const returned = room.game.players.find((player) => player.id === 'b')!;
    expect(returned.holeCards).toHaveLength(2);
    expect(returned.chips + returned.contribution).toBe(1000);
  });
});
