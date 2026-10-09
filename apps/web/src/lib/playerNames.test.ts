import { describe, expect, it } from 'vitest';
import type { RoomView } from '@gamehub/shared';
import { createPlayerLabels } from './playerNames';

function room(
  people: { id: string; nickname: string }[],
  viewers: { id: string; nickname: string }[] = [],
): Pick<RoomView, 'players' | 'spectators' | 'chat'> {
  return {
    players: people.map((person) => ({
      ...person,
      avatar: 0,
      online: true,
      reconnectUntil: null,
    })),
    spectators: viewers.map((person) => ({
      ...person,
      avatar: 0,
      online: true,
      reconnectUntil: null,
      requestedSeat: false,
      invitedBy: null,
    })),
    chat: [],
  };
}
describe('room player labels', () => {
  it('distinguishes duplicate names across players and spectators without changing unique names', () => {
    const people = [
      { id: 'a3f20000-0000-0000-0000-000000000001', nickname: 'Bố' },
      { id: 'f9410000-0000-0000-0000-000000000002', nickname: ' bố ' },
      { id: '12340000-0000-0000-0000-000000000003', nickname: 'Lan' },
    ];
    const viewer = {
      id: 'c7890000-0000-0000-0000-000000000004',
      nickname: 'Bố',
    };
    const labels = createPlayerLabels(room(people, [viewer]));
    expect(labels.nameFor(people[0]!.id, 'Bố')).toBe('Bố (1)');
    expect(labels.nameFor(viewer.id, viewer.nickname)).toBe('Bố (2)');
    expect(labels.codeFor(people[2]!.id, 'Lan')).toBeUndefined();
    const moved = createPlayerLabels(room([viewer, ...people].reverse()));
    expect(moved.codeFor(viewer.id, viewer.nickname)).toBe(
      labels.codeFor(viewer.id, viewer.nickname),
    );
  });
  it('numbers each duplicated name separately and leaves unique names unchanged', () => {
    const a = { id: 'abcd1000-0000-0000-0000-000000000001', nickname: 'An' };
    const b = { id: 'abcd2000-0000-0000-0000-000000000002', nickname: 'An' };
    const c = { id: 'c', nickname: 'Bố' };
    const d = { id: 'd', nickname: 'Bố' };
    const e = { id: 'e', nickname: 'Lan' };
    const labels = createPlayerLabels(room([a, b, c, d, e]));
    expect(labels.nameFor(a.id, a.nickname)).toBe('An (1)');
    expect(labels.nameFor(b.id, b.nickname)).toBe('An (2)');
    expect(labels.nameFor(c.id, c.nickname)).toBe('Bố (1)');
    expect(labels.nameFor(d.id, d.nickname)).toBe('Bố (2)');
    expect(labels.nameFor(e.id, e.nickname)).toBe('Lan');
  });
  it('keeps departed chat senders distinct and does not treat multiple messages from one person as duplicates', () => {
    const person = {
      id: 'a3f20000-0000-0000-0000-000000000001',
      nickname: 'Bố',
    };
    const state = room([person]);
    state.chat = [1, 2].map((index) => ({
      id: String(index),
      playerId: person.id,
      nickname: 'Bố',
      text: 'Chào',
      sentAt: index,
    }));
    expect(createPlayerLabels(state).codeFor(person.id, 'Bố')).toBeUndefined();
    state.chat.push({
      id: '3',
      playerId: 'f9410000-0000-0000-0000-000000000002',
      nickname: 'Bố',
      text: 'Chào',
      sentAt: 3,
    });
    expect(createPlayerLabels(state).nameFor(person.id, 'Bố')).toBe('Bố (1)');
    expect(
      createPlayerLabels(state).codeFor(state.chat[2]!.playerId, 'Bố'),
    ).toBe('2');
  });
});
