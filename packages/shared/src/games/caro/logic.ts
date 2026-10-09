import type { GameModule, PlayerInfo } from '../../types.js';
export const CARO_SIZE = 15;
export const TURN_MS = 30_000;
export const RECONNECT_MS = 60_000;
export const EMPTY_ROOM_MS = 10 * 60_000;
export type Mark = 'X' | 'O';
export interface CaroAction {
  type: 'place';
  row: number;
  col: number;
}
export interface CaroState {
  players: PlayerInfo[];
  board: (Mark | null)[];
  turnId: string;
  lastMove: number | null;
  winningLine: number[];
  status: 'playing' | 'finished';
  winnerId: string | null;
  reason: 'five' | 'draw' | 'timeout' | 'absent' | null;
}
export interface CaroView extends CaroState {
  yourMark: Mark | null;
  roomCode: string;
  deadline: number | null;
  serverTime: number;
}
function finish(
  state: CaroState,
  winnerId: string | null,
  reason: CaroState['reason'],
): CaroState {
  return { ...state, status: 'finished', winnerId, reason };
}
export const caro: GameModule<
  CaroState,
  CaroAction,
  Omit<CaroView, 'roomCode' | 'deadline' | 'serverTime'>
> = {
  id: 'caro',
  name: 'Cờ caro',
  minPlayers: 2,
  maxPlayers: 2,
  init(players) {
    if (players.length !== 2 || new Set(players.map((p) => p.id)).size !== 2)
      throw new Error('Caro requires two distinct players');
    return {
      players: players.map((p) => ({ ...p })),
      board: Array<Mark | null>(CARO_SIZE ** 2).fill(null),
      turnId: players[0]!.id,
      lastMove: null,
      winningLine: [],
      status: 'playing',
      winnerId: null,
      reason: null,
    };
  },
  applyAction(state, playerId, action) {
    if (state.status !== 'playing')
      return { state, error: 'Ván đã kết thúc rồi.' };
    if (state.turnId !== playerId)
      return { state, error: 'Chưa đến lượt bạn nhé!' };
    if (
      action.type !== 'place' ||
      !Number.isInteger(action.row) ||
      !Number.isInteger(action.col) ||
      action.row < 0 ||
      action.row >= CARO_SIZE ||
      action.col < 0 ||
      action.col >= CARO_SIZE
    )
      return { state, error: 'Ô cờ không hợp lệ.' };
    const index = action.row * CARO_SIZE + action.col;
    if (state.board[index] !== null)
      return { state, error: 'Ô này đã có quân rồi.' };
    const mark: Mark = state.players[0]!.id === playerId ? 'X' : 'O';
    const board = [...state.board];
    board[index] = mark;
    const next: CaroState = { ...state, board, lastMove: index };
    for (const [dr, dc] of [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1],
    ] as const) {
      const line = [index];
      for (const direction of [-1, 1]) {
        let r = action.row + dr * direction;
        let c = action.col + dc * direction;
        while (
          r >= 0 &&
          r < CARO_SIZE &&
          c >= 0 &&
          c < CARO_SIZE &&
          board[r * CARO_SIZE + c] === mark
        ) {
          if (direction < 0) line.unshift(r * CARO_SIZE + c);
          else line.push(r * CARO_SIZE + c);
          r += dr * direction;
          c += dc * direction;
        }
      }
      if (line.length >= 5)
        return {
          state: { ...finish(next, playerId, 'five'), winningLine: line },
        };
    }
    if (board.every((cell) => cell !== null))
      return { state: finish(next, null, 'draw') };
    next.turnId = state.players.find((p) => p.id !== playerId)!.id;
    return { state: next };
  },
  getViewFor(state, playerId) {
    const index = state.players.findIndex((p) => p.id === playerId);
    return { ...state, yourMark: index === 0 ? 'X' : index === 1 ? 'O' : null };
  },
  isFinished: (state) => state.status === 'finished',
  onTimeout(state) {
    return state.status === 'finished'
      ? state
      : finish(
          state,
          state.players.find((p) => p.id !== state.turnId)!.id,
          'timeout',
        );
  },
  onPlayerAbsent(state, playerId) {
    if (
      state.status === 'finished' ||
      !state.players.some((p) => p.id === playerId)
    )
      return state;
    return finish(
      state,
      state.players.find((p) => p.id !== playerId)!.id,
      'absent',
    );
  },
};
