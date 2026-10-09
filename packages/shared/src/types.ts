export interface PlayerInfo {
  id: string;
  nickname: string;
  avatar: number;
}
export interface RoomPlayer extends PlayerInfo {
  online: boolean;
  reconnectUntil: number | null;
}
export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  sentAt: number;
}
export interface RoomSummary {
  code: string;
  gameId: 'caro';
  hostName: string;
  count: number;
  maxPlayers: number;
  status: 'waiting' | 'playing' | 'finished';
}
export interface RoomView extends RoomSummary {
  hostId: string | null;
  players: RoomPlayer[];
  chat: ChatMessage[];
  deadline: number | null;
  serverTime: number;
}
export type Result =
  | { ok: true; code?: string }
  | { ok: false; error: { code: string; message: string } };
export type Ack = (result: Result) => void;
export interface LobbyState {
  online: number;
  rooms: RoomSummary[];
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
  'lobby:state': (state: LobbyState) => void;
  'room:state': (state: RoomView | null) => void;
  'game:view': (view: import('./games/caro/logic.js').CaroView | null) => void;
  'chat:message': (message: ChatMessage) => void;
  error: (error: { code: string; message: string }) => void;
  'server:restarting': (message: string) => void;
}
export interface ClientEvents {
  'room:create': (payload: { gameId: 'caro'; maxPlayers: 2 }, ack: Ack) => void;
  'room:join': (payload: { code: string }, ack: Ack) => void;
  'room:rejoin': (payload: { code: string }, ack: Ack) => void;
  'room:leave': (payload: Record<string, never>, ack: Ack) => void;
  'room:start': (payload: Record<string, never>, ack: Ack) => void;
  'room:rematch': (payload: Record<string, never>, ack: Ack) => void;
  'game:action': (
    payload: import('./games/caro/logic.js').CaroAction,
    ack: Ack,
  ) => void;
  'chat:send': (payload: { text: string }, ack: Ack) => void;
}
