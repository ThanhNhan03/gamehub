import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import {
  type PokerAction,
  type PokerCard,
  type PokerView,
  type PokerPlayerView,
  type RoomView,
} from '@gamehub/shared';
import {
  POKER_BIG_BLIND,
  POKER_SMALL_BLIND,
  POKER_STARTING_CHIPS,
} from '@gamehub/shared/poker-constants';
import { Avatar, Icon } from '../../components/Art';
import { Button } from '../../components/UI';
import { request } from '../../lib/socket';
import { createPlayerLabels } from '../../lib/playerNames';
import { PlayerName } from '../../components/PlayerName';

const suitName: Record<PokerCard['suit'], string> = {
  s: '♠',
  h: '♥',
  d: '♦',
  c: '♣',
};
const suitLabel: Record<PokerCard['suit'], string> = {
  s: 'bích',
  h: 'cơ',
  d: 'rô',
  c: 'tép',
};
const stages = ['Preflop', 'Flop', 'Turn', 'River', 'Showdown'];
const format = (amount: number) => amount.toLocaleString('vi-VN');

// Seats and their bets run clockwise from the local player's bottom seat.
const layouts: Record<number, number[][]> = {
  2: [
    [50, 89, 50, 71],
    [50, 11, 50, 25],
  ],
  3: [
    [50, 89, 50, 71],
    [14, 31, 14, 45],
    [86, 31, 86, 45],
  ],
  4: [
    [50, 89, 50, 71],
    [14, 50, 14, 64],
    [50, 11, 50, 25],
    [86, 50, 86, 64],
  ],
  5: [
    [50, 89, 50, 71],
    [14, 68, 14, 54],
    [27, 13, 27, 27],
    [73, 13, 73, 27],
    [86, 68, 86, 54],
  ],
  6: [
    [50, 89, 50, 71],
    [14, 69, 14, 56],
    [14, 31, 14, 44],
    [50, 11, 50, 25],
    [86, 31, 86, 44],
    [86, 69, 86, 56],
  ],
  7: [
    [50, 89, 50, 71],
    [14, 70, 14, 57],
    [14, 35, 14, 48],
    [36, 11, 36, 25],
    [64, 11, 64, 25],
    [86, 35, 86, 48],
    [86, 70, 86, 57],
  ],
  8: [
    [50, 90, 50, 73],
    [18, 80, 25, 67],
    [13, 47, 13, 60],
    [24, 14, 24, 28],
    [50, 9, 50, 23],
    [76, 14, 76, 28],
    [87, 47, 87, 60],
    [82, 80, 75, 67],
  ],
};
const compactLayouts: Record<number, number[][]> = {
  2: [
    [50, 90, 50, 74],
    [50, 9, 50, 24],
  ],
  3: [
    [50, 90, 50, 74],
    [17, 20, 14, 36],
    [83, 20, 86, 36],
  ],
  4: [
    [50, 90, 50, 74],
    [17, 38, 12, 51],
    [50, 9, 50, 24],
    [83, 38, 88, 51],
  ],
  5: [
    [50, 90, 50, 74],
    [17, 73, 12, 62],
    [17, 22, 14, 36],
    [83, 22, 86, 36],
    [83, 73, 88, 62],
  ],
  6: [
    [50, 90, 50, 74],
    [17, 73, 12, 62],
    [17, 25, 14, 37],
    [50, 8, 50, 22],
    [83, 25, 86, 37],
    [83, 73, 88, 62],
  ],
  7: [
    [50, 92, 50, 78],
    [17, 75, 12, 64],
    [17, 40, 12, 52],
    [17, 17, 14, 29],
    [83, 17, 86, 29],
    [83, 40, 88, 52],
    [83, 75, 88, 64],
  ],
  8: [
    [50, 92, 50, 78],
    [17, 75, 12, 64],
    [17, 39, 12, 52],
    [17, 17, 14, 29],
    [50, 8, 50, 21],
    [83, 17, 86, 29],
    [83, 39, 88, 52],
    [83, 75, 88, 64],
  ],
};

function positionStyle(position: number[], compact: number[]): CSSProperties {
  return {
    '--seat-x': position[0] + '%',
    '--seat-y': position[1] + '%',
    '--bet-x': position[2] + '%',
    '--bet-y': position[3] + '%',
    '--compact-seat-x': compact[0] + '%',
    '--compact-seat-y': compact[1] + '%',
    '--compact-bet-x': compact[2] + '%',
    '--compact-bet-y': compact[3] + '%',
  } as CSSProperties;
}

function Chip() {
  return (
    <svg className="poker-chip" viewBox="0 0 32 32" aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="13"
        fill="var(--hot-pink)"
        stroke="var(--ink)"
        strokeWidth="3"
      />
      <circle
        cx="16"
        cy="16"
        r="10"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeDasharray="5.2 5.2"
      />
      <circle
        cx="16"
        cy="16"
        r="6"
        fill="var(--pink)"
        stroke="var(--ink)"
        strokeWidth="2"
      />
    </svg>
  );
}

function PlayingCard({
  card,
  hidden = false,
}: {
  card?: PokerCard;
  hidden?: boolean;
}) {
  if (!card || hidden)
    return (
      <span
        className="playing-card card-back"
        role="img"
        aria-label="Lá bài úp"
      />
    );
  const rank = card.rank === 'T' ? '10' : card.rank;
  return (
    <span
      className={
        'playing-card ' +
        (card.suit === 'h' || card.suit === 'd' ? 'card-red' : 'card-black')
      }
      role="img"
      aria-label={rank + ' ' + suitLabel[card.suit]}
    >
      <strong aria-hidden="true">{rank}</strong>
      <span aria-hidden="true">{suitName[card.suit]}</span>
    </span>
  );
}

export function PokerTable({
  game,
  room,
  playerId,
  connected,
  isHost,
  canStart,
  onStart,
  onLeave,
  notify,
}: {
  game: PokerView;
  room: RoomView;
  playerId: string;
  connected: boolean;
  isHost: boolean;
  canStart: boolean;
  onStart: () => void;
  onLeave: () => void;
  notify: (text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const { codeFor, nameFor } = createPlayerLabels(room);
  const [now, setNow] = useState(Date.now());
  const [raiseTo, setRaiseTo] = useState<number | ''>(game.minRaiseTo);
  const [roleNotice, setRoleNotice] = useState('');
  const announcedHand = useRef('');
  useEffect(() => {
    const own = game.players.find((player) => player.id === playerId);
    const handKey = game.roomCode + ':' + game.handNumber;
    if (
      !own?.holeCards.length ||
      !room.players.some(
        (player) => player.id === playerId && !player.waitingForNextHand,
      ) ||
      game.street === 'between-hands' ||
      announcedHand.current === handKey
    )
      return;
    announcedHand.current = handKey;
    const roles = [
      game.dealerId === playerId && 'Dealer',
      game.smallBlindId === playerId &&
        `Small Blind (${POKER_SMALL_BLIND} chip)`,
      game.bigBlindId === playerId && `Big Blind (${POKER_BIG_BLIND} chip)`,
    ].filter(Boolean);
    setRoleNotice(
      roles.length ? 'Bạn là ' + roles.join(' và ') + ' trong ván này.' : '',
    );
  }, [
    game.roomCode,
    game.handNumber,
    game.dealerId,
    game.smallBlindId,
    game.bigBlindId,
    game.street,
    game.players,
    playerId,
    room.players,
  ]);
  useEffect(() => {
    if (!roleNotice) return;
    const timer = setTimeout(() => setRoleNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [roleNotice, game.handNumber]);
  const offset = useMemo(() => game.serverTime - Date.now(), [game.serverTime]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(
    () => setRaiseTo(Math.min(game.minRaiseTo, game.maxRaiseTo)),
    [game.minRaiseTo, game.maxRaiseTo, game.handNumber],
  );

  const waitingForNextHand = room.players.find(
    (player) => player.id === playerId,
  )?.waitingForNextHand;
  const self =
    !waitingForNextHand && room.players.some((player) => player.id === playerId)
      ? game.players.find((player) => player.id === playerId)
      : undefined;
  const roundOver =
    game.street === 'between-hands' || game.status === 'finished';
  const canAct =
    connected &&
    !busy &&
    !roundOver &&
    game.turnId === playerId &&
    !!self &&
    self.chips > 0 &&
    !self.folded &&
    !self.eliminated;
  const seconds = Math.min(
    30,
    Math.max(
      0,
      Math.ceil(((game.deadline ?? now + offset) - (now + offset)) / 1000),
    ),
  );
  const minimum = Math.min(game.minRaiseTo, game.maxRaiseTo);
  const maximum = Math.max(minimum, game.maxRaiseTo);
  const selectedRaise = Math.min(
    maximum,
    Math.max(minimum, Math.floor(raiseTo === '' ? minimum : raiseTo)),
  );
  const validRaise =
    raiseTo !== '' &&
    Number.isInteger(raiseTo) &&
    raiseTo >= minimum &&
    raiseTo <= maximum;
  const canEditRaise =
    connected &&
    !busy &&
    !roundOver &&
    !!self &&
    self.chips > 0 &&
    !self.folded &&
    !self.eliminated &&
    maximum > game.currentBet;
  const canRaise = canAct && maximum > game.currentBet;
  const seats: (PokerPlayerView & { waiting: boolean })[] = room.players.map(
    (seat) => {
      const player = game.players.find((player) => player.id === seat.id);
      return player && !seat.waitingForNextHand
        ? { ...player, waiting: false }
        : {
            ...seat,
            chips: POKER_STARTING_CHIPS,
            holeCards: [],
            contribution: 0,
            roundBet: 0,
            folded: false,
            allIn: false,
            eliminated: false,
            handName: null,
            waiting: true,
          };
    },
  );
  const myIndex = seats.findIndex((player) => player.id === playerId);
  const startIndex = Math.max(0, myIndex);
  const players = [...seats.slice(startIndex), ...seats.slice(0, startIndex)];
  const positions = layouts[players.length] ?? layouts[8]!;
  const compactPositions = compactLayouts[players.length] ?? compactLayouts[8]!;
  const stage = roundOver
    ? game.communityCards.length === 5
      ? 4
      : game.communityCards.length === 4
        ? 2
        : game.communityCards.length === 3
          ? 1
          : 0
    : stages.indexOf(
        game.street === 'preflop'
          ? 'Preflop'
          : game.street.charAt(0).toUpperCase() + game.street.slice(1),
      );
  const winner = game.players.find((player) => player.id === game.winnerId);
  const resultText =
    game.status === 'finished'
      ? winner
        ? nameFor(winner.id, winner.nickname) + ' gom hết chip rồi!'
        : 'Giải đấu đã kết thúc.'
      : game.payouts
          .map((payout) => {
            const name = nameFor(
              payout.playerId,
              game.players.find((player) => player.id === payout.playerId)
                ?.nickname ?? 'Đồng đội',
            );
            return (
              name +
              ' thắng ' +
              format(payout.amount) +
              ' chip' +
              (payout.handName === 'Bỏ bài'
                ? ' vì mọi người đã bỏ bài'
                : payout.handName === 'Chip vắng mặt'
                  ? ''
                  : ' với ' + payout.handName)
            );
          })
          .join(' · ') || 'Ván bài khép lại.';

  async function act(action: PokerAction) {
    setBusy(true);
    const result = await request('game:action', action);
    setBusy(false);
    if (!result.ok) notify(result.error.message);
  }
  function selectPot(multiplier: number) {
    setRaiseTo(
      Math.min(
        maximum,
        Math.max(
          minimum,
          game.currentBet +
            Math.round(((game.pot + game.callAmount) * multiplier) / 10) * 10,
        ),
      ),
    );
  }

  return (
    <section className="poker-game" aria-label="Bàn Poker Texas Hold’em">
      {roleNotice && (
        <aside className="poker-role-notice" role="status">
          <Icon name="spark" size={24} />
          <strong>{roleNotice}</strong>
          <Button
            className="icon-button"
            aria-label="Đóng thông báo vai trò"
            onClick={() => setRoleNotice('')}
          >
            <Icon name="close" size={20} />
          </Button>
        </aside>
      )}
      <div className="poker-stages">
        <strong>
          Ván {game.handNumber}
          {roundOver ? ' · Đã xong' : ''}
        </strong>
        <ol aria-label="Các vòng Poker">
          {stages.map((label, index) => (
            <li
              key={label}
              className={
                index === stage
                  ? 'is-current'
                  : index < stage
                    ? 'is-complete'
                    : ''
              }
              aria-current={index === stage ? 'step' : undefined}
            >
              {label}
            </li>
          ))}
        </ol>
        <span className="poker-blind-note">
          Blinds {POKER_SMALL_BLIND} / {POKER_BIG_BLIND} · chip ảo
        </span>
      </div>

      <div className="poker-table" data-player-count={players.length}>
        <div className="poker-felt" aria-hidden="true" />
        {roundOver && (game.payouts.length > 0 || game.winnerId) && (
          <div
            className="poker-fireworks"
            key={game.handNumber}
            aria-hidden="true"
          >
            {Array.from({ length: 3 }, (_, burst) => (
              <div
                className="poker-firework"
                key={burst}
                style={
                  {
                    '--burst-x': [22, 50, 78][burst] + '%',
                    '--burst-y': [36, 22, 36][burst] + '%',
                    '--burst-delay': burst * 0.3 + 's',
                  } as CSSProperties
                }
              >
                {Array.from({ length: 16 }, (_, particle) => {
                  const angle = (particle * Math.PI) / 8;
                  return (
                    <i
                      key={particle}
                      style={
                        {
                          '--spark-x': Math.cos(angle) * 105 + 'px',
                          '--spark-y': Math.sin(angle) * 105 + 'px',
                          '--spark-color': [
                            'var(--pink)',
                            'var(--blue)',
                            'var(--yellow)',
                            'var(--orange)',
                          ][particle % 4],
                        } as CSSProperties
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
        <div className="poker-center">
          <span className="poker-pot-total">
            <Chip />
            Pot {format(roundOver ? game.lastPot : game.pot)}
          </span>
          <div
            className="poker-community"
            aria-label={game.communityCards.length + ' lá bài chung'}
          >
            {Array.from({ length: 5 }, (_, index) =>
              game.communityCards[index] ? (
                <PlayingCard
                  key={
                    game.handNumber +
                    '-' +
                    index +
                    '-' +
                    game.communityCards[index]!.code
                  }
                  card={game.communityCards[index]}
                />
              ) : (
                <span
                  className="poker-card-slot"
                  key={index}
                  aria-label={
                    'Chờ lá ' +
                    (index < 3
                      ? 'Flop ' + (index + 1)
                      : index === 3
                        ? 'Turn'
                        : 'River')
                  }
                >
                  {index < 3 ? 'FLOP' : index === 3 ? 'TURN' : 'RIVER'}
                </span>
              ),
            )}
          </div>
          <div className="poker-sidepots" aria-label="Các pot">
            {!roundOver &&
              game.sidePots.map((pot, index) => (
                <span key={index}>
                  {index === 0 ? 'Main Pot' : 'Side Pot ' + index} ·{' '}
                  {format(pot.amount)}
                </span>
              ))}
          </div>
        </div>

        {players.map((player, index) => {
          const isTurn = !roundOver && player.id === game.turnId;
          const isSelf = player.id === playerId;
          const payout = game.payouts.find(
            (item) => item.playerId === player.id,
          );
          const roomSeat = room.players.find((item) => item.id === player.id);
          const badges = [
            player.id === game.dealerId && 'D',
            player.id === game.smallBlindId && 'SB',
            player.id === game.bigBlindId && 'BB',
          ].filter(Boolean);
          const status = player.waiting
            ? 'Chờ ván sau'
            : payout
              ? 'Thắng +' + format(payout.amount)
              : player.eliminated
                ? 'Hết chip'
                : player.folded
                  ? 'Folded'
                  : !roomSeat?.online
                    ? roomSeat
                      ? 'Kết nối lại…'
                      : 'Đã rời bàn'
                    : isTurn
                      ? isSelf
                        ? 'Còn ' + seconds + ' giây'
                        : 'Đang nghĩ…'
                      : player.allIn
                        ? 'All-in!'
                        : player.handName
                          ? player.handName
                          : player.roundBet > 0
                            ? 'Call ' + format(player.roundBet)
                            : 'Chờ lượt';
          const style = positionStyle(
            isSelf
              ? [positions[index]![0]!, positions[index]![1]!, 64, 74]
              : positions[index]!,
            isSelf
              ? [
                  compactPositions[index]![0]!,
                  compactPositions[index]![1]!,
                  80,
                  87,
                ]
              : compactPositions[index]!,
          );
          const cards = player.holeCards.length
            ? player.holeCards
            : [undefined, undefined];
          return (
            <div className="poker-seat-position" key={player.id} style={style}>
              {player.roundBet > 0 && !roundOver && (
                <div
                  className="poker-bet"
                  aria-label={
                    nameFor(player.id, player.nickname) +
                    ' đã cược ' +
                    player.roundBet +
                    ' chip'
                  }
                >
                  <Chip />
                  <strong>{format(player.roundBet)}</strong>
                </div>
              )}
              <article
                className={[
                  'poker-seat',
                  isSelf && 'is-you',
                  isTurn && 'is-turn',
                  player.folded && 'is-folded',
                  payout && 'is-winner',
                  player.waiting && 'is-waiting',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={
                  nameFor(player.id, player.nickname) +
                  ', ' +
                  player.chips +
                  ' chip' +
                  (isTurn ? ', đến lượt' : '')
                }
              >
                <div className="poker-seat-body">
                  {badges.map((badge, badgeIndex) => (
                    <span
                      key={String(badge)}
                      style={{ '--badge-index': badgeIndex } as CSSProperties}
                      className={'poker-position position-' + badge}
                      title={
                        badge === 'D'
                          ? 'Dealer'
                          : badge === 'SB'
                            ? 'Small blind'
                            : 'Big blind'
                      }
                    >
                      {badge}
                    </span>
                  ))}
                  {isSelf && isTurn && (
                    <span className="poker-turn-callout">Đến lượt bạn!</span>
                  )}
                  <div className="poker-avatar-ring">
                    <Avatar variant={player.avatar} size={40} />
                    {isTurn && (
                      <svg viewBox="0 0 52 52" aria-hidden="true">
                        <circle
                          cx="26"
                          cy="26"
                          r="23"
                          className="poker-ring-track"
                        />
                        <circle
                          cx="26"
                          cy="26"
                          r="23"
                          className="poker-ring-progress"
                          pathLength="100"
                          strokeDasharray={(seconds / 30) * 100 + ' 100'}
                        />
                      </svg>
                    )}
                  </div>
                  <div className="poker-seat-person">
                    <strong>
                      <PlayerName
                        nickname={player.nickname}
                        code={codeFor(player.id, player.nickname)}
                        own={isSelf}
                      />
                    </strong>
                    <small>
                      <Chip />
                      {format(player.chips)}
                      <span className="sr-only"> chip</span>
                    </small>
                  </div>
                  {isSelf && !player.waiting && (
                    <div
                      className="poker-own-cards"
                      aria-label="Bài riêng của bạn"
                    >
                      {cards.map((card, cardIndex) => (
                        <PlayingCard
                          key={card?.code ?? cardIndex}
                          card={card}
                          hidden={!card}
                        />
                      ))}
                    </div>
                  )}
                  <div className="poker-seat-footer">
                    <span
                      className={[
                        'poker-status-pill',
                        payout && 'is-win',
                        player.allIn && 'is-all-in',
                        player.folded && 'is-fold',
                        isTurn && 'is-active',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={status}
                      role={isTurn ? 'timer' : undefined}
                      aria-label={
                        isTurn
                          ? nameFor(player.id, player.nickname) +
                            ', còn ' +
                            seconds +
                            ' giây'
                          : undefined
                      }
                    >
                      {!roomSeat?.online && (
                        <i className="offline-dot" aria-hidden="true" />
                      )}
                      {status}
                    </span>
                    {!isSelf && !player.folded && !player.waiting && (
                      <div
                        className="poker-seat-cards"
                        aria-label={
                          'Bài riêng của ' + nameFor(player.id, player.nickname)
                        }
                      >
                        {cards.map((card, cardIndex) => (
                          <PlayingCard
                            key={card?.code ?? cardIndex}
                            card={card}
                            hidden={!card}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      <div className="poker-action-bar" aria-label="Hành động Poker">
        {roundOver ? (
          <div className="poker-hand-result">
            <div aria-live="polite">
              {game.status === 'finished' && (
                <span className="eyebrow">GIẢI ĐẤU KHÉP LẠI</span>
              )}
              <p>{resultText}</p>
            </div>
            {isHost ? (
              <Button
                color="green"
                disabled={!canStart || busy}
                onClick={onStart}
              >
                {game.status === 'finished' ? 'Giải mới' : 'Chia ván tiếp'}
                <Icon name="arrow" size={20} />
              </Button>
            ) : (
              <span className="poker-next-hint">
                Chờ chủ phòng{' '}
                {game.status === 'finished' ? 'mở giải mới' : 'chia ván tiếp'}{' '}
                nhé.
              </span>
            )}
            {game.status === 'finished' && (
              <Button color="white" onClick={onLeave}>
                Về sảnh
              </Button>
            )}
          </div>
        ) : !self ? (
          <p className="poker-spectator-note">
            <Icon name="eye" size={22} />
            {room.players.some((player) => player.id === playerId)
              ? 'Bạn đã nhận ghế. Đợi ván sau để được chia bài nhé!'
              : 'Bạn đang xem bàn. Cùng trò chuyện với mọi người nhé!'}
          </p>
        ) : (
          <>
            <Button
              color="pink"
              className="poker-fold-action"
              disabled={!canAct}
              onClick={() => void act({ type: 'fold' })}
            >
              Fold
            </Button>
            <Button
              color="blue"
              className="poker-call-action"
              disabled={!canAct}
              onClick={() =>
                void act(
                  game.callAmount > 0 ? { type: 'call' } : { type: 'check' },
                )
              }
            >
              {game.callAmount > 0
                ? 'Call ' + format(game.callAmount)
                : 'Check'}
            </Button>
            <div className="poker-raise-control">
              <div className="poker-raise-heading">
                <label htmlFor="poker-raise-amount">
                  {game.currentBet ? 'Raise to' : 'Bet'}
                </label>
                <input
                  id="poker-raise-amount"
                  className="poker-raise-value"
                  type="number"
                  inputMode="numeric"
                  min={minimum}
                  max={maximum}
                  step={1}
                  value={raiseTo}
                  aria-label="Nhập mức Bet / Raise"
                  aria-describedby="poker-raise-hint"
                  aria-invalid={!validRaise}
                  disabled={!canEditRaise}
                  onChange={(event) =>
                    setRaiseTo(
                      Number.isFinite(event.target.valueAsNumber)
                        ? event.target.valueAsNumber
                        : '',
                    )
                  }
                  onBlur={() => setRaiseTo(selectedRaise)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
                <small id="poker-raise-hint">
                  {!validRaise && canEditRaise
                    ? `Nhập số nguyên từ ${format(minimum)} đến ${format(maximum)}.`
                    : canRaise
                      ? 'tối thiểu ' +
                        format(minimum) +
                        ' · tối đa ' +
                        format(maximum)
                      : canAct
                        ? 'chỉ có thể Call hoặc All-in'
                        : 'chờ tới lượt bạn'}
                </small>
              </div>
              <input
                id="poker-raise"
                type="range"
                min={minimum}
                max={maximum}
                step={1}
                value={selectedRaise}
                aria-label="Raise amount"
                disabled={!canRaise}
                onChange={(event) => setRaiseTo(Number(event.target.value))}
              />
              <div
                className="poker-quick-bets"
                aria-label="Chọn nhanh mức cược"
              >
                <Button disabled={!canRaise} onClick={() => selectPot(0.5)}>
                  ½ Pot
                </Button>
                <Button disabled={!canRaise} onClick={() => selectPot(1)}>
                  Pot
                </Button>
                <Button
                  color="green"
                  disabled={!canAct}
                  onClick={() => setRaiseTo(maximum)}
                >
                  All-in · {format(maximum)}
                </Button>
              </div>
            </div>
            <Button
              color="orange"
              className="poker-raise-action"
              disabled={
                !canAct || !validRaise || (selectedRaise < maximum && !canRaise)
              }
              onClick={() =>
                void act(
                  selectedRaise >= maximum
                    ? { type: 'all-in' }
                    : { type: 'raise', raiseTo: selectedRaise },
                )
              }
            >
              {selectedRaise >= maximum
                ? 'All-in '
                : game.currentBet
                  ? 'Raise '
                  : 'Bet '}
              {format(selectedRaise)}
            </Button>
          </>
        )}
      </div>
      <p className="poker-money-note">
        Chip ảo, chơi cho vui, không quy đổi tiền.
      </p>
      {!connected && (
        <p className="notice">Đang kết nối lại. Hãy ở lại bàn nhé!</p>
      )}
    </section>
  );
}
