import { type ReactNode, type HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glow?: boolean;
}

export function GlassCard({ children, hover = true, glow = false, className = '', ...props }: GlassCardProps) {
  return (
    <div
      className={`glass-card ${hover ? 'hover:-translate-y-1' : ''} ${glow ? 'glow-primary' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
