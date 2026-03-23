"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SliderHintRange {
  min: number;
  max: number;
  label: string;
}

interface CustomSliderProps {
  value: number; // 0–1
  onChange: (value: number) => void;
  label?: string;
  hints?: SliderHintRange[];
}

export function CustomSlider({ value, onChange, label, hints }: CustomSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStartX.current = e.clientX;
      dragStartValue.current = value;
      setIsDragging(true);
    },
    [value],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const track = trackRef.current;
      if (!track) return;
      const trackWidth = track.getBoundingClientRect().width;
      const delta = (e.clientX - dragStartX.current) / trackWidth;
      onChange(clamp(dragStartValue.current + delta));
    },
    [isDragging, onChange],
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Stop touch events from bubbling to the swipe-dismiss gesture
  const trackElRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = trackElRef.current;
    if (!el) return;
    let decidedHorizontal = false;
    let startTouchX = 0;
    let startTouchY = 0;

    const onTouchStart = (e: TouchEvent) => {
      decidedHorizontal = false;
      startTouchX = e.touches[0]?.clientX ?? 0;
      startTouchY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (!decidedHorizontal) {
        const dx = Math.abs(touch.clientX - startTouchX);
        const dy = Math.abs(touch.clientY - startTouchY);
        if (dx < 8 && dy < 8) return;
        decidedHorizontal = dx > dy;
      }
      if (decidedHorizontal) e.stopPropagation();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const fillColor = isDragging ? "#70cd35" : "white";
  const borderColor = isDragging ? "#70cd35" : "white";

  return (
    <div className="flex flex-col gap-[8px] w-full">
      {label && (
        <p className="font-['Inter',sans-serif] font-medium text-[24px] text-white leading-normal">
          {label}
        </p>
      )}
      <div
        ref={(el) => {
          (trackRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
          (trackElRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-[48px] cursor-pointer select-none overflow-hidden transition-colors duration-100"
        style={{ border: `4px solid ${borderColor}`, backgroundColor: isDragging ? "#192515" : "#272727", touchAction: "none" }}
      >
        {/* Fill bar */}
        <div
          className="absolute inset-y-0 left-0 transition-colors duration-100"
          style={{
            width: `${value * 100}%`,
            backgroundColor: fillColor,
          }}
        />
      </div>
      {hints && (() => {
        // Find the last range where value >= min (handles contiguous ranges with no dead points)
        const hint = [...hints].sort((a, b) => a.min - b.min).reverse().find(h => value >= h.min)?.label;
        return hint ? <p>{hint}</p> : null;
      })()}
    </div>
  );
}
