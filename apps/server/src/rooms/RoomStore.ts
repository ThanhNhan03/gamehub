import { randomInt, randomUUID } from 'node:crypto';
import {
  caro,
  TURN_MS,
  RECONNECT_MS,
  EMPTY_ROOM_MS,
  type CaroState,
  type PlayerInfo,
  type RoomPlayer,
  type RoomSpectator,
  type RoomView,
  type RoomSummary,
  type ChatMessage,
  type CaroAction,
} from '@gamehub/shared';

export class RoomError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export interface Room {
  code: string;
  hostId: string | null;
  players: RoomPlayer[];
  spectators: RoomSpectator[];
  chat: ChatMessage[];
  game: CaroState | null;
  deadline: number | null;
  remaining: number;
  emptySince: number | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
}
export class RoomStore {
  readonly rooms = new Map<string, Room>();
  readonly membership = new Map<string, string>();
  readonly connections = new Map<string, Set<string>>();
  private absentTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private cleanupTimer: ReturnType<typeof setInterval>;
  constructor(
    private changed: (room: Room) => void,
    private removed: (playerId: string) => void,
    private lobbyChanged: () => void,
  ) {
    this.cleanupTimer = setInterval(() => {
      for (const [code, room] of this.rooms) {
        if (
          room.emptySince !== null &&
          Date.now() - room.emptySince >= EMPTY_ROOM_MS
        ) {
          this.rooms.delete(code);
          for (const member of [...room.players, ...room.spectators]) {
            this.membership.delete(member.id);
            this.clearAbsent(member.id);
            this.removed(member.id);
          }
          if (room.turnTimer) clearTimeout(room.turnTimer);
        }
      }
    }, 30_000);
    this.cleanupTimer.unref();
  }
  dispose() {
    clearInterval(this.cleanupTimer);
    for (const timer of this.absentTimers.values()) clearTimeout(timer);
    for (const room of this.rooms.values())
      if (room.turnTimer) clearTimeout(room.turnTimer);
  }
  isOnline(id: string) {
    return (this.connections.get(id)?.size ?? 0) > 0;
  }
  connect(player: PlayerInfo, socketId: string) {
    const sockets = this.connections.get(player.id) ?? new Set<string>();
    sockets.add(socketId);
    this.connections.set(player.id, sockets);
    const code = this.membership.get(player.id);
    const room = code ? this.rooms.get(code) : undefined;
    let seat = room?.players.find((p) => p.id === player.id);
    if (
      seat &&
      seat.reconnectUntil !== null &&
      Date.now() >= seat.reconnectUntil
    ) {
      this.removePlayer(room!, player.id);
      seat = undefined;
    }
    let viewer = room?.spectators.find((item) => item.id === player.id);
    if (
      viewer?.reconnectUntil !== null &&
      viewer?.reconnectUntil !== undefined &&
      Date.now() >= viewer.reconnectUntil
    ) {
      this.removeSpectator(room!, player.id);
      viewer = undefined;
    }
    if (room && seat) {
      Object.assign(seat, player, { online: true, reconnectUntil: null });
      if (room.game)
        room.game = {
          ...room.game,
          players: room.game.players.map((p) =>
            p.id === player.id ? { ...player } : p,
          ),
        };
      this.clearAbsent(player.id);
      if (
        room.game?.status === 'playing' &&
        room.players.every((p) => p.online) &&
        room.deadline === null
      )
        this.startClock(room, room.remaining);
      this.publish(room);
    } else if (room && viewer) {
      Object.assign(viewer, player, { online: true, reconnectUntil: null });
      this.clearAbsent(player.id);
      this.publish(room);
    } else this.lobbyChanged();
  }
  disconnect(playerId: string, socketId: string) {
    const sockets = this.connections.get(playerId);
    sockets?.delete(socketId);
    if (sockets?.size) return;
    this.connections.delete(playerId);
    const code = this.membership.get(playerId);
    const room = code ? this.rooms.get(code) : undefined;
    const player = room?.players.find((p) => p.id === playerId);
    const viewer = room?.spectators.find((p) => p.id === playerId);
    if (room && viewer) {
      viewer.online = false;
      viewer.reconnectUntil = Date.now() + RECONNECT_MS;
      this.clearAbsent(playerId);
      const timer = setTimeout(() => {
        if (
          !this.isOnline(playerId) &&
          this.membership.get(playerId) === room.code
        )
          this.removeSpectator(room, playerId);
      }, RECONNECT_MS);
      timer.unref();
      this.absentTimers.set(playerId, timer);
      this.publish(room);
      return;
    }
    if (!room || !player) {
      this.lobbyChanged();
      return;
    }
    this.checkDeadline(room);
    player.online = false;
    player.reconnectUntil = Date.now() + RECONNECT_MS;
    if (room.game?.status === 'playing' && room.deadline !== null) {
      room.remaining = Math.max(0, room.deadline - Date.now());
      this.stopClock(room);
    }
    this.clearAbsent(playerId);
    const timer = setTimeout(() => {
      if (
        !this.isOnline(playerId) &&
        this.membership.get(playerId) === room.code
      ) {
        if (room.players.some((item) => item.id === playerId))
          this.removePlayer(room, playerId);
        else this.removeSpectator(room, playerId);
      }
    }, RECONNECT_MS);
    timer.unref();
    this.absentTimers.set(playerId, timer);
    this.publish(room);
  }
  create(player: PlayerInfo) {
    if (this.membership.has(player.id))
      throw new RoomError(
        'ALREADY_IN_ROOM',
        'Bạn đang ở một phòng rồi. Về phòng hoặc rời phòng trước nhé.',
      );
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code: string;
    do {
      code = Array.from(
        { length: 4 },
        () => alphabet[randomInt(alphabet.length)],
      ).join('');
    } while (this.rooms.has(code));
    const room: Room = {
      code,
      hostId: player.id,
      players: [{ ...player, online: true, reconnectUntil: null }],
      chat: [],
      game: null,
      deadline: null,
      remaining: TURN_MS,
      emptySince: null,
      turnTimer: null,
      spectators: [],
    };
    this.rooms.set(code, room);
    this.membership.set(player.id, code);
    this.publish(room);
    return code;
  }
  join(player: PlayerInfo, code: string, rejoin = false) {
    const room = this.rooms.get(code);
    if (!room)
      throw new RoomError(
        'ROOM_NOT_FOUND',
        'Không tìm thấy phòng. Kiểm tra lại mã nhé!',
      );
    const existing = this.membership.get(player.id);
    if (existing === code) {
      this.publish(room);
      return code;
    }
    if (rejoin)
      throw new RoomError(
        'SEAT_EXPIRED',
        'Chỗ cũ đã hết thời gian giữ. Bạn có thể vào phòng lại từ sảnh.',
      );
    if (existing)
      throw new RoomError(
        'ALREADY_IN_ROOM',
        'Rời phòng hiện tại trước khi vào phòng khác nhé.',
      );
    if (room.players.length >= 2)
      throw new RoomError(
        'ROOM_FULL',
        'Phòng đủ hai người rồi. Rủ thêm một kèo mới nhé!',
      );
    if (room.game?.status === 'playing')
      throw new RoomError(
        'GAME_IN_PROGRESS',
        'Phòng đang chơi, chờ ván sau nhé.',
      );
    room.players.push({ ...player, online: true, reconnectUntil: null });
    room.hostId ??= player.id;
    room.emptySince = null;
    this.membership.set(player.id, code);
    this.publish(room);
    return code;
  }
  spectate(player: PlayerInfo, code: string) {
    const room = this.rooms.get(code);
    if (!room)
      throw new RoomError(
        'ROOM_NOT_FOUND',
        'Không tìm thấy phòng. Kiểm tra lại mã nhé!',
      );
    const existing = this.membership.get(player.id);
    if (existing === code) {
      this.publish(room);
      return code;
    }
    if (existing)
      throw new RoomError(
        'ALREADY_IN_ROOM',
        'Rời phòng hiện tại trước khi vào phòng khác nhé.',
      );
    room.spectators.push({
      ...player,
      online: true,
      reconnectUntil: null,
      requestedSeat: false,
      invitedBy: null,
    });
    this.membership.set(player.id, code);
    this.publish(room);
    return code;
  }
  requestSeat(playerId: string) {
    const room = this.forPlayer(playerId);
    const viewer = room.spectators.find((item) => item.id === playerId);
    if (!viewer)
      throw new RoomError(
        'SPECTATOR_ONLY',
        'Chỉ spectator mới gửi yêu cầu vào chơi được.',
      );
    viewer.requestedSeat = !viewer.requestedSeat;
    this.publish(room);
  }
  inviteSpectator(playerId: string, spectatorId: string) {
    const room = this.forPlayer(playerId);
    if (!room.players.some((player) => player.id === playerId))
      throw new RoomError(
        'PLAYER_ONLY',
        'Người chơi trong phòng mới gửi lời mời được.',
      );
    if (room.players.length >= 2 || room.game?.status === 'playing')
      throw new RoomError(
        'SEAT_UNAVAILABLE',
        'Phòng chưa có ghế trống để mời vào chơi.',
      );
    const viewer = room.spectators.find((item) => item.id === spectatorId);
    if (!viewer || !viewer.online || viewer.id === playerId)
      throw new RoomError(
        'SPECTATOR_NOT_FOUND',
        'Spectator này không còn ở trong phòng.',
      );
    if (viewer.invitedBy)
      throw new RoomError(
        'INVITE_PENDING',
        'Spectator này đã có một lời mời đang chờ.',
      );
    viewer.invitedBy = playerId;
    this.publish(room);
  }
  answerSeatRequest(playerId: string, spectatorId: string, accept: boolean) {
    const room = this.forPlayer(playerId);
    if (!room.players.some((player) => player.id === playerId))
      throw new RoomError(
        'PLAYER_ONLY',
        'Chỉ người chơi trong phòng mới duyệt được yêu cầu.',
      );
    const viewer = room.spectators.find((item) => item.id === spectatorId);
    if (!viewer?.requestedSeat)
      throw new RoomError(
        'REQUEST_NOT_FOUND',
        'Yêu cầu vào chơi này không còn nữa.',
      );
    if (accept) this.promoteSpectator(room, viewer);
    else {
      viewer.requestedSeat = false;
      this.publish(room);
    }
  }
  answerSeatInvite(playerId: string, accept: boolean) {
    const room = this.forPlayer(playerId);
    const viewer = room.spectators.find((item) => item.id === playerId);
    if (!viewer?.invitedBy)
      throw new RoomError(
        'INVITE_NOT_FOUND',
        'Không còn lời mời vào chơi đang chờ.',
      );
    if (accept) this.promoteSpectator(room, viewer);
    else {
      viewer.invitedBy = null;
      this.publish(room);
    }
  }
  leave(playerId: string) {
    const room = this.forPlayer(playerId);
    if (room.spectators.some((viewer) => viewer.id === playerId)) {
      this.removeSpectator(room, playerId);
      return;
    }
    this.removePlayer(room, playerId);
  }
  start(playerId: string, rematch: boolean) {
    const room = this.forPlayer(playerId);
    if (room.hostId !== playerId)
      throw new RoomError('HOST_ONLY', 'Chủ phòng mới bắt đầu được nhé.');
    if (room.players.length !== 2 || room.players.some((p) => !p.online))
      throw new RoomError(
        'NEED_PLAYERS',
        'Cần đủ hai đồng nghiệp đang online để bắt đầu.',
      );
    if (room.game?.status === 'playing')
      throw new RoomError('GAME_IN_PROGRESS', 'Ván đang chơi rồi.');
    if (rematch && room.game?.status !== 'finished')
      throw new RoomError(
        'NOT_FINISHED',
        'Chơi xong ván này rồi chơi lại nhé.',
      );
    if (!rematch && room.game)
      throw new RoomError('USE_REMATCH', 'Bấm Chơi lại để mở ván mới nhé.');
    const players = room.players.map(({ id, nickname, avatar }) => ({
      id,
      nickname,
      avatar,
    }));
    // Alternate who holds X on rematch, without changing the host.
    if (rematch && room.game?.players[0]?.id === players[0]?.id)
      players.reverse();
    room.game = caro.init(players);
    this.startClock(room, TURN_MS);
    this.publish(room);
  }
  action(playerId: string, action: CaroAction) {
    const room = this.forPlayer(playerId);
    this.checkDeadline(room);
    if (!room.game || room.game.status !== 'playing')
      throw new RoomError('NO_ACTIVE_GAME', 'Chưa có ván đang chơi.');
    if (room.players.some((p) => !p.online))
      throw new RoomError(
        'WAITING_RECONNECT',
        'Chờ đồng nghiệp kết nối lại một chút nhé.',
      );
    const result = caro.applyAction(room.game, playerId, action);
    if (result.error) throw new RoomError('INVALID_MOVE', result.error);
    room.game = result.state;
    if (caro.isFinished(room.game)) this.stopClock(room);
    else this.startClock(room, TURN_MS);
    this.publish(room);
  }
  chat(playerId: string, text: string) {
    const room = this.forPlayer(playerId);
    const player =
      room.players.find((p) => p.id === playerId) ??
      room.spectators.find((p) => p.id === playerId)!;
    const message: ChatMessage = {
      id: randomUUID(),
      playerId,
      nickname: player.nickname,
      text,
      sentAt: Date.now(),
    };
    room.chat.push(message);
    if (room.chat.length > 50) room.chat.shift();
    this.publish(room);
    return { room, message };
  }
  forPlayer(playerId: string) {
    const code = this.membership.get(playerId);
    const room = code ? this.rooms.get(code) : undefined;
    if (!room)
      throw new RoomError('NOT_IN_ROOM', 'Bạn chưa ở trong phòng nào.');
    return room;
  }
  summary(room: Room): RoomSummary {
    return {
      code: room.code,
      gameId: 'caro',
      hostName: room.players.find((p) => p.id === room.hostId)?.nickname ?? '',
      count: room.players.length,
      maxPlayers: 2,
      spectatorCount: room.spectators.filter((viewer) => viewer.online).length,
      status: room.game?.status ?? 'waiting',
    };
  }
  list() {
    return [...this.rooms.values()]
      .filter((r) => r.players.length > 0)
      .map((r) => this.summary(r));
  }
  view(room: Room): RoomView {
    return {
      ...this.summary(room),
      hostId: room.hostId,
      players: room.players.map((p) => ({ ...p })),
      spectators: room.spectators.map((viewer) => ({ ...viewer })),
      chat: [...room.chat],
      deadline: room.deadline,
      serverTime: Date.now(),
    };
  }
  private publish(room: Room) {
    this.changed(room);
    this.lobbyChanged();
  }
  private clearAbsent(playerId: string) {
    const timer = this.absentTimers.get(playerId);
    if (timer) clearTimeout(timer);
    this.absentTimers.delete(playerId);
  }
  private stopClock(room: Room) {
    if (room.turnTimer) clearTimeout(room.turnTimer);
    room.turnTimer = null;
    room.deadline = null;
  }
  private startClock(room: Room, duration: number) {
    this.stopClock(room);
    room.remaining = duration;
    room.deadline = Date.now() + duration;
    room.turnTimer = setTimeout(() => this.checkDeadline(room), duration);
    room.turnTimer.unref();
  }
  private checkDeadline(room: Room) {
    if (
      room.game?.status === 'playing' &&
      room.deadline !== null &&
      Date.now() >= room.deadline
    ) {
      room.game = caro.onTimeout!(room.game);
      this.stopClock(room);
      this.publish(room);
    }
  }
  private removePlayer(room: Room, playerId: string) {
    this.clearAbsent(playerId);
    if (room.game?.status === 'playing') {
      room.game = caro.onPlayerAbsent!(room.game, playerId);
      this.stopClock(room);
    }
    room.players = room.players.filter((p) => p.id !== playerId);
    this.membership.delete(playerId);
    this.removed(playerId);
    if (room.hostId === playerId) room.hostId = room.players[0]?.id ?? null;
    if (!room.players.length) {
      room.emptySince = Date.now();
      this.stopClock(room);
    }
    this.publish(room);
  }
  private removeSpectator(room: Room, playerId: string) {
    this.clearAbsent(playerId);
    room.spectators = room.spectators.filter(
      (viewer) => viewer.id !== playerId,
    );
    this.membership.delete(playerId);
    this.removed(playerId);
    if (!room.players.length && !room.spectators.length)
      room.emptySince = Date.now();
    this.publish(room);
  }
  private promoteSpectator(room: Room, viewer: RoomSpectator) {
    if (room.players.length >= 2 || room.game?.status === 'playing')
      throw new RoomError(
        'SEAT_UNAVAILABLE',
        'Ghế chơi sẽ mở sau khi ván này kết thúc.',
      );
    if (!viewer.online)
      throw new RoomError(
        'SPECTATOR_OFFLINE',
        'Spectator cần kết nối lại trước khi nhận ghế.',
      );
    room.spectators = room.spectators.filter((item) => item.id !== viewer.id);
    room.players.push({
      id: viewer.id,
      nickname: viewer.nickname,
      avatar: viewer.avatar,
      online: true,
      reconnectUntil: null,
    });
    room.hostId ??= viewer.id;
    room.emptySince = null;
    this.clearAbsent(viewer.id);
    this.publish(room);
  }
}
