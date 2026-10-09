import { expect, it, vi } from 'vitest';
import {
  actionSchema,
  chatSchema,
  codeSchema,
  createSchema,
  emptySchema,
  allowEvent,
} from './events.js';
it('validates every client action and rejects authority overrides', () => {
  expect(
    actionSchema.safeParse({
      type: 'place',
      row: 0,
      col: 0,
      playerId: 'victim',
    }).success,
  ).toBe(false);
  expect(
    actionSchema.safeParse({ type: 'place', row: 15, col: 0 }).success,
  ).toBe(false);
  expect(
    actionSchema.safeParse({ type: 'place', row: 1.2, col: 0 }).success,
  ).toBe(false);
  expect(chatSchema.safeParse({ text: ' '.repeat(4) }).success).toBe(false);
  expect(chatSchema.safeParse({ text: 'x'.repeat(301) }).success).toBe(false);
  expect(codeSchema.parse({ code: ' ab2c ' }).code).toBe('AB2C');
  expect(codeSchema.safeParse({ code: 'IO01' }).success).toBe(false);
  expect(
    createSchema.safeParse({ gameId: 'caro', maxPlayers: 3 }).success,
  ).toBe(false);
  expect(emptySchema.safeParse({ isHost: true }).success).toBe(false);
});
it('limits chat per second and resets the window', () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const buckets = new Map();
  expect([1, 2, 3, 4].map(() => allowEvent(buckets, 'chat', 3))).toEqual([
    true,
    true,
    true,
    false,
  ]);
  vi.advanceTimersByTime(1000);
  expect(allowEvent(buckets, 'chat', 3)).toBe(true);
  vi.useRealTimers();
});
