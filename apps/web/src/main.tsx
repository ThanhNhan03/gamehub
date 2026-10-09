import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';
import { MotionConfig } from 'framer-motion';
import { Avatar, Icon } from './components/Art';
import { Button, Dialog } from './components/UI';
import { AccessForm } from './components/AccessForm';
import { useSession } from './store/useSession';
import { useGameStore } from './store/useGameStore';
import { socket, connectSession } from './lib/socket';
import { Lobby } from './pages/Lobby';
import { DesignSystem } from './pages/DesignSystem';
import { RoomPage } from './pages/RoomPage';
import './styles.css';

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const session = useSession();
  const { connected, authorized, lobby, room, roomError, restarting } =
    useGameStore();
  const [profile, setProfile] = useState(false);
  const [toast, setToast] = useState('');
  const previousRoom = useRef<string | null>(null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = session.theme;
  }, [session.theme]);
  useEffect(() => {
    connectSession();
    return () => {
      socket.disconnect();
    };
  }, []);
  useEffect(() => {
    if (room) {
      if (
        previousRoom.current !== room.code &&
        pathname !== `/room/${room.code}`
      )
        navigate(`/room/${room.code}`);
      previousRoom.current = room.code;
    } else if (previousRoom.current) {
      previousRoom.current = null;
      if (pathname.startsWith('/room/')) navigate('/');
    }
  }, [room?.code, pathname, navigate]);
  useEffect(() => {
    if (connected) setProfile(false);
  }, [connected]);
  useEffect(() => {
    if (roomError) {
      setToast(roomError);
      useGameStore.setState({ roomError: '' });
      if (pathname.startsWith('/room/')) navigate('/');
    }
  }, [roomError, pathname, navigate]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
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
              {connected
                ? `${lobby.online} đồng nghiệp online`
                : 'Chưa kết nối'}
            </span>
            <Button
              className="profile-chip"
              aria-label="Chọn tên và avatar"
              onClick={() => setProfile(true)}
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
          {!authorized && pathname !== '/design-system' ? (
            <section className="access-gate panel">
              <span className="eyebrow">ĐIỂM DANH RỒI VÀO CHƠI</span>
              <h1>Chào đồng đội!</h1>
              <p>
                Chọn một gương mặt, thêm một cái tên.
                <br />
                Hội mình đang chờ bạn đó.
              </p>
              <AccessForm />
            </section>
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <Lobby onProfile={() => setProfile(true)} notify={setToast} />
                }
              />
              <Route
                path="/room/:code"
                element={<RoomPage notify={setToast} />}
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
          )}
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
      {restarting && (
        <div className="system-banner" role="alert">
          {restarting}
        </div>
      )}
      {authorized && !connected && (
        <div className="reconnect-overlay" role="status">
          <div className="panel">
            <Icon name="pad" size={50} />
            <h2>Đang kết nối lại...</h2>
            <p>Giữ nguyên trang này nhé. Ghế của bạn được giữ 60 giây.</p>
            <Button color="blue" onClick={connectSession}>
              Thử kết nối lại
            </Button>
          </div>
        </div>
      )}
      {profile && authorized && (
        <Dialog
          title="Điểm danh trước khi chơi!"
          onClose={() => setProfile(false)}
        >
          <p>Chọn một gương mặt, thêm một cái tên. Thế là quen!</p>
          <AccessForm />
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
