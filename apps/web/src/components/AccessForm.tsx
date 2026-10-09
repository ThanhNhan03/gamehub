import { useState, type ReactNode } from 'react';
import { Avatar, Icon } from './Art';
import { Button } from './UI';
import { useSession } from '../store/useSession';
import { useGameStore } from '../store/useGameStore';
import { connectSession } from '../lib/socket';
export function AccessForm({ children }: { children?: ReactNode }) {
  const session = useSession();
  const { connecting, error } = useGameStore();
  const [nickname, setNickname] = useState(session.nickname);
  const [avatar, setAvatar] = useState(session.avatar);
  const [code, setCode] = useState(
    sessionStorage.getItem('gamehub-office-code') ?? '',
  );
  const [localError, setLocalError] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const clean = nickname.trim();
        if (!clean) {
          setLocalError('Cho mọi người biết tên bạn nhé.');
          return;
        }
        setLocalError('');
        sessionStorage.setItem('gamehub-office-code', code);
        session.saveProfile(clean, avatar);
        connectSession();
      }}
    >
      {children}
      <label className="field">
        Biệt danh của bạn
        <input
          autoFocus
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={24}
          required
          autoComplete="nickname"
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
        Mã văn phòng <span className="helper">(nếu văn phòng có đặt)</span>
        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={128}
          autoComplete="off"
          placeholder="Nhập mã được chia sẻ"
        />
      </label>
      {(localError || error) && (
        <p className="field-error" role="alert">
          {localError || error}
        </p>
      )}
      <Button
        type="submit"
        color="green"
        className="full-width"
        disabled={connecting}
      >
        {connecting ? 'Đang kết nối...' : 'Vào chơi'}
        <Icon name="arrow" />
      </Button>
    </form>
  );
}
