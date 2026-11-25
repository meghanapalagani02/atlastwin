import React, { useId } from 'react';

export type AtlasLogoSize = 'sm' | 'md' | 'lg' | 'xl' | number;
export type AtlasLogoVariant = 'gold' | 'ivory' | 'navy';

interface AtlasLogoProps {
  size?: AtlasLogoSize;
  variant?: AtlasLogoVariant;
  animated?: boolean;
  iconOnly?: boolean;
  showCaption?: boolean;
  className?: string;
}

const SIZE_MAP: Record<'sm' | 'md' | 'lg' | 'xl', number> = {
  sm: 38,
  md: 48,
  lg: 68,
  xl: 104,
};

export const AtlasLogo: React.FC<AtlasLogoProps> = ({
  size = 'md',
  variant = 'gold',
  animated = false,
  iconOnly = false,
  showCaption = true,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const px = typeof size === 'number' ? size : SIZE_MAP[size];

  const primaryWordColor =
    variant === 'navy' ? 'text-[#0B1F3A]' : 'text-[#FAF7F0]';
  const captionColor =
    variant === 'navy' ? 'text-[#0B1F3A]/65' : 'text-[#E6D49A]/85';

  const wordmarkSizeClass =
    px >= 90
      ? 'text-4xl'
      : px >= 60
        ? 'text-2xl'
        : px >= 44
          ? 'text-xl'
          : 'text-lg sm:text-xl';

  const captionSizeClass =
    px >= 90
      ? 'text-[10px] tracking-[0.26em]'
      : px >= 60
        ? 'text-[9px] tracking-[0.22em]'
        : 'text-[8.5px] tracking-[0.2em]';

  // 5-node internal network coordinates inside 64x64 viewBox
  const nodes = [
    { cx: 19, cy: 42, delay: '0.85s' }, // 0: bottom-left (origin of gold path)
    { cx: 22, cy: 23, delay: '0.98s' }, // 1: upper-left
    { cx: 32, cy: 33, delay: '1.10s' }, // 2: center hub
    { cx: 43, cy: 40, delay: '1.22s' }, // 3: lower-right
    { cx: 45, cy: 21, delay: '1.34s' }, // 4: top-right (crown-jewel target)
  ];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="AtlasTwin Shield Logo"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={`shield-grad-${uid}`} x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1B3358" />
            <stop offset="100%" stopColor="#0B1F3A" />
          </linearGradient>
          <filter id={`gold-glow-${uid}`} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="1.6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer hexagonal security shield */}
        <path
          d="M32 4.5L54 14.5V33.5C54 46.2 44.3 55.3 32 59.5C19.7 55.3 10 46.2 10 33.5V14.5L32 4.5Z"
          fill={`url(#shield-grad-${uid})`}
          stroke="#C9A227"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className={animated ? 'animate-atlas-shield' : ''}
        />

        {/* Subtle inner hairline hex frame */}
        <path
          d="M32 8L50.5 16.5V33.2C50.5 43.8 42.4 51.6 32 55.4C21.6 51.6 13.5 43.8 13.5 33.2V16.5L32 8Z"
          stroke="#E6D49A"
          strokeOpacity="0.28"
          strokeWidth="0.75"
          strokeLinejoin="round"
        />

        {/* Stylized atlas / globe meridians and latitude rings */}
        <g className={animated ? 'animate-atlas-globe' : ''} opacity={animated ? undefined : 0.55}>
          <circle
            cx="32"
            cy="32"
            r="16.5"
            stroke="#E6D49A"
            strokeOpacity="0.45"
            strokeWidth="0.85"
          />
          <ellipse
            cx="32"
            cy="32"
            rx="8.5"
            ry="16.5"
            stroke="#E6D49A"
            strokeOpacity="0.38"
            strokeWidth="0.8"
          />
          <ellipse
            cx="32"
            cy="32"
            rx="16.5"
            ry="6.5"
            stroke="#E6D49A"
            strokeOpacity="0.35"
            strokeWidth="0.8"
          />
          <line
            x1="15.5"
            y1="32"
            x2="48.5"
            y2="32"
            stroke="#E6D49A"
            strokeOpacity="0.32"
            strokeWidth="0.75"
          />
          <line
            x1="32"
            y1="15.5"
            x2="32"
            y2="48.5"
            stroke="#E6D49A"
            strokeOpacity="0.32"
            strokeWidth="0.75"
          />
        </g>

        {/* Secondary connecting network edges */}
        <g
          stroke="#FAF7F0"
          strokeOpacity={variant === 'ivory' ? 0.35 : 0.28}
          strokeWidth="0.9"
          className={animated ? 'animate-atlas-globe' : ''}
        >
          <line x1="19" y1="42" x2="22" y2="23" />
          <line x1="22" y1="23" x2="32" y2="33" />
          <line x1="32" y1="33" x2="43" y2="40" />
          <line x1="22" y1="23" x2="45" y2="21" />
          <line x1="43" y1="40" x2="45" y2="21" />
        </g>

        {/* Glowing gold attack path: bottom-left node -> center hub -> top-right crown jewel */}
        <path
          d="M19 42 L32 33 L45 21"
          stroke="#C9A227"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#gold-glow-${uid})`}
          className={animated ? 'animate-atlas-path' : ''}
        />

        {/* 5 Network Nodes */}
        {nodes.slice(0, 4).map((n, i) => (
          <circle
            key={i}
            cx={n.cx}
            cy={n.cy}
            r={i === 0 || i === 2 ? 2.3 : 1.9}
            fill={i === 0 || i === 2 ? '#C9A227' : '#FAF7F0'}
            stroke="#0B1F3A"
            strokeWidth="0.9"
            style={animated ? { animationDelay: n.delay } : undefined}
            className={animated ? 'animate-atlas-node' : ''}
          />
        ))}

        {/* Top-right Crown-Jewel Diamond Node */}
        <g
          style={animated ? { animationDelay: nodes[4].delay } : undefined}
          className={animated ? 'animate-atlas-node' : ''}
        >
          <path
            d="M45 16.8 L49.2 21 L45 25.2 L40.8 21 Z"
            fill="#C9A227"
            stroke="#FAF7F0"
            strokeWidth="0.9"
            className={animated ? 'animate-atlas-jewel' : ''}
          />
        </g>
      </svg>

      {!iconOnly && (
        <div className="min-w-0 leading-none">
          <div className={`font-display font-bold tracking-tight whitespace-nowrap ${wordmarkSizeClass}`}>
            <span className={primaryWordColor}>Atlas</span>
            <span className="text-[#C9A227]">Twin</span>
          </div>
          {showCaption && (
            <div className={`mt-1 font-sans font-semibold uppercase whitespace-nowrap ${captionSizeClass} ${captionColor}`}>
              ATTACK-PATH INTELLIGENCE
            </div>
          )}
        </div>
      )}
    </div>
  );
};
