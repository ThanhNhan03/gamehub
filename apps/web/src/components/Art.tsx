import type { GameId } from '../lib/catalog';
import { avatarColors } from '../lib/catalog';

export function Icon({
  name,
  size = 24,
}: {
  name:
    | 'pad'
    | 'sun'
    | 'moon'
    | 'arrow'
    | 'plus'
    | 'close'
    | 'users'
    | 'spark'
    | 'check'
    | 'eye';
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'pad' && (
        <>
          <rect x="2" y="7" width="28" height="20" rx="9" fill="var(--blue)" />
          <path d="M10 12v10m-5-5h10" />
          <circle cx="22" cy="13" r="1.5" fill="var(--pink)" />
          <circle cx="26" cy="20" r="1.5" fill="var(--green)" />
        </>
      )}
      {name === 'sun' && (
        <>
          <circle cx="16" cy="16" r="6" />
          <path d="M16 2v3m0 22v3M2 16h3m22 0h3M6 6l2 2m16 16 2 2M6 26l2-2M24 8l2-2" />
        </>
      )}
      {name === 'moon' && (
        <path d="M27 21A13 13 0 0 1 11 5a12 12 0 1 0 16 16Z" />
      )}
      {name === 'arrow' && <path d="M5 16h22M19 8l8 8-8 8" />}
      {name === 'plus' && <path d="M16 6v20M6 16h20" />}
      {name === 'close' && <path d="m8 8 16 16M24 8 8 24" />}
      {name === 'users' && (
        <>
          <circle cx="12" cy="10" r="5" />
          <path d="M2 28v-4a10 10 0 0 1 20 0v4M23 6a5 5 0 0 1 0 10m3 4a9 9 0 0 1 4 8" />
        </>
      )}
      {name === 'spark' && (
        <path d="m16 2 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" />
      )}
      {name === 'check' && <path d="m6 16 7 7L27 8" />}
      {name === 'eye' && (
        <>
          <path d="M3 16s4.5-9 13-9 13 9 13 9-4.5 9-13 9S3 16 3 16Z" />
          <circle cx="16" cy="16" r="4" />
        </>
      )}
    </svg>
  );
}

export function Avatar({
  variant = 0,
  size = 44,
}: {
  variant?: number;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      aria-hidden="true"
      className="avatar"
    >
      <circle
        cx="28"
        cy="28"
        r="25"
        fill={avatarColors[variant]}
        stroke="#2A1B4A"
        strokeWidth="3"
      />
      <g fill="#2A1B4A" stroke="#2A1B4A" strokeWidth="3" strokeLinecap="round">
        {variant % 3 === 1 ? (
          <path d="m16 22 5 2-5 2" fill="none" />
        ) : (
          <circle cx="19" cy="23" r="1.4" />
        )}
        <circle cx="37" cy="23" r="1.4" />
        <path
          d={variant % 3 === 2 ? 'M20 34q8 12 16 0Z' : 'M20 33q8 9 16 0'}
          fill={variant % 3 === 2 ? '#FFFFFF' : 'none'}
        />
      </g>
      {variant > 3 && (
        <>
          <ellipse cx="13" cy="31" rx="4" ry="2" fill="#FF6FA8" />
          <ellipse cx="43" cy="31" rx="4" ry="2" fill="#FF6FA8" />
        </>
      )}
    </svg>
  );
}

export function GameArt({ game }: { game: GameId }) {
  return (
    <svg
      className="game-art"
      viewBox="0 0 240 150"
      fill="none"
      stroke="#2A1B4A"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {game === 'caro' && (
        <>
          <g transform="rotate(-8 120 75)">
            <rect
              x="47"
              y="13"
              width="144"
              height="126"
              rx="17"
              fill="#FFF4CC"
            />
            <path
              d="M94 24v103m48-103v103M60 54h118M60 96h118"
              strokeWidth="3"
            />
            <path
              d="m63 27 20 18m0-18L63 45m90 61 20 18m0-18-20 18"
              stroke="#2A1B4A"
              strokeWidth="10"
            />
            <path
              d="m63 27 20 18m0-18L63 45m90 61 20 18m0-18-20 18"
              stroke="#FF4F8B"
              strokeWidth="5"
            />
            <circle cx="119" cy="76" r="15" fill="#4CC2FF" />
            <circle cx="119" cy="76" r="8" fill="#FFF4CC" />
          </g>
          <path d="m26 39 4 9m172 58 9 4M202 20l-6 8" />
        </>
      )}
      {game === 'telephone' && (
        <>
          <g transform="rotate(-6 88 54)">
            <path
              d="M30 16h116q14 0 14 14v41q0 14-14 14H80L57 102l3-17H30q-14 0-14-14V30q0-14 14-14Z"
              fill="#FFFFFF"
            />
            <path
              d="m49 60 4-26 16 11 17-11 5 27q-22 23-42-1Z"
              fill="#FFD84D"
            />
            <path d="M61 58h1m17 0h1m-14 9q6 5 10 0" strokeWidth="3" />
            <path d="M108 39h30m-30 13h23" />
          </g>
          <g transform="rotate(8 168 102)">
            <path
              d="M134 77h78q12 0 12 12v30q0 12-12 12h-10l-3 13-19-13h-46q-12 0-12-12V89q0-12 12-12Z"
              fill="#9B7BFF"
            />
            <path d="M151 99q-1-10 10-10t5 16l-5 3m0 11h.1M187 93v15m0 11h.1" />
          </g>
        </>
      )}
      {game === 'ludo' && (
        <>
          <g transform="rotate(-13 77 87)">
            <rect x="28" y="43" width="86" height="86" rx="20" fill="#FFFFFF" />
            <g fill="#2A1B4A" stroke="none">
              <circle cx="49" cy="64" r="6" />
              <circle cx="93" cy="64" r="6" />
              <circle cx="71" cy="86" r="6" />
              <circle cx="49" cy="108" r="6" />
              <circle cx="93" cy="108" r="6" />
            </g>
          </g>
          <g transform="rotate(9 170 77)">
            <circle cx="168" cy="36" r="21" fill="#9B7BFF" />
            <path d="M153 56q-10 16-13 54h57q-3-38-15-54Z" fill="#9B7BFF" />
            <rect
              x="133"
              y="108"
              width="70"
              height="22"
              rx="11"
              fill="#9B7BFF"
            />
            <path d="M160 34h.1m16 0h.1m-15 9q7 6 14 0" strokeWidth="3" />
          </g>
          <path d="m121 14 4 9m78 26 11-3" />
        </>
      )}
      {game === 'poker' && (
        <>
          <g transform="rotate(-17 89 70)">
            <rect
              x="47"
              y="12"
              width="80"
              height="115"
              rx="12"
              fill="#FFFFFF"
            />
            <path
              d="m87 39-21 31q0 15 21 10 21 5 21-10Zm0 37v20m-10 0h20"
              fill="#2A1B4A"
            />
          </g>
          <g transform="rotate(12 150 71)">
            <rect
              x="110"
              y="13"
              width="80"
              height="115"
              rx="12"
              fill="#FFFFFF"
            />
            <path
              d="M150 92s-25-17-25-34q0-20 25-10 25-10 25 10 0 17-25 34Z"
              fill="#FF4F8B"
            />
          </g>
          <ellipse cx="52" cy="131" rx="25" ry="10" fill="#FF9A3C" />
          <ellipse cx="52" cy="123" rx="25" ry="10" fill="#FF9A3C" />
          <ellipse cx="198" cy="121" rx="21" ry="10" fill="#9B7BFF" />
        </>
      )}
    </svg>
  );
}

export function HeroArt() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg
        className="hero-doodles"
        viewBox="0 0 420 310"
        fill="none"
        stroke="#2A1B4A"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <path d="M42 85q-18-20 1-24m-20 17-10-5M345 207q23 15 8 31M331 247l10 6M195 27l5-14m10 16 10-5" />
        <path d="m366 58 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="#FFFFFF" />
        <path d="m71 246 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z" fill="#FF6FA8" />
      </svg>
      <div className="hero-cards">
        <GameArt game="poker" />
      </div>
      <div className="hero-dice">
        <GameArt game="ludo" />
      </div>
      <span className="art-sticker">Nghỉ tay. Chơi ngay!</span>
    </div>
  );
}
