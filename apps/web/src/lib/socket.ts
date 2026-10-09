import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, ServerEvents } from '@gamehub/shared';
export const socket: Socket<ServerEvents, ClientEvents> = io({
  autoConnect: false,
});
