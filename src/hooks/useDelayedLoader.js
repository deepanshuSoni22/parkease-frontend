import { useEffect, useRef, useState } from 'react';

export function useDelayedLoader(isLoading, minDurationMs = 450) {
  const [visible, setVisible] = useState(Boolean(isLoading));
  const startedAtRef = useRef(isLoading ? Date.now() : null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isLoading) {
      if (!startedAtRef.current) {
        startedAtRef.current = Date.now();
      }
      setVisible(true);
      return undefined;
    }

    if (!startedAtRef.current) {
      setVisible(false);
      return undefined;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minDurationMs - elapsed);

    timeoutRef.current = setTimeout(() => {
      startedAtRef.current = null;
      setVisible(false);
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoading, minDurationMs]);

  return visible;
}