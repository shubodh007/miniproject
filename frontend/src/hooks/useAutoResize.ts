import { useEffect, RefObject } from 'react';

export function useAutoResize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset height, then set to scrollHeight up to 200px limit
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, ref]);
}
