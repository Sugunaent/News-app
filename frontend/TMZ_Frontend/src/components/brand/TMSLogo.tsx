import { useTheme } from '@/lib/theme';

interface TMSLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
  showSubtitle?: boolean;
  hideSubtitleOnMobile?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TMSLogo({
  className = '',
  variant = 'auto',
  showSubtitle = true,
  hideSubtitleOnMobile = false,
  size = 'md',
}: TMSLogoProps) {
  const { theme } = useTheme();
  const isDark = variant === 'auto' ? theme === 'dark' : variant === 'dark';

  const sizeClasses = {
    sm: 'w-[92px] h-8 sm:w-[108px] sm:h-9',
    md: 'w-[118px] h-10 sm:w-[138px] sm:h-11 md:w-[150px] md:h-12',
    lg: 'w-[190px] h-[76px] sm:w-[220px] sm:h-[88px]',
  }[size];

  return (
    <div className={`select-none ${className}`}>
      <img
        src={isDark ? '/logo-dark.svg' : '/logo-light.svg'}
        alt="The Modern Stories"
        className={`${sizeClasses} object-contain object-left transition-transform duration-200`}
        aria-label={showSubtitle ? 'The Modern Stories' : 'TMS'}
      />
    </div>
  );
}
