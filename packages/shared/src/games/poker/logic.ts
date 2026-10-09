import pokerSolver from 'pokersolver';
import type { GameModule, PlayerInfo } from '../../types.js';
import type {
  PokerAction,
  PokerCard,
  PokerPayout,
  PokerPlayer,
  PokerPot,
  PokerRank,
  PokerState,
  PokerSuit,
  PokerView,
} from './types.js';
import {
  POKER_BIG_BLIND,
  POKER_PLAYERS_MAX,
  POKER_PLAYERS_MIN,
  POKER_SMALL_BLIND,
  POKER_STARTING_CHIPS,
} from './constants.js';
const { Hand } = pokerSolver;
export {
  POKER_BIG_BLIND,
  POKER_PLAYERS_MAX,
  POKER_PLAYERS_MIN,
  POKER_SMALL_BLIND,
  POKER_STARTING_CHIPS,
  POKER_TURN_MS,
} from './constants.js';

const ranks: PokerRank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'T',
  'J',
  'Q',
  'K',
  'A',
];
const suits: PokerSuit[] = ['s', 'h', 'd', 'c'];

export function createPokerDeck(): PokerCard[] {
  return suits.flatMap((suit) =>
    ranks.map((rank) => ({ rank, suit, code: `${rank}${suit}` })),
  );
}

interface InitOptions {
  deck?: PokerCard[];
}

function validDeck(deck: PokerCard[]) {
  return (
    deck.length === 52 &&
    new Set(deck.map((card) => card.code)).size === 52 &&
    deck.every((card) => ranks.includes(card.rank) && suits.includes(card.suit))
  );
}

function clockwise(players: PokerPlayer[], afterId: string) {
  const start = players.findIndex((player) => player.id === afterId);
  return Array.from(
    { length: players.length },
    (_, step) => players[(start + step + 1 + players.length) % players.length]!,
  );
}

function postBlind(player: PokerPlayer, amount: number) {
  const posted = Math.min(player.chips, amount);
  player.chips -= posted;
  player.contribution += posted;
  player.roundBet += posted;
  player.allIn = player.chips === 0;
}

function sidePots(state: PokerState): PokerPot[] {
  const levels = [
    ...new Set(state.players.map((player) => player.contribution)),
  ]
    .filter((amount) => amount > 0)
    .sort((a, b) => a - b);
  const pots: PokerPot[] = [];
  let lower = 0;
  for (const level of levels) {
    const contributors = state.players.filter(
      (player) => player.contribution >= level,
    );
    const eligible = contributors.filter(
      (player) => !player.folded && !player.eliminated,
    );
    const amount = (level - lower) * contributors.length;
    if (amount > 0) {
      const prior = pots.at(-1);
      // Folded-only layers belong to the remaining live hand, never to an empty pot.
      const eligibleIds = (
        eligible.length
          ? eligible
          : state.players.filter(
              (player) => !player.folded && !player.eliminated,
            )
      ).map((player) => player.id);
      if (prior && prior.eligiblePlayerIds.join() === eligibleIds.join())
        prior.amount += amount;
      else pots.push({ amount, eligiblePlayerIds: eligibleIds });
    }
    lower = level;
  }
  if (state.deadPot > 0) {
    if (pots[0]) pots[0].amount += state.deadPot;
    else {
      pots.push({
        amount: state.deadPot,
        eligiblePlayerIds: state.players
          .filter((player) => !player.folded && !player.eliminated)
          .map((player) => player.id),
      });
    }
  }
  return pots;
}

function totalPot(state: PokerState) {
  return (
    state.deadPot +
    state.players.reduce((total, player) => total + player.contribution, 0)
  );
}

function draw(state: PokerState) {
  const card = state.deck[state.deckIndex];
  if (!card) throw new Error('Poker deck ran out');
  state.deckIndex++;
  return card;
}

function winByFold(state: PokerState, winnerId: string): PokerState {
  const winner = state.players.find((player) => player.id === winnerId)!;
  const amount = totalPot(state);
  winner.chips += amount;
  state.payouts = [{ playerId: winnerId, amount, handName: 'Bỏ bài' }];
  return finishHand(state, amount);
}

function finishHand(state: PokerState, amount: number): PokerState {
  state.lastPot = amount;
  state.pot = 0;
  state.deadPot = 0;
  state.players = state.players.map((player) => ({
    ...player,
    contribution: 0,
    roundBet: 0,
    allIn: false,
    eliminated: player.eliminated || player.chips === 0,
  }));
  state.street = 'between-hands';
  state.turnId = null;
  state.acted = [];
  const alive = state.players.filter(
    (player) => player.chips > 0 && !player.eliminated,
  );
  if (alive.length === 1) {
    state.status = 'finished';
    state.winnerId = alive[0]!.id;
  }
  return state;
}

function refundUncalled(state: PokerState) {
  const sorted = [...state.players].sort(
    (a, b) => b.contribution - a.contribution,
  );
  const top = sorted[0];
  if (!top) return;
  const second = sorted[1]?.contribution ?? 0;
  const tiedAtTop = sorted[1]?.contribution === top.contribution;
  if (tiedAtTop) return;
  const refund = top.contribution - second;
  if (refund <= 0) return;
  top.contribution -= refund;
  top.roundBet = Math.max(0, top.roundBet - refund);
  top.chips += refund;
}

function settle(state: PokerState): PokerState {
  refundUncalled(state);
  const amount = totalPot(state);
  const contenders = state.players.filter(
    (player) => !player.folded && !player.eliminated,
  );
  if (contenders.length === 1) return winByFold(state, contenders[0]!.id);

  const payouts = new Map<string, PokerPayout>();
  const board = state.communityCards.map((card) => card.code);
  for (const pot of sidePots(state)) {
    const eligible = state.players.filter((player) =>
      pot.eligiblePlayerIds.includes(player.id),
    );
    if (!eligible.length) continue;
    const hands = eligible.map((player) => ({
      player,
      hand: Hand.solve([
        ...player.holeCards.map((card) => card.code),
        ...board,
      ]),
    }));
    const winners = Hand.winners(hands.map((entry) => entry.hand));
    const winningEntries = hands.filter((entry) =>
      winners.includes(entry.hand),
    );
    const orderedWinners = clockwise(state.players, state.dealerId).filter(
      (player) => winningEntries.some((entry) => entry.player.id === player.id),
    );
    const share = Math.floor(pot.amount / orderedWinners.length);
    let oddChips = pot.amount % orderedWinners.length;
    for (const player of orderedWinners) {
      const amountWon = share + (oddChips-- > 0 ? 1 : 0);
      player.chips += amountWon;
      const entry = winningEntries.find(
        (candidate) => candidate.player.id === player.id,
      )!;
      const existing = payouts.get(player.id);
      payouts.set(player.id, {
        playerId: player.id,
        amount: (existing?.amount ?? 0) + amountWon,
        handName: entry.hand.name,
      });
    }
  }
  state.payouts = [...payouts.values()];
  return finishHand(state, amount);
}

function nextActor(state: PokerState, afterId: string): string | null {
  return (
    clockwise(state.players, afterId).find(
      (player) =>
        !player.folded &&
        !player.eliminated &&
        player.chips > 0 &&
        (!state.acted.includes(player.id) ||
          player.roundBet < state.currentBet),
    )?.id ?? null
  );
}

function firstActor(state: PokerState, afterId: string): string | null {
  return (
    clockwise(state.players, afterId).find(
      (player) => !player.folded && !player.eliminated && player.chips > 0,
    )?.id ?? null
  );
}

function activeContenders(state: PokerState) {
  return state.players.filter((player) => !player.folded && !player.eliminated);
}

function runOut(state: PokerState) {
  while (state.communityCards.length < 5) {
    if (state.communityCards.length === 0) draw(state);
    const needed = state.communityCards.length === 0 ? 3 : 1;
    for (let i = 0; i < needed; i++) state.communityCards.push(draw(state));
  }
  return settle(state);
}

function advanceStreet(state: PokerState): PokerState {
  const contenders = activeContenders(state);
  if (contenders.length <= 1) return settle(state);
  const ableToAct = contenders.filter((player) => player.chips > 0);
  if (ableToAct.length <= 1) return runOut(state);
  if (state.street === 'river') return settle(state);

  if (state.street === 'preflop') {
    draw(state); // burn card
    state.communityCards.push(draw(state), draw(state), draw(state));
    state.street = 'flop';
  } else if (state.street === 'flop') {
    draw(state);
    state.communityCards.push(draw(state));
    state.street = 'turn';
  } else if (state.street === 'turn') {
    draw(state);
    state.communityCards.push(draw(state));
    state.street = 'river';
  }
  for (const player of state.players) player.roundBet = 0;
  state.currentBet = 0;
  state.minRaise = POKER_BIG_BLIND;
  state.acted = [];
  const first = firstActor(state, state.dealerId);
  if (!first) return runOut(state);
  state.turnId = first;
  return state;
}

function advanceAfterAction(state: PokerState, playerId: string): PokerState {
  if (activeContenders(state).length === 1) return settle(state);
  const next = nextActor(state, playerId);
  if (next) {
    state.turnId = next;
    return state;
  }
  return advanceStreet(state);
}

function beginHand(
  previous: PokerState,
  deck: PokerCard[],
  missingIds: string[] = [],
): PokerState {
  const missedHands = { ...previous.missedHands };
  let deadPot = previous.deadPot;
  const players = previous.players.map((player) => {
    const missed = missingIds.includes(player.id)
      ? (missedHands[player.id] ?? 0) + 1
      : 0;
    missedHands[player.id] = missed;
    const chips = player.chips;
    if (missed >= 2) deadPot += chips;
    return {
      ...player,
      chips: missed >= 2 ? 0 : chips,
      holeCards: [],
      contribution: 0,
      roundBet: 0,
      folded: missed >= 1 || chips === 0,
      allIn: false,
      eliminated: player.eliminated || missed >= 2 || chips === 0,
    };
  });
  const state: PokerState = {
    ...previous,
    gameId: 'poker',
    players,
    status: 'playing',
    street: 'preflop',
    handNumber: previous.handNumber + 1,
    dealerId: previous.dealerId,
    smallBlindId: previous.dealerId,
    bigBlindId: previous.dealerId,
    deck,
    deckIndex: 0,
    communityCards: [],
    currentBet: 0,
    minRaise: POKER_BIG_BLIND,
    deadPot,
    pot: deadPot,
    turnId: null,
    acted: [],
    payouts: [],
    winnerId: null,
    missedHands,
  };
  const eligible = state.players.filter(
    (player) => player.chips > 0 && !player.eliminated && !player.folded,
  );
  if (eligible.length < 2) {
    state.street = 'between-hands';
    state.status = 'finished';
    state.winnerId = eligible[0]?.id ?? null;
    if (eligible[0] && state.deadPot > 0) {
      eligible[0].chips += state.deadPot;
      state.lastPot = state.deadPot;
      state.payouts = [
        {
          playerId: eligible[0].id,
          amount: state.deadPot,
          handName: 'Chip vắng mặt',
        },
      ];
      state.deadPot = 0;
      state.pot = 0;
    }
    return state;
  }
  if (!validDeck(deck)) throw new Error('Poker needs a shuffled 52-card deck');

  if (!eligible.some((player) => player.id === state.dealerId))
    state.dealerId = eligible[0]!.id;
  const nextAfterDealer = clockwise(state.players, state.dealerId).filter(
    (player) => eligible.some((candidate) => candidate.id === player.id),
  );
  const smallBlind =
    eligible.length === 2 ? state.dealerId : nextAfterDealer[0]!.id;
  const bigBlind =
    eligible.length === 2 ? nextAfterDealer[0]!.id : nextAfterDealer[1]!.id;
  state.smallBlindId = smallBlind;
  state.bigBlindId = bigBlind;

  const dealOrder = [
    ...clockwise(state.players, state.dealerId).filter((player) =>
      eligible.some((candidate) => candidate.id === player.id),
    ),
  ];
  const cardById = new Map<string, PokerCard[]>();
  for (let round = 0; round < 2; round++)
    for (const player of dealOrder) {
      const cards = cardById.get(player.id) ?? [];
      cards.push(draw(state));
      cardById.set(player.id, cards);
    }
  state.players = state.players.map((player) => ({
    ...player,
    holeCards: cardById.get(player.id) ?? [],
  }));
  postBlind(
    state.players.find((player) => player.id === smallBlind)!,
    POKER_SMALL_BLIND,
  );
  postBlind(
    state.players.find((player) => player.id === bigBlind)!,
    POKER_BIG_BLIND,
  );
  state.currentBet = Math.max(
    ...state.players.map((player) => player.roundBet),
  );
  state.pot = totalPot(state);
  state.turnId =
    eligible.length === 2
      ? (state.players.find(
          (player) => player.id === state.dealerId && player.chips > 0,
        )?.id ?? firstActor(state, state.dealerId))
      : firstActor(state, bigBlind);
  if (!state.turnId) return runOut(state);
  return state;
}

export function startNextPokerHand(
  state: PokerState,
  deck: PokerCard[],
  missingIds: string[] = [],
  seatedPlayers?: PlayerInfo[],
  queuedIds: string[] = [],
) {
  if (state.status !== 'playing' || state.street !== 'between-hands')
    return { state, error: 'Ván hiện tại chưa kết thúc.' };
  // Only change the hand roster at the boundary: queued seats never get cards mid-hand.
  if (seatedPlayers) {
    const seatedIds = new Set(seatedPlayers.map((player) => player.id));
    const departed = state.players.filter(
      (player) => !seatedIds.has(player.id) || queuedIds.includes(player.id),
    );
    const retained = state.players.filter(
      (player) => seatedIds.has(player.id) && !queuedIds.includes(player.id),
    );
    const newcomers = seatedPlayers.filter(
      (player) => !retained.some((old) => old.id === player.id),
    );
    state = {
      ...state,
      deadPot:
        state.deadPot + departed.reduce((sum, player) => sum + player.chips, 0),
      players: [
        ...retained.map((player) => ({
          ...player,
          ...seatedPlayers.find((seat) => seat.id === player.id)!,
        })),
        ...newcomers.map((player) => ({
          ...player,
          chips: POKER_STARTING_CHIPS,
          holeCards: [],
          contribution: 0,
          roundBet: 0,
          folded: false,
          allIn: false,
          eliminated: false,
        })),
      ],
    };
  }
  if (
    state.players.filter((player) => player.chips > 0 && !player.eliminated)
      .length < 2
  )
    return { state, error: 'Cần hai người còn chip để chia ván tiếp.' };
  const nextDealer = clockwise(state.players, state.dealerId).find(
    (player) =>
      player.chips > 0 && !player.eliminated && !missingIds.includes(player.id),
  );
  if (!nextDealer) return { state, error: 'Chưa đủ người để chia ván tiếp.' };
  return {
    state: beginHand({ ...state, dealerId: nextDealer.id }, deck, missingIds),
  };
}

export function resolvePokerShowdown(state: PokerState) {
  return settle({
    ...state,
    players: state.players.map((player) => ({ ...player })),
    communityCards: [...state.communityCards],
    payouts: [],
  });
}

function makeAction(
  state: PokerState,
  playerId: string,
  action: PokerAction,
): { state: PokerState; error?: string } {
  if (state.status !== 'playing' || state.street === 'between-hands')
    return { state, error: 'Ván bài đang nghỉ giữa hai lượt chia.' };
  if (state.turnId !== playerId)
    return { state, error: 'Chưa đến lượt bạn nhé!' };
  const players = state.players.map((player) => ({ ...player }));
  const player = players.find((item) => item.id === playerId);
  if (!player || player.folded || player.eliminated || player.allIn)
    return { state, error: 'Bạn không còn hành động trong ván này.' };
  const owed = Math.max(0, state.currentBet - player.roundBet);
  let raiseDelta = 0;

  if (action.type === 'fold') player.folded = true;
  else if (action.type === 'check') {
    if (owed > 0)
      return { state, error: 'Đang có cược, bạn cần theo hoặc bỏ bài.' };
  } else if (action.type === 'call') {
    if (owed === 0) return { state, error: 'Bạn có thể check thay vì theo.' };
    const paid = Math.min(owed, player.chips);
    player.chips -= paid;
    player.roundBet += paid;
    player.contribution += paid;
    player.allIn = player.chips === 0;
  } else {
    const target =
      action.type === 'all-in'
        ? player.roundBet + player.chips
        : action.raiseTo;
    const isRaising = target > state.currentBet;
    if (isRaising && state.acted.includes(playerId))
      return {
        state,
        error: 'Bạn đã hành động trước lượt tố lại này; hãy theo hoặc bỏ bài.',
      };
    if (action.type === 'all-in' && !isRaising) {
      const paid = player.chips;
      player.chips = 0;
      player.roundBet += paid;
      player.contribution += paid;
      player.allIn = true;
    } else {
      if (!Number.isSafeInteger(target) || target <= state.currentBet)
        return { state, error: 'Mức tố phải cao hơn cược hiện tại.' };
      if (target > player.roundBet + player.chips)
        return { state, error: 'Bạn không đủ chip cho mức tố này.' };
      const allIn = target === player.roundBet + player.chips;
      if (target < state.currentBet + state.minRaise && !allIn)
        return {
          state,
          error: `Mức tố tối thiểu là ${state.currentBet + state.minRaise} chip.`,
        };
      raiseDelta = target - state.currentBet;
      const paid = target - player.roundBet;
      player.chips -= paid;
      player.roundBet = target;
      player.contribution += paid;
      player.allIn = player.chips === 0;
    }
  }

  const wasFullRaise = raiseDelta >= state.minRaise;
  const acted =
    action.type === 'raise' || action.type === 'all-in'
      ? wasFullRaise
        ? [playerId]
        : [...new Set([...state.acted, playerId])]
      : [...new Set([...state.acted, playerId])];
  const currentBet = Math.max(state.currentBet, player.roundBet);
  const nextState: PokerState = {
    ...state,
    players,
    currentBet,
    minRaise: wasFullRaise ? raiseDelta : state.minRaise,
    acted,
    pot:
      state.deadPot +
      players.reduce((total, item) => total + item.contribution, 0),
    turnId: playerId,
  };
  return { state: advanceAfterAction(nextState, playerId) };
}

export const poker: GameModule<
  PokerState,
  PokerAction,
  Omit<PokerView, 'roomCode' | 'deadline' | 'serverTime'>
> = {
  id: 'poker',
  name: 'Poker Texas Hold’em',
  minPlayers: POKER_PLAYERS_MIN,
  maxPlayers: POKER_PLAYERS_MAX,
  init(players, options) {
    if (
      players.length < POKER_PLAYERS_MIN ||
      players.length > POKER_PLAYERS_MAX ||
      new Set(players.map((player) => player.id)).size !== players.length
    )
      throw new Error('Poker needs 2–8 distinct players');
    const init = options as InitOptions | undefined;
    const deck = init?.deck ?? createPokerDeck();
    const state: PokerState = {
      gameId: 'poker',
      players: players.map((player) => ({
        ...player,
        chips: POKER_STARTING_CHIPS,
        holeCards: [],
        contribution: 0,
        roundBet: 0,
        folded: false,
        allIn: false,
        eliminated: false,
      })),
      status: 'playing',
      street: 'between-hands',
      handNumber: 0,
      dealerId: players[0]!.id,
      smallBlindId: players[0]!.id,
      bigBlindId: players[1]!.id,
      deck,
      deckIndex: 0,
      communityCards: [],
      currentBet: 0,
      minRaise: POKER_BIG_BLIND,
      pot: 0,
      deadPot: 0,
      turnId: null,
      acted: [],
      payouts: [],
      lastPot: 0,
      winnerId: null,
      missedHands: {},
    };
    if (!validDeck(deck))
      throw new Error('Poker needs a complete 52-card deck');
    return beginHand(state, deck);
  },
  applyAction: makeAction,
  getViewFor(state, playerId) {
    const handNames = new Map(
      state.payouts.map((payout) => [payout.playerId, payout.handName]),
    );
    const showDown = state.street === 'between-hands';
    const own = state.players.find((player) => player.id === playerId);
    const visible = state.players.map((player) => ({
      id: player.id,
      nickname: player.nickname,
      avatar: player.avatar,
      chips: player.chips,
      holeCards:
        player.id === playerId || (showDown && !player.folded)
          ? [...player.holeCards]
          : [],
      contribution: player.contribution,
      roundBet: player.roundBet,
      folded: player.folded,
      allIn: player.allIn,
      eliminated: player.eliminated,
      handName: handNames.get(player.id) ?? null,
    }));
    const view = {
      gameId: 'poker' as const,
      players: visible,
      status: state.status,
      street: state.street,
      handNumber: state.handNumber,
      dealerId: state.dealerId,
      smallBlindId: state.smallBlindId,
      bigBlindId: state.bigBlindId,
      communityCards: [...state.communityCards],
      currentBet: state.currentBet,
      minRaise: state.minRaise,
      pot: state.street === 'between-hands' ? 0 : totalPot(state),
      sidePots: state.street === 'between-hands' ? [] : sidePots(state),
      deadPot: state.deadPot,
      turnId: state.turnId,
      payouts: [...state.payouts],
      lastPot: state.lastPot,
      winnerId: state.winnerId,
      callAmount: own
        ? Math.min(own.chips, Math.max(0, state.currentBet - own.roundBet))
        : 0,
      minRaiseTo: state.currentBet + state.minRaise,
      maxRaiseTo: own ? own.roundBet + own.chips : state.currentBet,
    };
    return view;
  },
  isFinished: (state) => state.status === 'finished',
  onTimeout(state) {
    if (!state.turnId) return state;
    const actor = state.players.find((player) => player.id === state.turnId);
    const action: PokerAction =
      actor && actor.roundBet === state.currentBet
        ? { type: 'check' }
        : { type: 'fold' };
    return makeAction(state, state.turnId, action).state;
  },
  onPlayerAbsent(state, playerId) {
    const player = state.players.find((item) => item.id === playerId);
    if (
      !player ||
      player.folded ||
      player.eliminated ||
      state.street === 'between-hands'
    )
      return state;
    const next: PokerState = {
      ...state,
      players: state.players.map((item) =>
        item.id === playerId ? { ...item, folded: true } : { ...item },
      ),
    };
    if (next.turnId === playerId) return advanceAfterAction(next, playerId);
    return activeContenders(next).length === 1
      ? settle(next)
      : { ...next, pot: totalPot(next) };
  },
};

export { sidePots as getPokerSidePots };
