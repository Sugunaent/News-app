import { useEffect, useRef, useState } from 'react';

export function CursorFollower() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (
      window.matchMedia('(pointer: coarse)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;
    setEnabled(true);

    let rafId: number | undefined;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let dotX = mouseX;
    let dotY = mouseY;
    let ringX = mouseX;
    let ringY = mouseY;
    let visible = false;

    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      visible = true;
      if (dotRef.current) dotRef.current.style.opacity = '1';
      if (ringRef.current) ringRef.current.style.opacity = '0.9';
      if (rafId === undefined) rafId = requestAnimationFrame(animate);
    };
    const onLeave = () => {
      visible = false;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      rafId = undefined;
      if (dotRef.current) dotRef.current.style.opacity = '0';
      if (ringRef.current) ringRef.current.style.opacity = '0';
    };

    const animate = () => {
      dotX += (mouseX - dotX) * 0.32;
      dotY += (mouseY - dotY) * 0.32;
      ringX += (mouseX - ringX) * 0.11;
      ringY += (mouseY - ringY) * 0.11;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dotX - 4}px, ${dotY - 4}px)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX - 18}px, ${ringY - 18}px)`;
      }
      const hasSettled = Math.abs(mouseX - dotX) < 0.1
        && Math.abs(mouseY - dotY) < 0.1
        && Math.abs(mouseX - ringX) < 0.1
        && Math.abs(mouseY - ringY) < 0.1;
      if (visible && !hasSettled) {
        rafId = requestAnimationFrame(animate);
      } else {
        rafId = undefined;
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
      if (rafId !== undefined) cancelAnimationFrame(rafId);
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div ref={ringRef} className="fixed top-0 left-0 w-9 h-9 rounded-full pointer-events-none z-[9999] transition-opacity duration-300" style={{ border: '1px solid hsl(162 72% 40%)', boxShadow: '0 0 22px hsl(162 72% 40% / 0.28)', opacity: 0 }} aria-hidden="true" />
      <div ref={dotRef} className="fixed top-0 left-0 w-2 h-2 rounded-full pointer-events-none z-[10000] transition-opacity duration-200" style={{ background: '#0066FF', boxShadow: '0 0 12px #0066FF', opacity: 0 }} aria-hidden="true" />
    </>
  );
}
