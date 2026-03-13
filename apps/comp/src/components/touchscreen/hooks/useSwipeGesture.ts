import { useCallback, useEffect, useRef } from "react";

type SwipeDirection = "down" | "right";

interface UseSwipeGestureOptions {
  direction: SwipeDirection;
  /** Element dimension in the gesture axis (px). */
  dimension: number;
  /** Called when gesture commits (past threshold on release). */
  onCommit: () => void;
  /** Whether gesture is enabled. */
  enabled?: boolean;
  /** Fraction of dimension that commits the gesture. Default 0.35 */
  commitRatio?: number;
  /** Minimum velocity (px/ms) for a fast-flick commit. Default 0.5 */
  velocityThreshold?: number;
}

interface TouchSample {
  time: number;
  pos: number;
}

function findScrollableAncestor(
  target: EventTarget | null,
  container: HTMLElement,
): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el !== container) {
    const style = getComputedStyle(el);
    const overflowY = style.overflowY;
    if (
      (overflowY === "scroll" || overflowY === "auto") &&
      el.scrollHeight > el.clientHeight
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

export function useSwipeGesture({
  direction,
  dimension,
  onCommit,
  enabled = true,
  commitRatio = 0.35,
  velocityThreshold = 0.5,
}: UseSwipeGestureOptions) {
  const ref = useRef<HTMLDivElement>(null);
  const isSwipingRef = useRef(false);

  // Tracking state — all in refs to avoid renders during drag
  const startX = useRef(0);
  const startY = useRef(0);
  const delta = useRef(0);
  const isTracking = useRef(false);
  const isLocked = useRef(false);
  const intentDecided = useRef(false);
  const scrollableEl = useRef<HTMLElement | null>(null);
  const samples = useRef<TouchSample[]>([]);
  const rafId = useRef(0);

  const isDown = direction === "down";
  const commitCallbackRef = useRef(onCommit);
  commitCallbackRef.current = onCommit;
  const dimensionRef = useRef(dimension);
  dimensionRef.current = dimension;
  const commitRatioRef = useRef(commitRatio);
  commitRatioRef.current = commitRatio;
  const velocityThresholdRef = useRef(velocityThreshold);
  velocityThresholdRef.current = velocityThreshold;

  const applyTransform = useCallback(
    (px: number) => {
      const el = ref.current;
      if (!el) return;
      if (isDown) {
        el.style.transform = `translate3d(0, ${px}px, 0)`;
      } else {
        el.style.transform = `translate3d(${px}px, 0, 0)`;
      }
    },
    [isDown],
  );

  const resetElement = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "";
    el.style.transform = "";
    el.style.willChange = "";
    isSwipingRef.current = false;
  }, []);

  const animateTo = useCallback(
    (px: number, then?: () => void) => {
      const el = ref.current;
      if (!el) return;
      el.style.transition = "transform 200ms cubic-bezier(0.25, 0.1, 0.25, 1)";
      applyTransform(px);
      let fired = false;
      const done = () => {
        if (fired) return;
        fired = true;
        el.removeEventListener("transitionend", done);
        then?.();
      };
      el.addEventListener("transitionend", done);
      // Safety timeout in case transitionend doesn't fire
      setTimeout(done, 250);
    },
    [applyTransform],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let committed = false;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;

      committed = false;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      delta.current = 0;
      isTracking.current = false;
      isLocked.current = false;
      intentDecided.current = false;
      samples.current = [];

      // Scroll guard: find scrollable ancestor
      if (isDown) {
        scrollableEl.current = findScrollableAncestor(e.target, el);
        if (scrollableEl.current && scrollableEl.current.scrollTop > 0) {
          // User is mid-scroll — lock out immediately
          isLocked.current = true;
        }
      } else {
        scrollableEl.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (isLocked.current || committed) return;

      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;
      const mainDelta = isDown ? dy : dx;
      const crossDelta = isDown ? dx : dy;

      // Decide intent once we pass the deadzone
      if (!intentDecided.current) {
        const absMD = Math.abs(mainDelta);
        const absCD = Math.abs(crossDelta);

        // Need at least 8px of movement to decide
        if (absMD < 8 && absCD < 8) return;

        intentDecided.current = true;

        // Cross-axis dominates → not our gesture
        if (absCD > absMD) {
          isLocked.current = true;
          return;
        }

        // Wrong direction (up or left)
        if (mainDelta < 0) {
          isLocked.current = true;
          return;
        }

        // For down gestures: if at scroll top and scrollable, re-check
        // (user pulled down → that's us; user pushed up → that's scroll)
        if (isDown && scrollableEl.current && scrollableEl.current.scrollTop > 0) {
          isLocked.current = true;
          return;
        }

        // We own this gesture
        isTracking.current = true;
        isSwipingRef.current = true;
        el.style.willChange = "transform";
        el.style.transition = "none";
      }

      if (!isTracking.current) return;

      // Prevent scrolling — we own this touch
      e.preventDefault();

      // Clamp to [0, dimension] (can only swipe in the dismiss direction, can't overshoot)
      delta.current = Math.min(dimensionRef.current, Math.max(0, mainDelta));

      // Record sample for velocity
      const now = performance.now();
      const pos = delta.current;
      samples.current.push({ time: now, pos });
      // Keep last 5 samples
      if (samples.current.length > 5) {
        samples.current.shift();
      }

      // Direct DOM update for 60fps
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        applyTransform(delta.current);
      });
    };

    const onTouchEnd = () => {
      cancelAnimationFrame(rafId.current);

      if (!isTracking.current || committed) {
        isTracking.current = false;
        isSwipingRef.current = false;
        return;
      }

      isTracking.current = false;
      const d = delta.current;
      const dim = dimensionRef.current;
      const ratio = commitRatioRef.current;
      const velThresh = velocityThresholdRef.current;

      // Compute velocity from samples
      let velocity = 0;
      const s = samples.current;
      if (s.length >= 2) {
        const last = s[s.length - 1];
        const first = s[0];
        const dt = last.time - first.time;
        if (dt > 0) {
          velocity = (last.pos - first.pos) / dt; // px/ms
        }
      }

      const pastThreshold = d >= dim * ratio;
      const fastFlick = velocity >= velThresh;

      if (pastThreshold || fastFlick) {
        committed = true;
        // Animate off-screen then commit — do NOT reset transform,
        // React will unmount the element so resetting would cause a flicker
        animateTo(dim, () => {
          isSwipingRef.current = false;
          commitCallbackRef.current();
        });
      } else {
        // Snap back
        animateTo(0, () => {
          resetElement();
        });
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(rafId.current);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, isDown, applyTransform, animateTo, resetElement]);

  return { ref };
}
