import { useEffect, useRef, useState } from 'react';

export function CursorFollower() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    setEnabled(true);

    let rafId = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;

    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      setVisible(true);
    };
    const onLeave = () => setVisible(false);

    const animate = () => {
      dotX += (mouseX - dotX) * 0.32;
      dotY += (mouseY - dotY) * 0.32;
      ringX += (mouseX - ringX) * 0.11;
      ringY += (mouseY - ringY) * 0.11;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`;
        dotRef.current.style.opacity = visible ? '1' : '0';
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX - 18}px, ${ringY - 18}px)`;
        ringRef.current.style.opacity = visible ? '0.9' : '0';
      }
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    rafId = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(rafId);
    };
  }, [visible]);

  if (!enabled) return null;

  return (
    <>
      <div ref={ringRef} className="fixed top-0 left-0 w-9 h-9 rounded-full pointer-events-none z-[9999] transition-opacity duration-300" style={{ border: '1px solid hsl(162 72% 40%)', boxShadow: '0 0 22px hsl(162 72% 40% / 0.28)', opacity: 0 }} aria-hidden="true" />
      <div ref={dotRef} className="fixed top-0 left-0 w-2 h-2 rounded-full pointer-events-none z-[10000] transition-opacity duration-200" style={{ background: '#0066FF', boxShadow: '0 0 12px #0066FF', opacity: 0 }} aria-hidden="true" />
    </>
  );
}
