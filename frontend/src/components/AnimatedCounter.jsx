import { useEffect, useRef, useState } from 'react';

function AnimatedCounter({ value, formatter, duration = 900 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);
  const frameRef = useRef(0);

  useEffect(() => {
    const nextValue = Number(value);
    const previousValue = Number(previousValueRef.current);

    if (!Number.isFinite(nextValue)) {
      frameRef.current = window.requestAnimationFrame(() => {
        setDisplayValue(value);
        previousValueRef.current = value;
        frameRef.current = 0;
      });
      return undefined;
    }

    if (!Number.isFinite(previousValue) || previousValue === nextValue) {
      frameRef.current = window.requestAnimationFrame(() => {
        setDisplayValue(nextValue);
        previousValueRef.current = nextValue;
        frameRef.current = 0;
      });
      return undefined;
    }

    const startTime = performance.now();

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - ((1 - progress) ** 3);
      const interpolatedValue = previousValue + ((nextValue - previousValue) * easedProgress);

      setDisplayValue(interpolatedValue);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      previousValueRef.current = nextValue;
      frameRef.current = 0;
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [duration, value]);

  if (!formatter) {
    return displayValue;
  }

  return formatter(displayValue);
}

export default AnimatedCounter;
