import React, { useEffect, useRef, useState } from 'react';

export interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: 'default' | 'white';
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
  children?: React.ReactNode;
}

const DEFAULT_GRADIENT =
  '#dd7bbb 0deg, #9047ff 45deg, #0076ff 90deg, #00d5ff 135deg, #00ffb7 180deg, #76ff00 225deg, #ffdd00 270deg, #ff5e00 315deg, #dd7bbb 360deg';

const WHITE_GRADIENT =
  '#ffffff 0deg, #a1a1aa 90deg, #ffffff 180deg, #71717a 270deg, #ffffff 360deg';

export function GlowingEffect({
  blur = 0,
  inactiveZone = 0.1,
  proximity = 70,
  spread = 45,
  variant = 'default',
  glow = true,
  className = '',
  disabled = false,
  movementDuration = 1.5,
  borderWidth = 1.5,
  children,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (disabled) return;
    const container = containerRef.current;
    if (!container) return;

    const parent = container.parentElement;
    if (!parent) return;

    let rafId: number;
    let currentAngle = 0;
    let targetAngle = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    let isHovered = false;
    let lastTime = performance.now();

    // Lerp factor based on movementDuration (default 1.5s -> smooth responsive tracking)
    const lerpSpeed = Math.min(0.25, Math.max(0.05, 0.18 / Math.max(0.5, movementDuration)));

    const handlePointerMove = (e: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check proximity beyond parent bounds
      const near =
        x >= -proximity &&
        x <= rect.width + proximity &&
        y >= -proximity &&
        y <= rect.height + proximity;

      isHovered = near;

      if (near) {
        targetX = Math.max(0, Math.min(rect.width, x));
        targetY = Math.max(0, Math.min(rect.height, y));

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.hypot(dx, dy);
        const maxDist = Math.hypot(centerX, centerY);

        // Angle from center towards pointer
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (angle < 0) angle += 360;
        targetAngle = angle;

        // Inactive zone dampening near center
        if (inactiveZone > 0 && maxDist > 0 && dist < maxDist * inactiveZone) {
          isHovered = false;
        }
      }
    };

    const handlePointerLeave = () => {
      isHovered = false;
    };

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (isHovered) {
        // Smoothly interpolate angle with wrap-around
        let diff = ((targetAngle - currentAngle + 180) % 360) - 180;
        if (diff < -180) diff += 360;
        currentAngle += diff * lerpSpeed;
        currentAngle = (currentAngle + 360) % 360;

        currentX += (targetX - currentX) * lerpSpeed;
        currentY += (targetY - currentY) * lerpSpeed;

        container.style.setProperty('--glow-angle', `${currentAngle.toFixed(2)}deg`);
        container.style.setProperty('--glow-x', `${currentX.toFixed(1)}px`);
        container.style.setProperty('--glow-y', `${currentY.toFixed(1)}px`);
        container.style.setProperty('--glow-opacity', '1');
      } else {
        // Subtle ambient continuous rotation when idle
        currentAngle = (currentAngle + dt * 45) % 360;
        container.style.setProperty('--glow-angle', `${currentAngle.toFixed(2)}deg`);
        container.style.setProperty('--glow-opacity', glow ? '0.3' : '0.15');
      }

      rafId = requestAnimationFrame(animate);
    };

    // Attach listeners
    parent.addEventListener('pointermove', handlePointerMove, { passive: true });
    parent.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      parent.removeEventListener('pointermove', handlePointerMove);
      parent.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [disabled, proximity, inactiveZone, movementDuration, glow]);

  if (disabled) {
    return children ? <>{children}</> : null;
  }

  const gradientColors = variant === 'white' ? WHITE_GRADIENT : DEFAULT_GRADIENT;

  const gradientBg = `
    radial-gradient(
      circle ${spread * 3.5}px at var(--glow-x, 50%) var(--glow-y, 50%),
      rgba(255, 255, 255, 0.95) 0%,
      rgba(255, 255, 255, 0.35) 45%,
      transparent 80%
    ),
    conic-gradient(
      from var(--glow-angle, 0deg) at 50% 50%,
      ${gradientColors}
    )
  `;

  const maskStyles: React.CSSProperties = {
    padding: `${borderWidth}px`,
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    maskComposite: 'exclude',
    borderRadius: 'inherit',
  };

  const glowElement = (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 rounded-[inherit] overflow-visible transition-opacity duration-300 z-10 ${className}`}
      style={{
        opacity: mounted ? 'var(--glow-opacity, 0.3)' : '0',
      }}
    >
      {/* Optional ultra-subtle neon bloom strictly on border line */}
      {blur > 0 && (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            ...maskStyles,
            filter: `blur(${blur}px)`,
            opacity: 0.6,
            background: gradientBg,
            backgroundBlendMode: 'overlay',
          }}
        />
      )}

      {/* Primary crisp glowing border */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          ...maskStyles,
          background: gradientBg,
          backgroundBlendMode: 'overlay',
        }}
      />
    </div>
  );

  if (children) {
    return (
      <div className="relative rounded-[inherit]">
        {children}
        {glowElement}
      </div>
    );
  }

  return glowElement;
}

