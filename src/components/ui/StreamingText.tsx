import React, { useState, useEffect, useRef } from 'react';

interface StreamingTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  cursor?: boolean;
}

export const StreamingText: React.FC<StreamingTextProps> = ({
  text,
  speed = 20,
  onComplete,
  className = '',
  cursor = true,
}) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);

  useEffect(() => {
    idx.current = 0;
    setDisplayed('');
    setDone(false);

    const interval = setInterval(() => {
      idx.current += 1;
      if (idx.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(interval);
        onComplete?.();
      } else {
        setDisplayed(text.slice(0, idx.current));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {cursor && !done && (
        <span className="ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse bg-indigo-500 align-text-bottom" />
      )}
    </span>
  );
};
