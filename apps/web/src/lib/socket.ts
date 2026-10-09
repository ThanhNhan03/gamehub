import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents, Result } from '@gamehub/shared';
import { useGameStore } from '../store/useGameStore';
import { useSession } from '../store/useSession';
export const socket: Socket<ServerEvents, ClientEvents> = io({
  autoConnect: false,
});
export function connectSession() {
  const session = useSession.getState();
  if (!session.nickname) return;
  useGameStore.setState({ connecting: true, error: '' });
  socket.auth = {
    playerId: session.playerId,
    sessionToken: session.sessionToken,
    nickname: session.nickname,
    avatar: session.avatar,
    accessCode: sessionStorage.getItem('gamehub-office-code') ?? '',
  };
  socket.disconnect().connect();
}
export async function request<K extends keyof ClientEvents>(
  event: K,
  payload: Parameters<ClientEvents[K]>[0],
): Promise<Result> {
  if (!socket.connected)
    return {
      ok: false,
      error: {
        code: 'DISCONNECTED',
        message: 'Đang kết nối lại, bạn chờ một chút nhé.',
      },
    };
  try {
    return await (
      socket.timeout(5000).emitWithAck as (
        event: K,
        payload: Parameters<ClientEvents[K]>[0],
      ) => Promise<Result>
    )(event, payload);
  } catch {
    return {
      ok: false,
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Chưa nhận được phản hồi. Kiểm tra kết nối rồi thử lại nhé.',
      },
    };
  }
}
socket.on('connect', () => {
  const code = useSession.getState().roomCode;
  useGameStore.setState({
    connected: true,
    authorized: true,
    connecting: false,
    error: '',
    restarting: '',
    roomError: '',
    restoring: !!code,
  });
  if (code)
    void request('room:rejoin', { code }).then((result) => {
      if (!result.ok) {
        useSession.getState().rememberRoom(null);
        useGameStore.setState({
          room: null,
          game: null,
          roomError: result.error.message,
        });
      }
      useGameStore.setState({ restoring: false });
    });
});
socket.on('disconnect', () =>
  useGameStore.setState({ connected: false, connecting: false }),
);
socket.on('connect_error', (error) => {
  const denied =
    error.message.includes('Mã văn phòng') ||
    error.message.includes('Thông tin');
  useGameStore.setState({
    connected: false,
    connecting: false,
    error: denied
      ? error.message
      : 'Chưa kết nối được máy chủ. Bạn thử lại nhé.',
    ...(denied ? { authorized: false } : {}),
  });
});
socket.on('lobby:state', (lobby) => useGameStore.setState({ lobby }));
socket.on('room:state', (room) => {
  useGameStore.setState({ room, ...(!room ? { game: null } : {}) });
  useSession.getState().rememberRoom(room?.code ?? null);
});
socket.on('game:view', (game) => useGameStore.setState({ game }));
socket.on('server:restarting', (restarting) =>
  useGameStore.setState({ restarting }),
);
