import React from 'react';

export const SantaHatSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 120 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="santaHatRed" x1="20" y1="10" x2="95" y2="75" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ff4d6d" />
        <stop offset="45%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#7f1d1d" />
      </linearGradient>
      <linearGradient id="santaFur" x1="15" y1="60" x2="90" y2="85" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="65%" stopColor="#f1f5f9" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
      <radialGradient id="santaPom" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="70%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#94a3b8" />
      </radialGradient>
      <filter id="santaShadow" x="-15%" y="-15%" width="130%" height="135%">
        <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.55" />
      </filter>
    </defs>

    <g filter="url(#santaShadow)">
      {/* Red velvet hat body & drooping tail */}
      <path
        d="M22 68 C22 36, 44 12, 72 14 C88 15, 102 28, 104 46 C96 42, 89 44, 86 52 C82 40, 74 36, 68 42 C72 51, 76 58, 78 68 Z"
        fill="url(#santaHatRed)"
      />
      {/* Highlight fold on hat */}
      <path
        d="M34 56 C38 35, 52 21, 72 20 C60 25, 49 38, 46 58 Z"
        fill="#fda4af"
        fillOpacity="0.28"
      />
      {/* Gold stitched accent trim line */}
      <path
        d="M23 64 C40 60, 62 60, 77 65"
        stroke="#fcd34d"
        strokeWidth="1.4"
        strokeOpacity="0.55"
        strokeDasharray="3 3"
      />
      {/* Fluffy white fur cuff */}
      <path
        d="M16 69 C16 62, 24 58, 33 60 C38 56, 47 56, 53 60 C60 56, 69 57, 75 61 C82 60, 86 65, 84 72 C82 78, 75 81, 67 79 C60 82, 50 82, 43 79 C35 82, 26 81, 20 77 C16 75, 15 72, 16 69 Z"
        fill="url(#santaFur)"
      />
      {/* Fluffy white pom-pom */}
      <circle cx="101" cy="51" r="11.5" fill="url(#santaPom)" />
      <circle cx="98" cy="47" r="4" fill="#ffffff" fillOpacity="0.7" />
    </g>
  </svg>
);

export const ChristmasFloralCorner: React.FC<{ className?: string; flip?: boolean }> = ({
  className = '',
  flip = false,
}) => (
  <svg
    viewBox="0 0 110 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={flip ? { transform: 'scaleX(-1)' } : undefined}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="poinsettiaRed" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fb7185" />
        <stop offset="50%" stopColor="#e11d48" />
        <stop offset="100%" stopColor="#881337" />
      </linearGradient>
      <linearGradient id="pineLeaf" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="55%" stopColor="#059669" />
        <stop offset="100%" stopColor="#064e3b" />
      </linearGradient>
    </defs>

    {/* Evergreen pine needles & holly leaves */}
    <path d="M12 14 C32 8, 56 14, 70 28 C52 29, 34 25, 12 14 Z" fill="url(#pineLeaf)" opacity="0.92" />
    <path d="M14 14 C8 36, 13 58, 28 74 C30 54, 26 35, 14 14 Z" fill="url(#pineLeaf)" opacity="0.9" />
    <path d="M18 18 C36 26, 52 40, 62 56 C44 48, 28 36, 18 18 Z" fill="#10b981" opacity="0.7" />
    <path d="M44 10 C60 6, 76 12, 86 22 C72 22, 58 18, 44 10 Z" fill="#047857" opacity="0.85" />
    <path d="M10 46 C6 62, 12 78, 22 88 C22 74, 18 60, 10 46 Z" fill="#047857" opacity="0.85" />

    {/* Poinsettia Christmas Flower Petals */}
    <g transform="translate(26, 26)">
      <path d="M0 0 C8 -16, 24 -18, 30 -6 C20 2, 10 4, 0 0 Z" fill="url(#poinsettiaRed)" />
      <path d="M0 0 C18 -6, 26 8, 20 22 C10 15, 3 8, 0 0 Z" fill="url(#poinsettiaRed)" />
      <path d="M0 0 C10 18, -4 28, -16 24 C-12 12, -7 4, 0 0 Z" fill="url(#poinsettiaRed)" />
      <path d="M0 0 C-18 10, -24 -6, -16 -18 C-6 -12, -2 -6, 0 0 Z" fill="url(#poinsettiaRed)" />
      <path d="M0 0 C-4 -18, 12 -24, 18 -14 C12 -6, 6 -2, 0 0 Z" fill="#f43f5e" opacity="0.9" />

      {/* Petal veins */}
      <path d="M0 0 L20 -5 M0 0 L14 14 M0 0 L-10 16 M0 0 L-12 -11" stroke="#fda4af" strokeWidth="0.8" strokeOpacity="0.6" />

      {/* Golden berry center */}
      <circle cx="0" cy="0" r="4.5" fill="#fbbf24" />
      <circle cx="-3.5" cy="-2" r="2" fill="#fef08a" />
      <circle cx="3.5" cy="1.5" r="2" fill="#f59e0b" />
      <circle cx="-0.5" cy="3.5" r="1.8" fill="#fef08a" />
    </g>

    {/* Frosted Lavender-White Blossom Accent (blends with ZVR purple) */}
    <g transform="translate(56, 22)">
      <circle cx="0" cy="-5" r="4" fill="#f5d0fe" fillOpacity="0.85" />
      <circle cx="5" cy="0" r="4" fill="#e9d5ff" fillOpacity="0.85" />
      <circle cx="0" cy="5" r="4" fill="#f5d0fe" fillOpacity="0.85" />
      <circle cx="-5" cy="0" r="4" fill="#e9d5ff" fillOpacity="0.85" />
      <circle cx="0" cy="0" r="2.5" fill="#fde047" />
    </g>

    {/* Holly berries */}
    <circle cx="36" cy="48" r="3.2" fill="#ef4444" />
    <circle cx="35" cy="47" r="1" fill="#fecaca" />
    <circle cx="43" cy="52" r="2.8" fill="#dc2626" />
    <circle cx="23" cy="60" r="2.8" fill="#ef4444" />
  </svg>
);

export const SnowflakeSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="24" y1="4" x2="24" y2="44" />
      <line x1="6.7" y1="14" x2="41.3" y2="34" />
      <line x1="41.3" y1="14" x2="6.7" y2="34" />
      {/* Branches */}
      <polyline points="19,10 24,14 29,10" />
      <polyline points="19,38 24,34 29,38" />
      <polyline points="10,20 15,18.8 14,13.5" />
      <polyline points="38,28 33,29.2 34,34.5" />
      <polyline points="34,13.5 33,18.8 38,20" />
      <polyline points="14,34.5 15,29.2 10,28" />
    </g>
    <circle cx="24" cy="24" r="2.5" fill="currentColor" />
  </svg>
);

const CHRISTMAS_BULBS = [
  { x: 18, y: 18, color: '#ef4444', glow: 'rgba(239,68,68,0.9)', group: 'a' },
  { x: 50, y: 25, color: '#fbbf24', glow: 'rgba(251,191,36,0.95)', group: 'b' },
  { x: 84, y: 27, color: '#10b981', glow: 'rgba(16,185,129,0.9)', group: 'c' },
  { x: 118, y: 24, color: '#38bdf8', glow: 'rgba(56,189,248,0.9)', group: 'a' },
  { x: 152, y: 19, color: '#f43f5e', glow: 'rgba(244,63,94,0.9)', group: 'b' },
  { x: 186, y: 23, color: '#fde047', glow: 'rgba(253,224,71,0.95)', group: 'c' },
  { x: 220, y: 27, color: '#a855f7', glow: 'rgba(168,85,247,0.9)', group: 'a' },
  { x: 254, y: 25, color: '#ef4444', glow: 'rgba(239,68,68,0.9)', group: 'b' },
  { x: 288, y: 20, color: '#10b981', glow: 'rgba(16,185,129,0.9)', group: 'c' },
  { x: 320, y: 17, color: '#fbbf24', glow: 'rgba(251,191,36,0.95)', group: 'a' },
];

export const ChristmasLightsGarland: React.FC = () => (
  <div className="relative w-full pt-1 pb-0.5 select-none pointer-events-none" aria-hidden="true">
    <svg
      viewBox="0 0 338 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-9 overflow-visible"
      preserveAspectRatio="none"
    >
      {/* Curved evergreen garland / string wire */}
      <path
        d="M4 11 Q85 33 169 16 T334 12"
        stroke="#065f46"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M4 11 Q85 33 169 16 T334 12"
        stroke="#34d399"
        strokeWidth="1.1"
        strokeOpacity="0.45"
        strokeLinecap="round"
      />

      {/* Individual animated Christmas bulbs */}
      {CHRISTMAS_BULBS.map((bulb, idx) => (
        <g key={idx} className={`christmas-bulb-${bulb.group}`}>
          {/* Socket cap */}
          <rect
            x={bulb.x - 2.6}
            y={bulb.y - 5.5}
            width="5.2"
            height="4.5"
            rx="1"
            fill="#1e293b"
            stroke="#64748b"
            strokeWidth="0.6"
          />
          {/* Outer festive aura */}
          <circle
            cx={bulb.x}
            cy={bulb.y + 4.5}
            r="8.5"
            fill={bulb.glow}
            opacity="0.32"
          />
          {/* Teardrop glass bulb */}
          <path
            d={`M${bulb.x} ${bulb.y - 1.5} C${bulb.x + 4.5} ${bulb.y + 1.5}, ${bulb.x + 4.2} ${bulb.y + 8.5}, ${bulb.x} ${bulb.y + 10.5} C${bulb.x - 4.2} ${bulb.y + 8.5}, ${bulb.x - 4.5} ${bulb.y + 1.5}, ${bulb.x} ${bulb.y - 1.5} Z`}
            fill={bulb.color}
          />
          {/* Specular filament highlight */}
          <circle cx={bulb.x - 1} cy={bulb.y + 3} r="1.3" fill="#ffffff" opacity="0.85" />
        </g>
      ))}
    </svg>
  </div>
);

const SNOWFLAKE_PARTICLES = [
  { left: '6%', delay: '0s', duration: '11s', size: 'w-4 h-4', opacity: 'opacity-45' },
  { left: '16%', delay: '-3.5s', duration: '14s', size: 'w-3 h-3', opacity: 'opacity-30' },
  { left: '28%', delay: '-6s', duration: '12s', size: 'w-5 h-5', opacity: 'opacity-40' },
  { left: '42%', delay: '-1.5s', duration: '15s', size: 'w-3.5 h-3.5', opacity: 'opacity-35' },
  { left: '58%', delay: '-8s', duration: '11.5s', size: 'w-4 h-4', opacity: 'opacity-45' },
  { left: '72%', delay: '-4.2s', duration: '13.5s', size: 'w-3 h-3', opacity: 'opacity-30' },
  { left: '84%', delay: '-9.5s', duration: '12.5s', size: 'w-5 h-5', opacity: 'opacity-40' },
  { left: '93%', delay: '-2s', duration: '14.5s', size: 'w-3.5 h-3.5', opacity: 'opacity-35' },
];

export const LoginSnowfallOverlay: React.FC = () => (
  <div
    className="fixed inset-0 pointer-events-none overflow-hidden z-[5]"
    aria-hidden="true"
  >
    {SNOWFLAKE_PARTICLES.map((flake, i) => (
      <div
        key={i}
        className={`absolute -top-8 text-sky-100 ${flake.size} ${flake.opacity} animate-snowfall`}
        style={{
          left: flake.left,
          animationDelay: flake.delay,
          animationDuration: flake.duration,
        }}
      >
        <SnowflakeSvg className="w-full h-full drop-shadow-[0_0_6px_rgba(186,230,253,0.65)]" />
      </div>
    ))}
  </div>
);
