import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameArt, HeroArt, Icon } from '../components/Art';
import { Button, Dialog } from '../components/UI';
import { games, type GameId } from '../lib/catalog';
import { useGameStore } from '../store/useGameStore';
import { request } from '../lib/socket';
import { useSession } from '../store/useSession';
import { Link, useNavigate } from 'react-router';

export function Lobby({
  onProfile,
  notify,
}: {
  onProfile: () => void;
  notify: (text: string) => void;
}) {
  const [code, setCode] = useState(
    new URLSearchParams(window.location.search)
      .get('room')
      ?.slice(0, 4)
      .toUpperCase() ?? '',
  );
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<GameId | null>(null);
  const [create, setCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const { lobby, room } = useGameStore();
  const playerId = useSession((state) => state.playerId);
  const navigate = useNavigate();
  async function createRoom(gameId: 'caro' | 'poker' = 'caro') {
    setBusy(true);
    const payload =
      gameId === 'poker'
        ? { gameId: 'poker' as const, maxPlayers: 8 as const }
        : { gameId: 'caro' as const, maxPlayers: 2 as const };
    const result = await request('room:create', payload);
    setBusy(false);
    if (!result.ok) notify(result.error.message);
    else {
      setCreate(false);
      setSelected(null);
      navigate(`/room/${result.code}`);
    }
  }
  async function joinRoom(code: string) {
    setBusy(true);
    const result = await request('room:join', { code });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      notify(result.error.message);
    } else navigate(`/room/${result.code}`);
  }
  async function spectateRoom(code: string) {
    setBusy(true);
    const result = await request('room:spectate', { code });
    setBusy(false);
    if (!result.ok) {
      notify(result.error.message);
      return;
    }
    navigate(`/room/${code}`);
  }
  const game = games.find((g) => g.id === selected);
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="tiny-star">✦</span> GÓC CHƠI NHỎ, NIỀM VUI TO
          </div>
          <h1 id="hero-title">
            Hết giờ họp rồi,
            <br />
            <span className="title-sticker">vào chơi thôi!</span>
          </h1>
          <p>
            Gác công việc một chút, kéo đồng nghiệp vào cuộc.
            <br className="desktop-break" /> Chơi cùng nhau, vui hơn nhiều!
          </p>
          <div className="hero-notes">
            <span>
              <Icon name="users" size={20} /> Người thật, vui thật
            </span>
            <span>
              <Icon name="check" size={20} /> Không cần tài khoản
            </span>
          </div>
        </div>
        <HeroArt />
      </section>
      <section className="join-bar panel" aria-label="Vào hoặc tạo phòng">
        <div className="join-heading">
          <span className="circle-icon bg-purple">
            <Icon name="pad" size={28} />
          </span>
          <div>
            <h2>Có mã phòng?</h2>
            <p>Đồng đội đang chờ bạn đó!</p>
          </div>
        </div>
        <form
          className="join-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^[A-HJKMNP-Z2-9]{4}$/.test(code)) {
              setError('Mã gồm 4 chữ/số, không dùng I, O, L, 0, 1.');
              return;
            }
            setError('');
            void joinRoom(code);
          }}
        >
          <label className="sr-only" htmlFor="room-code">
            Mã phòng 4 ký tự
          </label>
          <input
            id="room-code"
            className="code-input"
            placeholder="ABCD"
            value={code}
            maxLength={4}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? 'room-code-error' : undefined}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError('');
            }}
          />
          <Button type="submit" color="green" disabled={busy}>
            Vào phòng <Icon name="arrow" size={20} />
          </Button>
          <Button
            type="button"
            color="cream"
            className="icon-button spectator-button"
            aria-label={`Xem phòng ${code || 'theo mã'} với tư cách spectator`}
            title="Vào xem và trò chuyện, không chiếm ghế chơi"
            disabled={busy || !/^[A-HJKMNP-Z2-9]{4}$/.test(code)}
            onClick={() => void spectateRoom(code)}
          >
            <Icon name="eye" />
          </Button>
        </form>
        <span className="join-or">hoặc</span>
        <Button color="orange" onClick={() => setCreate(true)}>
          <Icon name="plus" size={20} /> Tạo phòng mới
        </Button>
        {error && (
          <p
            className="field-error join-error"
            id="room-code-error"
            role="alert"
          >
            {error}
          </p>
        )}
      </section>
      {room && (
        <div className="notice resume-room">
          {room.spectators.some((viewer) => viewer.id === playerId)
            ? 'Bạn đang xem phòng'
            : 'Bạn đang có ghế ở phòng'}{' '}
          <strong>{room.code}</strong>
          <Link className="button bg-blue" to={`/room/${room.code}`}>
            Về phòng{' '}
            {room.spectators.some((viewer) => viewer.id === playerId)
              ? 'xem'
              : ''}
          </Link>
        </div>
      )}
      <section className="games-section" aria-labelledby="games-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HÔM NAY CHƠI GÌ?</span>
            <h2 id="games-title">Chọn trò, gọi đồng đội!</h2>
          </div>
          <span className="little-note">
            4 trò quen · cả hội cùng vui <Icon name="spark" size={22} />
          </span>
        </div>
        <div className="game-grid">
          {games.map((g, i) => (
            <motion.article
              key={g.id}
              className={`game-card panel bg-${g.color}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: [0, 1.06, 1] }}
              transition={{ duration: 0.48, delay: i * 0.1, ease: 'easeOut' }}
            >
              <div className="card-topline">
                <span className="player-count">
                  <Icon name="users" size={16} />
                  {g.players}
                </span>
                <span className="game-number">0{i + 1}</span>
              </div>
              <GameArt game={g.id} />
              <div className="game-tag">{g.tag}</div>
              <h3>{g.name}</h3>
              <p>{g.line}</p>
              <Button className="full-width" onClick={() => setSelected(g.id)}>
                {g.id === 'caro' || g.id === 'poker' ? 'Chơi ngay' : 'Khám phá'}{' '}
                <Icon name="arrow" size={20} />
              </Button>
            </motion.article>
          ))}
        </div>
        <p className="release-note">
          <span className="label-pill">CARO &amp; POKER ĐÃ MỞ BÀN</span> Rủ đồng
          nghiệp, làm một ván thôi!
        </p>
      </section>
      <section className="rooms-section" aria-labelledby="rooms-title">
        <div className="section-heading">
          <h2 id="rooms-title">
            Phòng đang mở{' '}
            <span className="count-badge">{lobby.rooms.length}</span>
          </h2>
          <span className="little-note">Có bạn, có hội, có vui.</span>
        </div>
        {lobby.rooms.length > 0 ? (
          <div className="room-list">
            {lobby.rooms.map((r) => (
              <div className="room-row panel" key={r.code}>
                <span className="room-code-badge">{r.code}</span>
                <div>
                  <h3>{games.find((game) => game.id === r.gameId)?.name}</h3>
                  <p>
                    Chủ phòng: {r.hostName} · {r.count}/{r.maxPlayers} người ·{' '}
                    {r.spectatorCount} đang xem ·{' '}
                    {r.status === 'playing'
                      ? 'Đang chơi'
                      : r.status === 'finished'
                        ? 'Vừa xong ván'
                        : 'Chờ đồng đội'}
                  </p>
                </div>
                <div className="room-row-actions">
                  <Button
                    color="green"
                    disabled={
                      busy ||
                      (r.count >= r.maxPlayers && room?.code !== r.code) ||
                      (r.status === 'playing' && room?.code !== r.code)
                    }
                    onClick={() => void joinRoom(r.code)}
                  >
                    {room?.code === r.code
                      ? 'Về phòng'
                      : r.count >= r.maxPlayers
                        ? 'Đã đủ người'
                        : 'Vào phòng'}
                  </Button>
                  <Button
                    color="cream"
                    className="icon-button spectator-button"
                    aria-label={`Xem phòng ${r.code} với tư cách spectator`}
                    title="Vào xem và trò chuyện cùng mọi người"
                    disabled={busy}
                    onClick={() => void spectateRoom(r.code)}
                  >
                    <Icon name="eye" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-rooms panel">
            <span className="empty-illustration">
              <Icon name="users" size={48} />
            </span>
            <div>
              <h3>Chưa có kèo nào. Rủ hội mình nhé?</h3>
              <p>Tạo phòng Cờ caro, gửi mã cho một đồng nghiệp!</p>
            </div>
            <Button
              color="cream"
              onClick={() => void createRoom()}
              disabled={busy}
            >
              Tạo phòng Cờ caro <Icon name="arrow" size={20} />
            </Button>
          </div>
        )}
      </section>
      {selected && game && (
        <Dialog title={game.name} onClose={() => setSelected(null)}>
          <div className={`game-preview bg-${game.color}`}>
            <GameArt game={game.id} />
          </div>
          <p>
            {game.line} Dành cho {game.players}.
          </p>
          <p>
            {game.id === 'caro'
              ? 'Bàn 15 × 15. Nối 5 quân liên tiếp để thắng. Mỗi nước đi có 30 giây.'
              : game.id === 'telephone'
                ? 'Viết → vẽ → đoán. Mỗi lần truyền tay lại thêm một chuyện cười.'
                : game.id === 'ludo'
                  ? 'Đổ 6 để ra quân, đá quân đối thủ và đưa đủ 4 quân về đích.'
                  : 'Texas Hold’em. Mỗi người bắt đầu với 1.000 chip ảo. Chip ảo, chơi cho vui, không quy đổi tiền.'}
          </p>
          <div className="notice">
            {game.id === 'caro' || game.id === 'poker'
              ? 'Chơi cùng một đồng nghiệp thật. Gửi link mời rồi bắt đầu!'
              : 'Bàn chơi đang được chuẩn bị. Mọi đối thủ đều là đồng nghiệp thật.'}
          </div>
          <Button
            className="full-width"
            color={game.color}
            disabled={busy}
            onClick={() => {
              if (game.id === 'caro' || game.id === 'poker') {
                void createRoom(game.id);
                return;
              }
              setSelected(null);
              onProfile();
            }}
          >
            {game.id === 'caro' || game.id === 'poker'
              ? `Tạo phòng ${game.name}`
              : 'Chuẩn bị tên & avatar'}
          </Button>
        </Dialog>
      )}
      {create && (
        <Dialog title="Tạo một kèo vui" onClose={() => setCreate(false)}>
          <p>Chọn trò cả hội yêu thích.</p>
          <div className="create-choices">
            {games.map((g) => (
              <button
                key={g.id}
                className={`game-choice bg-${g.color}`}
                disabled={busy}
                onClick={() => {
                  if (g.id === 'caro' || g.id === 'poker') {
                    void createRoom(g.id);
                    return;
                  }
                  setCreate(false);
                  setSelected(g.id);
                }}
              >
                <GameArt game={g.id} />
                <span>
                  {g.name}
                  <small>{g.players}</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
          <div className="notice">
            Cờ caro dành cho 2 người; Poker Texas Hold’em nhận 2–8 người, blind
            10/20 và 30 giây mỗi lượt. Chip chỉ dùng để chơi vui, không quy đổi
            tiền.
          </div>
        </Dialog>
      )}
    </>
  );
}
