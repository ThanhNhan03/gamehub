import { create } from 'zustand';
import type { RoomView, GameView, LobbyState } from '@gamehub/shared';
export const useGameStore = create<{
  connected: boolean;
  authorized: boolean;
  connecting: boolean;
  restoring: boolean;
  room: RoomView | null;
  game: GameView | null;
  lobby: LobbyState;
  error: string;
  roomError: string;
  restarting: string;
}>(() => ({
  connected: false,
  authorized: false,
  connecting: false,
  restoring: false,
  room: null,
  game: null,
  lobby: { online: 0, rooms: [] },
  error: '',
  roomError: '',
  restarting: '',
}));
