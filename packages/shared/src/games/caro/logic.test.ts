import { describe, expect, it } from 'vitest';
import { caro, type CaroState } from './logic.js';
const players = [
  { id: 'a', nickname: 'An', avatar: 0 },
  { id: 'b', nickname: 'Bình', avatar: 1 },
];
describe('Caro', () => {
  it.each([
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ])('wins along direction %j,%j', (dr, dc) => {
    let state = caro.init(players);
    for (let i = 0; i < 5; i++) {
      state = caro.applyAction(state, 'a', {
        type: 'place',
        row: 3 + dr * i,
        col: 7 + dc * i,
      }).state;
      if (i < 4)
        state = caro.applyAction(state, 'b', {
          type: 'place',
          row: 14,
          col: i,
        }).state;
    }
    expect(state.winnerId).toBe('a');
    expect(state.winningLine).toHaveLength(5);
    expect(state.reason).toBe('five');
  });
  it('counts a bridge and overline even when blocked at both ends', () => {
    const state = caro.init(players);
    state.board[3] = 'O';
    state.board[10] = 'O';
    for (const col of [4, 5, 6, 8, 9]) state.board[col] = 'X';
    expect(
      caro.applyAction(state, 'a', { type: 'place', row: 0, col: 7 }).state
        .winningLine,
    ).toHaveLength(6);
  });
  it('does not wrap rows', () => {
    const state = caro.init(players);
    for (const index of [13, 14, 15, 16]) state.board[index] = 'X';
    expect(
      caro.applyAction(state, 'a', { type: 'place', row: 1, col: 2 }).state
        .status,
    ).toBe('playing');
  });
  it('rejects invalid moves without mutation', () => {
    const state = caro.init(players);
    const before = structuredClone(state);
    expect(
      caro.applyAction(state, 'b', { type: 'place', row: 0, col: 0 }).error,
    ).toBeTruthy();
    for (const [row, col] of [
      [-1, 0],
      [15, 0],
      [0, 15],
      [0.5, 0],
      [NaN, 0],
    ])
      expect(
        caro.applyAction(state, 'a', { type: 'place', row: row!, col: col! })
          .error,
      ).toBeTruthy();
    expect(state).toEqual(before);
    const next = caro.applyAction(state, 'a', {
      type: 'place',
      row: 0,
      col: 0,
    }).state;
    expect(
      caro.applyAction(next, 'b', { type: 'place', row: 0, col: 0 }).error,
    ).toBeTruthy();
  });
  it('declares a draw on a full board without five', () => {
    const state = caro.init(players);
    state.turnId = 'b';
    state.board = state.board.map((_, i) =>
      (Math.floor(Math.floor(i / 15) / 2) + (i % 15)) % 2 === 0 ? 'X' : 'O',
    );
    state.board[224] = null;
    const next = caro.applyAction(state, 'b', {
      type: 'place',
      row: 14,
      col: 14,
    }).state;
    expect(next.reason).toBe('draw');
    expect(next.winnerId).toBeNull();
  });
  it('loses on timeout and absence; keeps an existing result', () => {
    const state = caro.init(players);
    expect(caro.onTimeout!(state).winnerId).toBe('b');
    expect(caro.onPlayerAbsent!(state, 'b').winnerId).toBe('a');
    expect(caro.onPlayerAbsent!(state, 'stranger')).toBe(state);
    const finished = caro.onPlayerAbsent!(state, 'a');
    expect(caro.onTimeout!(finished)).toBe(finished);
    expect(
      caro.applyAction(finished, 'a', { type: 'place', row: 0, col: 0 }).error,
    ).toBeTruthy();
  });
  it('returns the correct player mark and rejects duplicate players', () => {
    const state: CaroState = caro.init(players);
    expect(caro.getViewFor(state, 'a').yourMark).toBe('X');
    expect(caro.getViewFor(state, 'b').yourMark).toBe('O');
    expect(caro.getViewFor(state, 'stranger').yourMark).toBeNull();
    expect(() => caro.init([players[0]!, players[0]!])).toThrow();
  });
});
