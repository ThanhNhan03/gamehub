import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router';
import { MotionConfig } from 'framer-motion';
import { Avatar, Icon } from './components/Art';
import { Button, Dialog } from './components/UI';
import { useSession } from './store/useSession';
import { socket } from './lib/socket';
import { Lobby } from './pages/Lobby';
import { DesignSystem } from './pages/DesignSystem';
import './styles.css';

function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  const session = useSession();
  const [profile, setProfile] = useState(false);
  const [nickname, setNickname] = useState(session.nickname);
  const [avatar, setAvatar] = useState(session.avatar);
  const [code, setCode] = useState(
    sessionStorage.getItem('gamehub-office-code') ?? '',
  );
  const [online, setOnline] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  useEffect(() => {
    document.documentElement.dataset.theme = session.theme;
  }, [session.theme]);
  useEffect(() => {
    if (!session.nickname) return;
    socket.auth = {
      playerId: session.playerId,
      nickname: session.nickname,
      avatar: session.avatar,
      accessCode: sessionStorage.getItem('gamehub-office-code') ?? '',
    };
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [session.playerId, session.nickname, session.avatar]);
  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      setError('');
      setProfile(false);
    };
    const onDisconnect = () => {
      setConnected(false);
      setOnline(null);
    };
    const onError = (e: Error) => {
      setConnected(false);
      if (
        e.message.includes('Mã văn phòng') ||
        e.message.includes('Thông tin')
      ) {
        setError(e.message);
        setProfile(true);
      } else setToast('Chưa kết nối được máy chủ. Đang thử lại...');
    };
    const onPresence = (s: { online: number }) => setOnline(s.online);
    const onRestart = (message: string) => setToast(message);
    socket
      .on('connect', onConnect)
      .on('disconnect', onDisconnect)
      .on('connect_error', onError)
      .on('lobby:state', onPresence)
      .on('server:restarting', onRestart);
    return () => {
      socket
        .off('connect', onConnect)
        .off('disconnect', onDisconnect)
        .off('connect_error', onError)
        .off('lobby:state', onPresence)
        .off('server:restarting', onRestart);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);
  function openProfile() {
    setNickname(session.nickname);
    setAvatar(session.avatar);
    setError('');
    setProfile(true);
  }
  return (
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <div className="site-wrap">
        <header className="site-header">
          <Link
            className="logo"
            to="/"
            aria-label="Góc Chơi Văn Phòng — về sảnh"
          >
            <Icon name="pad" size={54} />
            <span>
              Góc Chơi<small>Văn Phòng</small>
            </span>
          </Link>
          <nav className="header-actions" aria-label="Cá nhân và giao diện">
            <span className="presence">
              <i className={connected ? 'online-dot' : 'offline-dot'} />
              {online === null
                ? 'Chưa kết nối'
                : `${online} đồng nghiệp online`}
            </span>
            <Button
              className="profile-chip"
              aria-label="Chọn tên và avatar"
              onClick={openProfile}
            >
              <Avatar variant={session.avatar} />
              <span>{session.nickname || 'Bạn tên gì nhỉ?'}</span>
            </Button>
            <Button
              className="icon-button"
              onClick={session.toggleTheme}
              aria-label={
                session.theme === 'light'
                  ? 'Bật giao diện tối'
                  : 'Bật giao diện sáng'
              }
            >
              <Icon name={session.theme === 'light' ? 'moon' : 'sun'} />
            </Button>
          </nav>
        </header>
        <main id="main">
          <Routes>
            <Route
              path="/"
              element={<Lobby onProfile={openProfile} notify={setToast} />}
            />
            <Route
              path="/design-system"
              element={<DesignSystem notify={setToast} />}
            />
            <Route
              path="*"
              element={
                <div className="panel empty-state">
                  <h1>Lạc phòng rồi!</h1>
                  <Link className="button bg-green" to="/">
                    Về sảnh thôi
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="footer">
          <Link to="/design-system">Bộ giao diện</Link>
          <span>Một chút nghỉ tay. Một ngày nhiều vui.</span>
          <span>GameHub · Văn phòng</span>
        </footer>
      </div>
      <div className="ticker">
        <div>
          AI THẮNG HÔM NAY BAO TRÀ SỮA CHIỀU <span>✦</span> THUA CARO KHÔNG ĐƯỢC
          ĐỔ LỖI CHO CHUỘT <span>✦</span> CHIP ẢO, NIỀM VUI THẬT <span>✦</span>{' '}
          AI THẮNG HÔM NAY BAO TRÀ SỮA CHIỀU
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {profile && (
        <Dialog
          title="Điểm danh trước khi chơi!"
          onClose={() => setProfile(false)}
        >
          <p>Chọn một gương mặt, thêm một cái tên. Thế là quen!</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const clean = nickname.trim();
              if (!clean) {
                setError('Cho mọi người biết tên bạn nhé.');
                return;
              }
              sessionStorage.setItem('gamehub-office-code', code);
              session.saveProfile(clean, avatar);
              socket.auth = {
                playerId: session.playerId,
                nickname: clean,
                avatar,
                accessCode: code,
              };
              socket.disconnect().connect();
              setError('');
            }}
          >
            <label className="field">
              Biệt danh của bạn
              <input
                autoFocus
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={24}
                required
                placeholder="Ví dụ: Minh mê cờ"
              />
            </label>
            <fieldset className="avatar-picker">
              <legend>Chọn gương mặt đại diện</legend>
              {Array.from({ length: 8 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Gương mặt ${i + 1}`}
                  aria-pressed={avatar === i}
                  onClick={() => setAvatar(i)}
                >
                  <Avatar variant={i} size={52} />
                </button>
              ))}
            </fieldset>
            <label className="field">
              Mã văn phòng{' '}
              <span className="helper">(nếu văn phòng có đặt)</span>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={128}
                autoComplete="off"
                placeholder="Nhập mã được chia sẻ"
              />
            </label>
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" color="green" className="full-width">
              Vào chơi <Icon name="arrow" />
            </Button>
          </form>
        </Dialog>
      )}
    </MotionConfig>
  );
}
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
