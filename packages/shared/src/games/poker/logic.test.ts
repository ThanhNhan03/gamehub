import { describe, expect, it } from 'vitest';
import {
  createPokerDeck,
  getPokerSidePots,
  poker,
  resolvePokerShowdown,
  startNextPokerHand,
} from './logic.js';
import type { PokerCard, PokerState } from './types.js';

const players = [
  { id: 'a', nickname: 'An', avatar: 0 },
  { id: 'b', nickname: 'Bình', avatar: 1 },
  { id: 'c', nickname: 'Chi', avatar: 2 },
];
const deck = createPokerDeck();
const card = (code: string): PokerCard =>
  deck.find((item) => item.code === code)!;
const act = (
  state: PokerState,
  playerId: string,
  type: 'check' | 'call' | 'fold' | 'all-in' | 'raise',
  raiseTo?: number,
) =>
  poker.applyAction(
    state,
    playerId,
    type === 'raise' ? { type, raiseTo: raiseTo! } : { type },
  );

describe('Poker Texas Hold’em', () => {
  it('deals two private cards, posts blinds, and never sends opponents’ cards', () => {
    const state = poker.init(players.slice(0, 2), { deck });
    expect(state.street).toBe('preflop');
    expect(state.turnId).toBe('a');
    expect(state.players.map((player) => player.contribution)).toEqual([
      10, 20,
    ]);
    expect(state.pot).toBe(30);
    expect(poker.getViewFor(state, 'a').players[0]?.holeCards).toHaveLength(2);
    expect(poker.getViewFor(state, 'a').players[1]?.holeCards).toHaveLength(0);
    expect(
      poker
        .getViewFor(state, 'spectator')
        .players.every((player) => !player.holeCards.length),
    ).toBe(true);
    expect('deck' in poker.getViewFor(state, 'a')).toBe(false);
    expect('missedHands' in poker.getViewFor(state, 'a')).toBe(false);
  });

  it('requires the correct action and advances through all four betting streets', () => {
    let state = poker.init(players.slice(0, 2), { deck });
    expect(act(state, 'b', 'call').error).toBeTruthy();
    expect(act(state, 'a', 'check').error).toContain('theo');
    state = act(state, 'a', 'call').state;
    state = act(state, 'b', 'check').state;
    expect(state.street).toBe('flop');
    for (const street of ['flop', 'turn', 'river'] as const) {
      expect(state.street).toBe(street);
      state = act(state, 'b', 'check').state;
      state = act(state, 'a', 'check').state;
    }
    expect(state.street).toBe('between-hands');
    expect(state.status).toBe('playing');
    expect(state.communityCards).toHaveLength(5);
    expect(state.payouts.reduce((sum, payout) => sum + payout.amount, 0)).toBe(
      40,
    );
  });

  it('handles all-in calls, runs the board, and ends a heads-up tournament', () => {
    const dealtOrder = [
      '2c',
      'As',
      '3d',
      'Ah',
      '4c',
      'Ad',
      '7s',
      '8h',
      '9c',
      '2h',
      '3c',
      '5d',
    ];
    const riggedDeck = [
      ...dealtOrder.map(card),
      ...deck.filter((item) => !dealtOrder.includes(item.code)),
    ];
    let state = poker.init(players.slice(0, 2), { deck: riggedDeck });
    state = act(state, 'a', 'all-in').state;
    state = act(state, 'b', 'all-in').state;
    expect(state.communityCards).toHaveLength(5);
    expect(state.street).toBe('between-hands');
    expect(state.status).toBe('finished');
    expect(state.winnerId).toBeTruthy();
    expect(state.players.reduce((sum, player) => sum + player.chips, 0)).toBe(
      2000,
    );
  });

  it('builds and awards main and side pots to the best eligible hands', () => {
    const state = poker.init(players, { deck });
    state.street = 'river';
    state.communityCards = ['As', 'Ad', 'Kc', 'Kd', '2h'].map(card);
    state.currentBet = 100;
    state.pot = 250;
    state.players = state.players.map((player, index) => ({
      ...player,
      chips: 0,
      contribution: index === 1 ? 50 : 100,
      roundBet: index === 1 ? 50 : 100,
      folded: false,
      allIn: true,
      holeCards: [
        [card('Ac'), card('Qc')],
        [card('Ks'), card('Kh')],
        [card('Qs'), card('Qd')],
      ][index]!,
    }));
    expect(getPokerSidePots(state)).toEqual([
      { amount: 150, eligiblePlayerIds: ['a', 'b', 'c'] },
      { amount: 100, eligiblePlayerIds: ['a', 'c'] },
    ]);
    const result = resolvePokerShowdown(state);
    expect(
      Object.fromEntries(
        result.payouts.map((payout) => [payout.playerId, payout.amount]),
      ),
    ).toEqual({
      b: 150,
      a: 100,
    });
    expect(result.players.map((player) => player.chips)).toEqual([100, 150, 0]);
    expect(result.lastPot).toBe(250);
    expect(state.players.every((player) => player.chips === 0)).toBe(true);
  });

  it('auto-checks when free, folds when facing a bet, and folds a player who leaves', () => {
    let state = poker.init(players.slice(0, 2), { deck });
    state = act(state, 'a', 'call').state;
    state = poker.onTimeout!(state);
    expect(state.street).toBe('flop');
    expect(state.turnId).toBe('b');
    state = poker.onPlayerAbsent!(state, 'b');
    expect(state.street).toBe('between-hands');
    expect(state.payouts[0]?.playerId).toBe('a');
  });

  it('sits out an absent player and moves their stack into the pot after two hands', () => {
    let state = poker.init(players, { deck });
    state = act(state, state.turnId!, 'fold').state;
    state = act(state, state.turnId!, 'fold').state;
    expect(state.street).toBe('between-hands');
    const chipsBefore = state.players.find(
      (player) => player.id === 'a',
    )!.chips;
    state = startNextPokerHand(state, deck, ['a']).state;
    expect(state.missedHands.a).toBe(1);
    expect(state.players.find((player) => player.id === 'a')?.folded).toBe(
      true,
    );
    state = act(state, state.turnId!, 'fold').state;
    state = act(state, state.turnId!, 'fold').state;
    expect(state.street).toBe('between-hands');
    state = startNextPokerHand(state, deck, ['a']).state;
    expect(state.missedHands.a).toBe(2);
    expect(state.players.find((player) => player.id === 'a')?.eliminated).toBe(
      true,
    );
    expect(state.deadPot).toBe(chipsBefore);
    expect(
      getPokerSidePots(state).reduce((sum, pot) => sum + pot.amount, 0),
    ).toBe(chipsBefore + 30);
  });
});
