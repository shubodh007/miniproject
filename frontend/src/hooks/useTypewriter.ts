import { useState, useEffect, useRef } from 'react';

export function useTypewriter(text: string, speed: number = 35) {
  const [displayText, setDisplayText] = useState('');
  const [isDone, setIsDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (!text) return;

    started.current = true;

    // Respect prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      setDisplayText(text);
      setIsDone(true);
      return;
    }

    setDisplayText('');
    setIsDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        setIsDone(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayText, isDone };
}
