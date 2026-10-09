import type { PlayerInfo } from '../../types.js';

export type PokerRank =
  '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type PokerSuit = 's' | 'h' | 'd' | 'c';
export interface PokerCard {
  rank: PokerRank;
  suit: PokerSuit;
  code: string;
}
export interface PokerPlayer extends PlayerInfo {
  chips: number;
  holeCards: PokerCard[];
  contribution: number;
  roundBet: number;
  folded: boolean;
  allIn: boolean;
  eliminated: boolean;
}
export type PokerStreet =
  'preflop' | 'flop' | 'turn' | 'river' | 'between-hands';
export interface PokerPot {
  amount: number;
  eligiblePlayerIds: string[];
}
export interface PokerPayout {
  playerId: string;
  amount: number;
  handName: string;
}
export interface PokerState {
  gameId: 'poker';
  players: PokerPlayer[];
  status: 'playing' | 'finished';
  street: PokerStreet;
  handNumber: number;
  dealerId: string;
  smallBlindId: string;
  bigBlindId: string;
  deck: PokerCard[];
  deckIndex: number;
  communityCards: PokerCard[];
  currentBet: number;
  minRaise: number;
  pot: number;
  deadPot: number;
  turnId: string | null;
  acted: string[];
  payouts: PokerPayout[];
  lastPot: number;
  winnerId: string | null;
  missedHands: Record<string, number>;
}
export type PokerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; raiseTo: number }
  | { type: 'all-in' };
export interface PokerPlayerView extends Omit<PokerPlayer, 'holeCards'> {
  holeCards: PokerCard[];
  handName: string | null;
}
export interface PokerView extends Omit<
  PokerState,
  'deck' | 'deckIndex' | 'acted' | 'missedHands' | 'players'
> {
  players: PokerPlayerView[];
  sidePots: PokerPot[];
  roomCode: string;
  deadline: number | null;
  serverTime: number;
  callAmount: number;
  minRaiseTo: number;
  maxRaiseTo: number;
}
