export interface PlayerInfo {
  id: string;
  nickname: string;
  avatar: number;
}
export interface GameModule<State, Action, View> {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  init(players: PlayerInfo[], options?: unknown): State;
  applyAction(
    state: State,
    playerId: string,
    action: Action,
  ): { state: State; error?: string };
  getViewFor(state: State, playerId: string): View;
  isFinished(state: State): boolean;
  onTimeout?(state: State): State;
  onPlayerAbsent?(state: State, playerId: string): State;
}
export interface ServerEvents {
  'lobby:state': (state: { online: number }) => void;
  'server:restarting': (message: string) => void;
}
// Phase 1 adds the room and game action contracts here.
export type ClientEvents = Record<never, never>;
