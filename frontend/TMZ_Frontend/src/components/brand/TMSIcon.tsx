import { useTheme } from '@/lib/theme';

interface TMSIconProps {
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
  size?: number;
}

export function TMSIcon({ className = 'w-8 h-8', variant = 'auto' }: TMSIconProps) {
  const { theme } = useTheme();
  const isDark = variant === 'auto' ? theme === 'dark' : variant === 'dark';

  const leftColor = isDark ? '#CCCCCC' : '#222B36';
  const middleColor = isDark ? '#E2E8F0' : '#1E293B';
  const rightColor = '#0066FF';

  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="TMS Icon"
    >
      {/* Left Outer Blade */}
      <path
        d="M 140 155 C 105 190 62 230 42 250 C 26 266 26 280 44 298 L 222 458 C 236 470 244 466 244 446 L 118 252 L 158 175 C 166 160 156 142 140 155 Z"
        fill={leftColor}
      />
      {/* Middle Blade */}
      <path
        d="M 188 78 C 176 66 186 60 198 75 L 244 425 C 246 438 240 444 234 438 L 142 248 L 188 78 Z"
        fill={middleColor}
      />
      {/* Right Diamond Half */}
      <path
        d="M 256 32 C 256 24 265 20 274 29 L 468 223 C 484 239 484 265 468 281 L 274 475 C 265 484 256 480 256 472 Z"
        fill={rightColor}
      />
    </svg>
  );
}
