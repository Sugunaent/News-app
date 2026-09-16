import confetti from 'canvas-confetti';

export function fireCelebrationConfetti() {
  // Center burst
  confetti({
    particleCount: 70,
    spread: 80,
    origin: { y: 0.6 },
    zIndex: 400,
    colors: ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6'],
    disableForReducedMotion: true,
  });

  // Dual side bursts with a tiny stagger
  setTimeout(() => {
    confetti({
      particleCount: 35,
      angle: 60,
      spread: 60,
      origin: { x: 0.15, y: 0.65 },
      zIndex: 400,
      colors: ['#06b6d4', '#10b981', '#f59e0b', '#3b82f6'],
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 35,
      angle: 120,
      spread: 60,
      origin: { x: 0.85, y: 0.65 },
      zIndex: 400,
      colors: ['#06b6d4', '#10b981', '#f59e0b', '#3b82f6'],
      disableForReducedMotion: true,
    });
  }, 120);
}
