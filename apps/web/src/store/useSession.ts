import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface Session {
  playerId: string;
  sessionToken: string;
  roomCode: string | null;
  nickname: string;
  avatar: number;
  theme: 'light' | 'dark';
  saveProfile: (nickname: string, avatar: number) => void;
  toggleTheme: () => void;
  rememberRoom: (code: string | null) => void;
}
export const useSession = create<Session>()(
  persist(
    (set) => ({
      playerId: crypto.randomUUID(),
      sessionToken: crypto.randomUUID(),
      roomCode: null,
      nickname: '',
      avatar: 0,
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
      saveProfile: (nickname, avatar) => set({ nickname, avatar }),
      rememberRoom: (roomCode) => set({ roomCode }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'gamehub-session',
      version: 1,
      migrate: (persisted) => {
        const saved = persisted as Session;
        return {
          ...saved,
          sessionToken: saved.sessionToken ?? crypto.randomUUID(),
          roomCode: saved.roomCode ?? null,
        };
      },
    },
  ),
);
