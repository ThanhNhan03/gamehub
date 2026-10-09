import { useEffect, useId, useRef, useState } from 'react';
import type { RoomView } from '@gamehub/shared';
import { useSession } from '../store/useSession';
import { useGameStore } from '../store/useGameStore';
import { request } from '../lib/socket';
import { Button } from './UI';
import { Icon } from './Art';
import { createPlayerLabels } from '../lib/playerNames';
import { PlayerName } from './PlayerName';
export function ChatPanel({
  room,
  notify,
}: {
  room: RoomView;
  notify: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const { codeFor } = createPlayerLabels(room);
  const inputId = useId();
  const [sending, setSending] = useState(false);
  const connected = useGameStore((s) => s.connected);
  const playerId = useSession((s) => s.playerId);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [room.chat.at(-1)?.id]);
  return (
    <section className="chat-panel panel" aria-label="Chat trong phòng">
      <div className="chat-heading">
        <h2>Chuyện bên bàn</h2>
        <span className="label-pill">
          {[...room.players, ...room.spectators].filter((p) => p.online).length}{' '}
          ONLINE
        </span>
      </div>
      <div
        className="chat-messages"
        ref={list}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {room.chat.length === 0 ? (
          <p className="chat-empty">
            Chào đồng đội một tiếng nhé!
            <br />
            Tin nhắn chỉ ở trong phòng này.
          </p>
        ) : (
          room.chat.map((message) => (
            <div
              className={`room-chat-bubble ${message.playerId === playerId ? 'own' : ''}`}
              key={message.id}
            >
              <div>
                <strong>
                  <PlayerName
                    nickname={
                      message.playerId === playerId ? 'Bạn' : message.nickname
                    }
                    code={codeFor(message.playerId, message.nickname)}
                  />
                </strong>
                <time dateTime={new Date(message.sentAt).toISOString()}>
                  {new Date(message.sentAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <p>{message.text}</p>
            </div>
          ))
        )}
      </div>
      <form
        className="chat-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || sending) return;
          setSending(true);
          const result = await request('chat:send', { text });
          setSending(false);
          if (result.ok) setText('');
          else notify(result.error.message);
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          Tin nhắn trong phòng
        </label>
        <input
          id={inputId}
          maxLength={300}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nói gì vui vui đi..."
          disabled={!connected}
          autoComplete="off"
        />
        <Button
          type="submit"
          color="blue"
          className="icon-button"
          aria-label="Gửi tin nhắn"
          disabled={!connected || sending || !text.trim()}
        >
          <Icon name="arrow" />
        </Button>
      </form>
    </section>
  );
}
