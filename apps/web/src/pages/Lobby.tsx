import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameArt, HeroArt, Icon } from '../components/Art';
import { Button, Dialog } from '../components/UI';
import { games, type GameId } from '../lib/catalog';

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
            notify(
              'Vào phòng sẽ mở ở bản chơi Cờ caro. Hiện tại bạn có thể xem giao diện sảnh.',
            );
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
          <Button type="submit" color="green">
            Vào phòng <Icon name="arrow" size={20} />
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
                Khám phá <Icon name="arrow" size={20} />
              </Button>
            </motion.article>
          ))}
        </div>
        <p className="release-note">
          <span className="label-pill">ĐANG CHUẨN BỊ</span> Sảnh đã lên đèn. Các
          bàn chơi sẽ lần lượt mở cửa!
        </p>
      </section>
      <section className="rooms-section" aria-labelledby="rooms-title">
        <div className="section-heading">
          <h2 id="rooms-title">
            Phòng đang mở <span className="count-badge">0</span>
          </h2>
          <span className="little-note">Có bạn, có hội, có vui.</span>
        </div>
        <div className="empty-rooms panel">
          <span className="empty-illustration">
            <Icon name="users" size={48} />
          </span>
          <div>
            <h3>Chưa có kèo nào. Rủ hội mình nhé?</h3>
            <p>Tính năng tạo và vào phòng sẽ mở cùng Cờ caro.</p>
          </div>
          <Button color="cream" onClick={onProfile}>
            Chọn tên & avatar <Icon name="arrow" size={20} />
          </Button>
        </div>
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
            Bàn chơi đang được chuẩn bị. Mọi đối thủ đều là đồng nghiệp thật.
          </div>
          <Button
            className="full-width"
            color={game.color}
            onClick={() => {
              setSelected(null);
              onProfile();
            }}
          >
            Chuẩn bị tên & avatar
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
                onClick={() => {
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
            Tạo phòng sẽ mở cùng bản chơi đầu tiên. Hiện tại hãy khám phá các
            trò nhé!
          </div>
        </Dialog>
      )}
    </>
  );
}
