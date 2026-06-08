import { useCallback, useRef } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipe(options: SwipeOptions) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);
  const threshold = options.threshold || 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    touchEnd.current = null;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) return;

    const dx = touchEnd.current.x - touchStart.current.x;
    const dy = touchEnd.current.y - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < threshold) return;

    if (absDx > absDy) {
      if (dx > 0) {
        options.onSwipeRight?.();
      } else {
        options.onSwipeLeft?.();
      }
    } else {
      if (dy > 0) {
        options.onSwipeDown?.();
      } else {
        options.onSwipeUp?.();
      }
    }
  }, [options, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}