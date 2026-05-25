
interface AgentAvatarProps {
  size: number
}

export default function AgentAvatar({ size }: AgentAvatarProps) {
  return (
    <div
      className="rounded-full border-2 border-orange-500 overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ width: size, height: size }}
      >
        {/* Fundo gradient */}
        <defs>
          <radialGradient id="avatarBg" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#1a2744" />
            <stop offset="100%" stopColor="#0f0f1a" />
          </radialGradient>
        </defs>

        <circle cx="50" cy="50" r="50" fill="url(#avatarBg)" />

        {/* Rosto */}
        <ellipse cx="50" cy="45" rx="18" ry="20" fill="#D4956A" />

        {/* Sombra do rosto */}
        <ellipse cx="52" cy="47" rx="16" ry="18" fill="#B8784F" opacity="0.3" />

        {/* Cabelo */}
        <path
          d="M32 35 Q35 25 50 28 Q65 25 68 35 Q70 40 68 45 Q65 50 60 48 Q55 50 50 48 Q45 50 40 48 Q35 50 32 45 Z"
          fill="#2C1810"
        />

        {/* Volume do cabelo */}
        <ellipse cx="50" cy="28" rx="8" ry="4" fill="#2C1810" />

        {/* Olhos */}
        <circle cx="43" cy="42" r="2.5" fill="#5C3D2E" />
        <circle cx="57" cy="42" r="2.5" fill="#5C3D2E" />

        {/* Brilho dos olhos */}
        <circle cx="44" cy="40.5" r="0.8" fill="#FFFFFF" />
        <circle cx="58" cy="40.5" r="0.8" fill="#FFFFFF" />

        {/* Sobrancelhas */}
        <path d="M38 38 Q43 35 48 38" stroke="#2C1810" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M52 38 Q57 35 62 38" stroke="#2C1810" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Nariz */}
        <path d="M50 45 L48 50 L52 50 Z" fill="#C47A5A" />

        {/* Boca (sorriso) */}
        <path d="M45 55 Q50 58 55 55" stroke="#C47A5A" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* Pescoço */}
        <rect x="45" y="60" width="10" height="8" rx="5" fill="#D4956A" />

        {/* Sombra do pescoço */}
        <rect x="47" y="62" width="6" height="6" rx="3" fill="#B8784F" opacity="0.4" />

        {/* Colarinho/camiseta */}
        <path d="M35 65 Q50 70 65 65 L65 75 L35 75 Z" fill="#1E3A5F" />
      </svg>
    </div>
  )
}