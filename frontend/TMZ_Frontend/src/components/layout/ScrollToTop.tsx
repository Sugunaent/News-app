import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Store scroll positions in memory and sessionStorage for reliability across navigation
const scrollPositions = new Map<string, number>();

function getStorageKey(key: string, path: string) {
  return `scroll_pos_${key || 'def'}_${path}`;
}

function saveScrollPosition(key: string, path: string, y: number) {
  scrollPositions.set(key, y);
  scrollPositions.set(path, y);
  try {
    sessionStorage.setItem(getStorageKey(key, path), String(y));
  } catch {
    // Ignore storage quota errors
  }
}

function getSavedScrollPosition(key: string, path: string): number | null {
  if (scrollPositions.has(key)) {
    return scrollPositions.get(key)!;
  }
  if (scrollPositions.has(path)) {
    return scrollPositions.get(path)!;
  }
  try {
    const saved = sessionStorage.getItem(getStorageKey(key, path));
    if (saved !== null) {
      return Number(saved);
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType(); // 'POP' (back/forward) vs 'PUSH' (link clicks) vs 'REPLACE'
  const prevLocationRef = useRef<{ key: string; path: string; y: number }>({
    key: location.key,
    path: location.pathname + location.search,
    y: 0,
  });
  const isRestoringRef = useRef(false);

  // 1. Continuously record current scroll position as user scrolls
  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringRef.current) return;
      const currentY = window.scrollY || document.documentElement.scrollTop || 0;
      prevLocationRef.current.y = currentY;
      saveScrollPosition(location.key, location.pathname + location.search, currentY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.key, location.pathname, location.search]);

  // 2. Handle scroll position whenever route changes
  useLayoutEffect(() => {
    const currentPath = location.pathname + location.search;
    const currentKey = location.key;

    // Handle in-page hash anchors if present
    if (location.hash) {
      const element = document.querySelector(location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // A. POP Navigation (User clicked Back or Forward in browser/app)
    if (navigationType === 'POP') {
      const targetY = getSavedScrollPosition(currentKey, currentPath);

      if (targetY !== null && targetY > 0) {
        isRestoringRef.current = true;

        const performScroll = () => {
          window.scrollTo({
            top: targetY,
            left: 0,
            behavior: 'instant' as ScrollBehavior,
          });
          document.documentElement.scrollTop = targetY;
          document.body.scrollTop = targetY;
        };

        // Scroll immediately
        performScroll();

        // Single-page apps render asynchronously. Retry over several frames
        // to ensure scroll lands precisely once async content expands the page height.
        let frameCount = 0;
        let animationFrameId: number;
        let userInterrupted = false;

        const stopRestoration = () => {
          userInterrupted = true;
          isRestoringRef.current = false;
        };

        window.addEventListener('wheel', stopRestoration, { passive: true, once: true });
        window.addEventListener('touchstart', stopRestoration, { passive: true, once: true });
        window.addEventListener('keydown', stopRestoration, { passive: true, once: true });

        const checkAndRestore = () => {
          if (userInterrupted) return;
          performScroll();
          frameCount++;

          // Check for up to ~1.2 seconds (around 75 frames at 60fps)
          if (frameCount < 75) {
            animationFrameId = requestAnimationFrame(checkAndRestore);
          } else {
            isRestoringRef.current = false;
          }
        };

        animationFrameId = requestAnimationFrame(checkAndRestore);

        return () => {
          cancelAnimationFrame(animationFrameId);
          window.removeEventListener('wheel', stopRestoration);
          window.removeEventListener('touchstart', stopRestoration);
          window.removeEventListener('keydown', stopRestoration);
          isRestoringRef.current = false;
        };
      }
    }

    // B. PUSH Navigation (Fresh click on an article, category, "View all", profile, etc.)
    // Reset viewport immediately to the absolute top (0, 0)
    isRestoringRef.current = false;
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const rafId = requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' as ScrollBehavior,
      });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    prevLocationRef.current = {
      key: currentKey,
      path: currentPath,
      y: 0,
    };

    return () => cancelAnimationFrame(rafId);
  }, [location.pathname, location.search, location.hash, location.key, navigationType]);

  return null;
}
