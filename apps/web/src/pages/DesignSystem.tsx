import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar, GameArt, Icon } from '../components/Art';
import { Button, Dialog } from '../components/UI';
import { avatarColors, games } from '../lib/catalog';

const tokens = [
  ['Ink', '#2A1B4A'],
  ['Nền vàng', '#FFD84D'],
  ['Chấm bi', '#F5B800'],
  ['Pink', '#FF6FA8'],
  ['Hot pink', '#FF4F8B'],
  ['Blue', '#4CC2FF'],
  ['Deep blue', '#1E88E5'],
  ['Green', '#5BD98B'],
  ['Orange', '#FF9A3C'],
  ['Purple', '#9B7BFF'],
  ['Cream', '#FFF4CC'],
  ['White', '#FFFFFF'],
];
export function DesignSystem({ notify }: { notify: (text: string) => void }) {
  const [chosen, setChosen] = useState(0);
  const [dialog, setDialog] = useState(false);
  return (
    <div className="design-system">
      <Link to="/" className="back-link">
        ← Về sảnh
      </Link>
      <div className="design-intro">
        <span className="eyebrow">BỘ GIAO DIỆN · 01</span>
        <h1>
          Vui từ những
          <br />
          <span className="title-sticker">chi tiết nhỏ.</span>
        </h1>
        <p>
          Màu kẹo, nét đậm, một chút tinh nghịch.
          <br />
          Nền tảng giao diện cho Góc Chơi Văn Phòng.
        </p>
      </div>
      <section className="panel ds-section">
        <h2>01 / Bảng màu</h2>
        <p>
          Nét viền & chữ trên nền kẹo luôn dùng Ink. Bật nút sáng/tối trên thanh
          đầu để xem cả hai giao diện.
        </p>
        <div className="swatches">
          {tokens.map(([name, color]) => (
            <div key={name}>
              <span style={{ background: color }} />
              <strong>{name}</strong>
              <code>{color}</code>
            </div>
          ))}
        </div>
      </section>
      <section className="panel ds-section">
        <h2>02 / Chữ & hình khối</h2>
        <p>Baloo 2 · 600 / 800 · bo thẻ 22px · viền 3px · bóng cứng 4px 4px.</p>
        <div className="type-specimens">
          {[14, 17, 20, 26, 34].map((size) => (
            <div key={size}>
              <code>{size}px</code>
              <span style={{ fontSize: size }}>Thêm một ván nữa thôi!</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel ds-section">
        <h2>03 / Nút & trạng thái</h2>
        <div className="ds-row">
          {['pink', 'blue', 'green', 'orange', 'purple', 'white'].map(
            (color) => (
              <Button
                key={color}
                color={color}
                onClick={() => notify('Bấm một cái, vui một chút!')}
              >
                Vào chơi <Icon name="arrow" size={20} />
              </Button>
            ),
          )}
        </div>
        <div className="ds-states">
          {['default', 'hover', 'focus', 'active', 'disabled'].map((state) => (
            <div key={state}>
              <Button
                color="green"
                className={`demo-${state}`}
                disabled={state === 'disabled'}
                onClick={() => notify('Nút hoạt động rồi nhé!')}
              >
                Bắt đầu
              </Button>
              <small>{state}</small>
            </div>
          ))}
        </div>
        <div className="ds-row">
          <Button
            className="icon-button"
            aria-label="Thêm"
            title="Thêm"
            onClick={() => notify('Đã bấm nút thêm')}
          >
            <Icon name="plus" />
          </Button>
          <span className="label-pill">2–12 NGƯỜI</span>
          <span className="presence">
            <i className="online-dot" />
            Đang online
          </span>
          <span className="presence">
            <i className="offline-dot" />
            Mất kết nối
          </span>
        </div>
      </section>
      <section className="panel ds-section">
        <h2>04 / Ô nhập</h2>
        <div className="ds-inputs">
          <label className="field">
            Mặc định
            <input placeholder="Biệt danh của bạn" />
          </label>
          <label className="field">
            Có nội dung
            <input defaultValue="Minh mê cờ" />
          </label>
          <label className="field">
            Lỗi
            <input
              aria-invalid="true"
              aria-describedby="ds-error"
              defaultValue="AB"
            />
            <span id="ds-error" className="field-error">
              Nhập đủ 4 ký tự nhé.
            </span>
          </label>
          <label className="field">
            Chưa khả dụng
            <input disabled placeholder="Chờ một chút..." />
          </label>
        </div>
      </section>
      <section className="panel ds-section">
        <h2>05 / Hội bạn tám sắc màu</h2>
        <p>Chọn một gương mặt. Viền đánh dấu luôn đi cùng trạng thái chọn.</p>
        <div className="avatar-picker">
          {avatarColors.map((_, i) => (
            <button
              key={i}
              aria-label={`Gương mặt ${i + 1}`}
              aria-pressed={chosen === i}
              onClick={() => setChosen(i)}
            >
              <Avatar variant={i} size={64} />
            </button>
          ))}
        </div>
        <div className="player-sample">
          <Avatar variant={chosen} />
          <div>
            <strong>Bạn · Chủ phòng</strong>
            <small>
              <i className="online-dot" /> Đang online
            </small>
          </div>
          <span className="label-pill">SẴN SÀNG</span>
        </div>
      </section>
      <section className="panel ds-section">
        <h2>06 / Minh họa trò chơi</h2>
        <div className="illustration-grid">
          {games.map((g) => (
            <div key={g.id} className={`bg-${g.color}`}>
              <GameArt game={g.id} />
              <strong>{g.name}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="panel ds-section">
        <h2>07 / Phản hồi & thông báo</h2>
        <div className="ds-row">
          <Button color="purple" onClick={() => setDialog(true)}>
            Mở hộp thoại
          </Button>
          <Button
            color="blue"
            onClick={() =>
              notify('Đã chép lời mời. Rủ đồng nghiệp thôi! (Minh họa)')
            }
          >
            Xem thông báo
          </Button>
        </div>
        <div className="notice">Đang chờ đồng nghiệp kết nối lại...</div>
        <p className="field-error">Mã văn phòng chưa đúng. Thử lại nhé!</p>
        <div className="chat-sample">
          <Avatar variant={2} />
          <div className="chat-bubble">
            <strong>Ví dụ tin nhắn</strong>
            <p>Hết họp rồi, làm một ván không?</p>
          </div>
        </div>
      </section>
      <section className="panel ds-section">
        <h2>08 / Chuyển động có chừng mực</h2>
        <div className="motion-table">
          <div>
            <strong>Nút</strong>
            <span>
              120ms · ease-out · nâng 3px / nghiêng −1,5°; nhấn chìm 4px
            </span>
          </div>
          <div>
            <strong>Thẻ trò chơi</strong>
            <span>480ms · ease-out · 0 → 1,06 → 1; lệch nhau 100ms</span>
          </div>
          <div>
            <strong>Minh họa</strong>
            <span>3s · ease-in-out · nhấp nhô 12px</span>
          </div>
          <div>
            <strong>Nhãn tiêu đề</strong>
            <span>3s · ease-in-out · xoay −2° ↔ 2°</span>
          </div>
          <div>
            <strong>Online</strong>
            <span>1,8s · ease-in-out · co giãn nhẹ, luôn giữ nhãn</span>
          </div>
          <div>
            <strong>Thông báo</strong>
            <span>200ms · ease-out · trượt lên 16px</span>
          </div>
        </div>
        <p>
          Giảm chuyển động: tất cả animation và transition dừng; thông tin vẫn
          hiện đầy đủ.
        </p>
      </section>
      <p className="release-note">
        Các thành phần bàn chơi, xúc xắc, lá bài và kết quả sẽ bổ sung khi duyệt
        từng trò.
      </p>
      {dialog && (
        <Dialog title="Thêm một ván nữa nhé?" onClose={() => setDialog(false)}>
          <p>
            Hộp thoại dùng hành vi bàn phím chuẩn: giữ focus bên trong, Escape
            để đóng và trả focus về nút mở.
          </p>
          <Button
            color="green"
            className="full-width"
            onClick={() => setDialog(false)}
          >
            Được luôn!
          </Button>
        </Dialog>
      )}
    </div>
  );
}
