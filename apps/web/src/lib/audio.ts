const DEFAULT_BACKGROUND_MUSIC_VOLUME = 0.18;
const BACKGROUND_MUSIC_VOLUME_KEY = 'gamehub-background-music-volume';

function getSavedBackgroundMusicVolume() {
  try {
    const savedVolume = window.localStorage.getItem(
      BACKGROUND_MUSIC_VOLUME_KEY,
    );
    if (savedVolume === null) return DEFAULT_BACKGROUND_MUSIC_VOLUME;
    const volume = Number(savedVolume);
    return Number.isFinite(volume)
      ? Math.max(0, Math.min(1, volume))
      : DEFAULT_BACKGROUND_MUSIC_VOLUME;
  } catch {
    return DEFAULT_BACKGROUND_MUSIC_VOLUME;
  }
}

const backgroundMusic = new Audio('/audio/background-bossa.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = getSavedBackgroundMusicVolume();
backgroundMusic.preload = 'none';

const soundFiles = {
  'caro-move': ['/audio/caro-place.ogg', '/audio/caro-place-2.ogg'],
  'poker-deal': ['/audio/poker-shuffle.ogg'],
  'poker-card': ['/audio/poker-card.ogg'],
  'poker-bet': ['/audio/poker-chips.ogg'],
  win: ['/audio/win-jingle.ogg'],
} as const;

type GameSound = keyof typeof soundFiles;
let effectsEnabled = false;
let nextVariant = 0;
const playingEffects = new Set<HTMLAudioElement>();

export function setBackgroundMusicEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    return backgroundMusic.play().then(
      () => true,
      () => false,
    );
  }
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
  return Promise.resolve(false);
}

export function getBackgroundMusicVolumePercent() {
  return Math.round(backgroundMusic.volume * 100);
}

export function setBackgroundMusicVolume(percent: number) {
  const volume = Math.max(0, Math.min(100, percent)) / 100;
  backgroundMusic.volume = volume;
  try {
    window.localStorage.setItem(BACKGROUND_MUSIC_VOLUME_KEY, String(volume));
  } catch {
    // Keep volume adjustment available if browser storage is disabled.
  }
}

export function setGameEffectsEnabled(enabled: boolean) {
  effectsEnabled = enabled;
  if (!enabled) {
    for (const audio of playingEffects) audio.pause();
    playingEffects.clear();
  }
}

export function playGameSound(sound: GameSound) {
  if (!effectsEnabled) return;
  const variants = soundFiles[sound];
  const file = variants[nextVariant++ % variants.length]!;
  const audio = new Audio(file);
  audio.volume = sound === 'win' ? 0.48 : 0.38;
  playingEffects.add(audio);
  const remove = () => playingEffects.delete(audio);
  audio.addEventListener('ended', remove, { once: true });
  void audio.play().catch(remove);
}
