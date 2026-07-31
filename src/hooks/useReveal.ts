import { useEffect, useRef, type RefObject } from 'react';

/**
 * Attaches a single mousemove listener to a container element. As the pointer
 * moves, every child with the `.reveal-card` class gets its `--reveal-x` and
 * `--reveal-y` CSS custom properties updated to the pointer's position relative
 * to that child — producing the Fluent UI "reveal highlight" radial glow.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMove = (e: MouseEvent) => {
      const cards = container.querySelectorAll<HTMLElement>('.reveal-card');
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--reveal-x', `${x}px`);
        card.style.setProperty('--reveal-y', `${y}px`);
      }
    };

    container.addEventListener('mousemove', handleMove);
    return () => container.removeEventListener('mousemove', handleMove);
  }, []);

  return containerRef;
}
