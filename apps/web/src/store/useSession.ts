import { create } from 'zustand';
import { persist } from 'zustand/middleware';
interface Session {
  playerId: string;
  nickname: string;
  avatar: number;
  theme: 'light' | 'dark';
  saveProfile: (nickname: string, avatar: number) => void;
  toggleTheme: () => void;
}
export const useSession = create<Session>()(
  persist(
    (set) => ({
      playerId: crypto.randomUUID(),
      nickname: '',
      avatar: 0,
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
      saveProfile: (nickname, avatar) => set({ nickname, avatar }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'gamehub-session' },
  ),
);
