import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { TURN_MS, RECONNECT_MS } from '@gamehub/shared';
import { useGameStore } from '../store/useGameStore';
import { useSession } from '../store/useSession';
import { request } from '../lib/socket';
import { Avatar, GameArt, Icon } from '../components/Art';
import { Button, Dialog } from '../components/UI';
import { ChatPanel } from '../components/ChatPanel';
import { CaroBoard } from '../games/caro/CaroBoard';

export function RoomPage({ notify }: { notify: (text: string) => void }) {
  const { code: rawCode = '' } = useParams();
  const code = rawCode.toUpperCase();
  const navigate = useNavigate();
  const { room, game, connected, restoring, roomError } = useGameStore();
  const session = useSession();
  const [pending, setPending] = useState(false);
  const [seatBusy, setSeatBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const attempted = useRef('');
  const offset = useMemo(
    () => (room?.serverTime ?? Date.now()) - Date.now(),
    [room?.serverTime],
  );
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (room?.code === code) {
      attempted.current = code;
      return;
    }
    if (
      !connected ||
      restoring ||
      !!roomError ||
      session.roomCode === code ||
      attempted.current === code
    )
      return;
    attempted.current = code;
    void request('room:join', { code }).then((result) => {
      if (!result.ok) {
        notify(result.error.message);
        navigate('/');
      }
    });
  }, [
    connected,
    restoring,
    roomError,
    room?.code,
    code,
    session.roomCode,
    navigate,
    notify,
  ]);
  async function leave() {
    attempted.current = code;
    setPending(true);
    const result = await request('room:leave', {});
    setPending(false);
    if (result.ok) {
      setLeaveOpen(false);
      navigate('/');
    } else notify(result.error.message);
  }
  async function begin(rematch: boolean) {
    setPending(true);
    const result = await request(rematch ? 'room:rematch' : 'room:start', {});
    setPending(false);
    if (!result.ok) notify(result.error.message);
  }
  async function requestSeat() {
    setSeatBusy(true);
    const result = await request('room:seat-request', {});
    setSeatBusy(false);
    if (!result.ok) notify(result.error.message);
  }
  async function answerInvite(accept: boolean) {
    setSeatBusy(true);
    const result = await request('room:seat-invite-response', { accept });
    setSeatBusy(false);
    if (!result.ok) notify(result.error.message);
    else if (accept) notify('Bạn đã nhận ghế chơi trong phòng!');
  }
  async function inviteViewer(spectatorId: string) {
    setSeatBusy(true);
    const result = await request('room:seat-invite', { spectatorId });
    setSeatBusy(false);
    if (!result.ok) notify(result.error.message);
  }
  async function answerSeatRequest(spectatorId: string, accept: boolean) {
    setSeatBusy(true);
    const result = await request('room:seat-request-response', {
      spectatorId,
      accept,
    });
    setSeatBusy(false);
    if (!result.ok) notify(result.error.message);
  }
  if (!room || room.code !== code)
    return (
      <div className="panel room-loading">
        <h2>Đang vào phòng {code}...</h2>
        <p>Chờ đồng đội một chút nhé.</p>
        <Link className="button bg-cream" to="/">
          Về sảnh
        </Link>
      </div>
    );
  const activeGame = game?.roomCode === code ? game : null;
  const isHost = room.hostId === session.playerId;
  const isPlayer = room.players.some(
    (player) => player.id === session.playerId,
  );
  const isSpectator = room.spectators.some(
    (viewer) => viewer.id === session.playerId,
  );
  const ownSpectator = room.spectators.find(
    (viewer) => viewer.id === session.playerId,
  );
  const inviterName = room.players.find(
    (player) => player.id === ownSpectator?.invitedBy,
  )?.nickname;
  const absent = room.players.filter((p) => !p.online);
  const canOfferSeat = room.players.length < 2 && room.status !== 'playing';
  const canStart =
    room.players.length === 2 && absent.length === 0 && connected;
  const seconds = Math.min(
    TURN_MS / 1000,
    Math.max(
      0,
      Math.ceil(((room.deadline ?? now + offset) - (now + offset)) / 1000),
    ),
  );
  const canPlay =
    connected &&
    activeGame?.status === 'playing' &&
    activeGame.turnId === session.playerId &&
    absent.length === 0;
  const chat = <ChatPanel room={room} notify={notify} />;
  return (
    <div className="room-page">
      <div className="room-toolbar">
        <div className="room-title">
          <span className="circle-icon bg-blue">
            <Icon name="pad" size={28} />
          </span>
          <div>
            <span className="eyebrow">HỘI MÌNH CHƠI CARO</span>
            <h1>
              Cờ caro <span className="room-code-badge">{room.code}</span>
            </h1>
            {isSpectator && (
              <span className="label-pill spectator-role">ĐANG XEM</span>
            )}
          </div>
        </div>
        <div className="room-actions">
          <Button
            color="green"
            onClick={async () => {
              const link = new URL(
                `/room/${code}`,
                window.location.origin,
              ).toString();
              try {
                await navigator.clipboard.writeText(link);
                notify(
                  `Đã chép lời mời phòng ${code}. Gửi cho đồng nghiệp thôi!`,
                );
              } catch {
                notify(
                  'Chưa chép được link. Bạn có thể gửi mã phòng ' +
                    code +
                    ' cho đồng nghiệp.',
                );
              }
            }}
          >
            Mời đồng nghiệp <Icon name="users" size={20} />
          </Button>
          <Button
            color="cream"
            disabled={pending}
            onClick={() =>
              room.status === 'playing' && !isSpectator
                ? setLeaveOpen(true)
                : void leave()
            }
          >
            Rời phòng
          </Button>
        </div>
      </div>
      {absent.length > 0 && (
        <div className="waiting-reconnect notice" role="status">
          {absent.map((p) => (
            <span key={p.id}>
              <i className="offline-dot" /> Đang chờ{' '}
              <strong>{p.nickname}</strong> kết nối lại · giữ chỗ{' '}
              {Math.min(
                RECONNECT_MS / 1000,
                Math.max(
                  0,
                  Math.ceil(
                    ((p.reconnectUntil ?? now + offset) - (now + offset)) /
                      1000,
                  ),
                ),
              )}
              s
            </span>
          ))}
          {room.status === 'playing' && (
            <small>Ván và đồng hồ đang tạm dừng.</small>
          )}
        </div>
      )}
      {isSpectator && (
        <section className="spectator-seat-panel panel">
          {ownSpectator?.invitedBy ? (
            <>
              <p>
                Bạn được mời vào chơi{inviterName ? ` bởi ${inviterName}` : ''}.
              </p>
              <Button
                color="green"
                disabled={seatBusy || !connected || !canOfferSeat}
                onClick={() => void answerInvite(true)}
              >
                Nhận lời mời
              </Button>
              <Button
                color="cream"
                disabled={seatBusy}
                onClick={() => void answerInvite(false)}
              >
                Từ chối
              </Button>
              {!canOfferSeat && (
                <small>
                  {room.status === 'playing'
                    ? 'Ghế sẽ mở khi ván kết thúc hoặc có người rời phòng.'
                    : 'Phòng chưa có ghế trống; lời mời vẫn đang chờ.'}
                </small>
              )}
            </>
          ) : (
            <>
              <span>
                Bạn đang xem cùng mọi người; yêu cầu vào chơi khi có ghế trống.
              </span>
              <Button
                color={ownSpectator?.requestedSeat ? 'cream' : 'blue'}
                disabled={seatBusy || !connected}
                onClick={() => void requestSeat()}
              >
                {ownSpectator?.requestedSeat
                  ? 'Hủy yêu cầu'
                  : 'Yêu cầu vào chơi'}
              </Button>
            </>
          )}
        </section>
      )}
      <div className="room-layout">
        <div className="room-play-area">
          <div className="player-panels">
            {(activeGame?.players ?? room.players).map((player, index) => {
              const seat = room.players.find((p) => p.id === player.id);
              const turn =
                activeGame?.status === 'playing' &&
                activeGame.turnId === player.id;
              return (
                <div
                  key={player.id}
                  className={`player-panel panel ${turn ? 'active-player' : ''}`}
                >
                  <Avatar variant={player.avatar} size={52} />
                  <div className="player-info">
                    <strong>
                      {player.nickname}
                      {player.id === session.playerId ? ' · Bạn' : ''}
                    </strong>
                    <small>
                      <i
                        className={seat?.online ? 'online-dot' : 'offline-dot'}
                      />
                      {seat?.online ? 'Đang online' : 'Đã rời / mất kết nối'}
                      {room.hostId === player.id ? ' · Chủ phòng' : ''}
                    </small>
                    {turn && (
                      <span className="turn-label">
                        {absent.length ? 'Đang chờ kết nối' : 'Đến lượt'}
                      </span>
                    )}
                  </div>
                  {activeGame && (
                    <span
                      className={`player-mark mark-${index === 0 ? 'X' : 'O'}`}
                    >
                      {index === 0 ? 'X' : 'O'}
                    </span>
                  )}
                  {turn && absent.length === 0 && (
                    <div
                      className="turn-countdown"
                      role="timer"
                      aria-label={`Còn ${seconds} giây`}
                    >
                      <svg viewBox="0 0 48 48" aria-hidden="true">
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="#FFF4CC"
                          stroke="#2A1B4A"
                          strokeWidth="3"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill="none"
                          stroke="#FF4F8B"
                          strokeWidth="4"
                          strokeDasharray={`${Math.max(0, seconds / (TURN_MS / 1000)) * 126} 126`}
                          transform="rotate(-90 24 24)"
                        />
                      </svg>
                      <strong>{seconds}</strong>
                    </div>
                  )}
                </div>
              );
            })}
            {!activeGame && room.players.length < 2 && (
              <div className="player-panel panel empty-seat">
                <Icon name="plus" size={36} />
                <div>
                  <strong>Ghế này dành cho đồng đội</strong>
                  <small>Gửi mã {code}, rủ một người vào nhé.</small>
                </div>
              </div>
            )}
          </div>
          {room.spectators.length > 0 && (
            <div
              className="spectator-strip panel"
              aria-label="Spectator trong phòng"
            >
              <Icon name="eye" size={20} />
              <strong>{room.spectatorCount} đang xem</strong>
              <div className="spectator-list">
                {room.spectators.map((viewer) => (
                  <span key={viewer.id} className="spectator-person">
                    <Avatar variant={viewer.avatar} size={30} />
                    <span>
                      {viewer.nickname}
                      {viewer.id === session.playerId ? ' · Bạn' : ''}
                    </span>
                    <i
                      className={viewer.online ? 'online-dot' : 'offline-dot'}
                    />
                    {viewer.invitedBy && (
                      <small>
                        Được mời bởi{' '}
                        {room.players.find(
                          (player) => player.id === viewer.invitedBy,
                        )?.nickname ?? 'đồng đội'}
                      </small>
                    )}
                    {isPlayer && canOfferSeat && viewer.online && (
                      <Button
                        color="cream"
                        className="spectator-invite-button"
                        aria-label={`Mời ${viewer.nickname} vào chơi`}
                        disabled={seatBusy || !connected || !!viewer.invitedBy}
                        onClick={() => void inviteViewer(viewer.id)}
                      >
                        {viewer.invitedBy ? 'Đã mời' : 'Mời vào chơi'}
                      </Button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          {isPlayer &&
            room.spectators.some((viewer) => viewer.requestedSeat) && (
              <section
                className="seat-request-list panel"
                aria-label="Yêu cầu vào chơi"
              >
                <h3>Đồng nghiệp muốn vào chơi</h3>
                {room.spectators
                  .filter((viewer) => viewer.requestedSeat)
                  .map((viewer) => (
                    <div className="seat-request-row" key={viewer.id}>
                      <Avatar variant={viewer.avatar} size={38} />
                      <strong>{viewer.nickname}</strong>
                      <Button
                        color="green"
                        disabled={
                          seatBusy ||
                          !connected ||
                          !canOfferSeat ||
                          !viewer.online
                        }
                        onClick={() => void answerSeatRequest(viewer.id, true)}
                      >
                        Cho vào chơi
                      </Button>
                      <Button
                        color="cream"
                        disabled={seatBusy || !connected}
                        onClick={() => void answerSeatRequest(viewer.id, false)}
                      >
                        Bỏ qua
                      </Button>
                    </div>
                  ))}
                {!canOfferSeat && (
                  <small>Yêu cầu sẽ chờ đến khi ghế chơi mở.</small>
                )}
              </section>
            )}
          {!activeGame ? (
            <section className="waiting-room panel">
              <GameArt game="caro" />
              <span className="label-pill">{room.players.length}/2 NGƯỜI</span>
              <h2>Chờ đồng nghiệp tí nhé...</h2>
              <p>Hai người, một bàn cờ. Nối 5 quân liền nhau là thắng!</p>
              <div className="waiting-rules">
                <span>15 × 15 ô</span>
                <span>30 giây / nước</span>
                <span>Người thật với người thật</span>
              </div>
              {isHost ? (
                <>
                  <Button
                    color="green"
                    className="start-game-button"
                    disabled={!canStart || pending}
                    onClick={() => void begin(false)}
                  >
                    Bắt đầu <Icon name="arrow" />
                  </Button>
                  <p className="helper">
                    {canStart
                      ? 'Đủ đội rồi. Chủ phòng bấm bắt đầu nhé!'
                      : 'Cần đủ 2 người đang online để bắt đầu.'}
                  </p>
                </>
              ) : (
                <div className="notice">
                  Đủ đội rồi, chờ chủ phòng bấm bắt đầu nhé!
                </div>
              )}
            </section>
          ) : (
            <>
              {activeGame.status === 'finished' ? (
                <section className="result-banner panel" aria-live="polite">
                  <div className="result-badge">
                    <Icon name="spark" size={40} />
                  </div>
                  <div>
                    <span className="eyebrow">HẾT VÁN, VUI TIẾP!</span>
                    <h2>
                      {activeGame.winnerId
                        ? `${activeGame.players.find((p) => p.id === activeGame.winnerId)?.nickname} thắng rồi!`
                        : 'Hòa rồi! Hai cao thủ ngang tài.'}
                    </h2>
                    <p>
                      {activeGame.reason === 'five'
                        ? 'Năm quân liền nhau. Một nước đi quá đẹp!'
                        : activeGame.reason === 'timeout'
                          ? 'Đối thủ hết 30 giây cho nước đi.'
                          : activeGame.reason === 'absent'
                            ? 'Đối thủ đã rời phòng hoặc quá 60 giây chưa kết nối lại.'
                            : 'Bàn đã đầy. Làm thêm ván nữa nhé?'}
                    </p>
                  </div>
                  <div className="result-actions">
                    {isHost ? (
                      <Button
                        color="green"
                        disabled={!canStart || pending}
                        onClick={() => void begin(true)}
                      >
                        Chơi lại
                      </Button>
                    ) : (
                      <span>Chờ chủ phòng mở ván mới</span>
                    )}
                    <Button
                      color="cream"
                      disabled={pending}
                      onClick={() => void leave()}
                    >
                      Về sảnh
                    </Button>
                  </div>
                  {!canStart && isHost && (
                    <p className="helper">
                      Mời đủ hai người online để chơi lại nhé.
                    </p>
                  )}
                  {activeGame.winnerId && (
                    <div className="confetti-burst" aria-hidden="true">
                      {Array.from({ length: 18 }, (_, i) => (
                        <i
                          key={i}
                          style={{
                            left: `${(i * 37) % 100}%`,
                            background: [
                              '#FF6FA8',
                              '#4CC2FF',
                              '#5BD98B',
                              '#9B7BFF',
                              '#FF9A3C',
                            ][i % 5],
                            animationDelay: `${(i % 5) * 0.06}s`,
                            rotate: `${i * 29}deg`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <div className="turn-status" aria-live="polite">
                  {absent.length
                    ? 'Tạm dừng để chờ đồng đội.'
                    : canPlay
                      ? 'Đến lượt bạn! Chọn một ô trống nhé.'
                      : `Chờ ${activeGame.players.find((p) => p.id === activeGame.turnId)?.nickname} đi một nước...`}
                </div>
              )}
              <CaroBoard
                game={activeGame}
                canPlay={canPlay}
                pending={pending}
                onPlace={async (row, col) => {
                  setPending(true);
                  const result = await request('game:action', {
                    type: 'place',
                    row,
                    col,
                  });
                  setPending(false);
                  if (!result.ok) notify(result.error.message);
                }}
              />
            </>
          )}
        </div>
        <aside className="desktop-chat">{chat}</aside>
      </div>
      <Button
        className="mobile-chat-button"
        color="blue"
        onClick={() => setChatOpen(true)}
      >
        Chuyện bên bàn <span className="label-pill">{room.chat.length}</span>
      </Button>
      {chatOpen && (
        <Dialog title="Chuyện bên bàn" onClose={() => setChatOpen(false)}>
          {chat}
        </Dialog>
      )}
      {leaveOpen && (
        <Dialog title="Rời ván này nhé?" onClose={() => setLeaveOpen(false)}>
          <p>
            Rời phòng trong lúc chơi sẽ xử thua ván này. Bạn vẫn có thể vào lại
            phòng cho ván sau.
          </p>
          <div className="ds-row">
            <Button
              color="pink"
              disabled={pending}
              onClick={() => void leave()}
            >
              Rời phòng
            </Button>
            <Button color="green" onClick={() => setLeaveOpen(false)}>
              Chơi tiếp
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
