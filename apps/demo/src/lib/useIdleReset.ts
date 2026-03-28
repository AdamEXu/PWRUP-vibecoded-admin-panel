"use client";

import { useEffect, useRef } from "react";

/**
 * Calls onIdle after `timeoutMs` of no pointer/touch activity.
 * Resets the timer on every pointermove or touchstart.
 */
export function useIdleReset(timeoutMs: number, onIdle: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs);
    }

    reset(); // start counting immediately

    const events = ["pointermove", "pointerdown", "touchstart", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);
}
