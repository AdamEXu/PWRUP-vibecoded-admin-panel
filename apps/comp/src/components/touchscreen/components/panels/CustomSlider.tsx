"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SliderHintRange {
  min: number;
  max: number;
  label: string;
}

interface CustomSliderProps {
  value: number; // in [min, max] domain space (default 0–1)
  onChange: (value: number) => void;
  label?: string;
  hints?: SliderHintRange[];
  snapPoints?: number[]; // values in domain space; if provided, snaps to nearest during drag
  min?: number;
  max?: number;
  step?: number; // snap to nearest multiple of step (domain space)
  decimals?: number; // decimal places for {{v}} in labels
  formatValue?: (v: number) => string; // custom {{v}} renderer (overrides decimals)
  valueLabel?: string; // shown between label and track; supports {{v}}
  reversed?: boolean; // fill grows from right instead of left
  disabled?: boolean;
}

export function CustomSlider({
  value,
  onChange,
  label,
  hints,
  snapPoints,
  min = 0,
  max = 1,
  step,
  decimals,
  formatValue,
  valueLabel,
  reversed = false,
  disabled = false,
}: CustomSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartValue = useRef(0);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));

  const applySnap = (v: number): number => {
    let result = v;
    if (step !== undefined) {
      result = Math.round((result - min) / step) * step + min;
    }
    if (snapPoints && snapPoints.length > 0) {
      result = snapPoints.reduce((nearest, pt) =>
        Math.abs(pt - result) < Math.abs(nearest - result) ? pt : nearest
      );
    }
    return result;
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStartX.current = e.clientX;
      dragStartValue.current = value;
      setIsDragging(true);
    },
    [value, disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const track = trackRef.current;
      if (!track) return;
      const trackWidth = track.getBoundingClientRect().width;
      const delta = (e.clientX - dragStartX.current) / trackWidth;
      const direction = reversed ? -1 : 1;
      onChange(applySnap(clamp(dragStartValue.current + delta * (max - min) * direction)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDragging, onChange, snapPoints, step, min, max, reversed],
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
  const trackBg = isDragging ? "#192515" : "#272727";

  const t = (value - min) / (max - min); // normalized 0–1

  const displayValue = formatValue
    ? formatValue(value)
    : decimals !== undefined
      ? value.toFixed(decimals)
      : String(value);

  const interpolate = (str: string) => str.replace(/\{\{v\}\}/g, displayValue);

  const hint = hints
    ? [...hints].sort((a, b) => a.min - b.min).reverse().find(h => value >= h.min)?.label
    : undefined;

  const epsilon = (max - min) * 0.005;

  return (
    <div className={`flex flex-col gap-[8px] w-full${disabled ? " opacity-50 cursor-not-allowed" : ""}`}>
      {label && (
        <p className="font-['Inter',sans-serif] font-medium text-[24px] text-white leading-normal">
          {label}
        </p>
      )}
      {valueLabel && (
        <p className="font-['Inter',sans-serif] font-medium text-[18px] text-white/70 leading-normal">
          {interpolate(valueLabel)}
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
        className={`relative h-[48px] select-none overflow-hidden transition-colors duration-100${disabled ? "" : " cursor-pointer"}`}
        style={{ border: `4px solid ${borderColor}`, backgroundColor: trackBg, touchAction: "none" }}
      >
        {/* Fill bar */}
        <div
          className="absolute inset-y-0"
          style={{
            [reversed ? "right" : "left"]: 0,
            width: `${t * 100}%`,
            backgroundColor: fillColor,
            transition: snapPoints?.length
              ? "width 150ms ease-out, background-color 100ms ease 0ms"
              : "background-color 100ms ease 0ms",
          }}
        />
        {/* Snap point dots */}
        {snapPoints?.map((pt) => {
          if (Math.abs(pt - min) < epsilon || Math.abs(pt - max) < epsilon) return null;
          const isCurrentValue = Math.abs(pt - value) < epsilon;
          const ptT = (pt - min) / (max - min);
          // dot is in the filled region if it's behind the fill bar
          const inFilled = reversed ? ptT > (1 - t) : ptT < t;
          const dotColor = inFilled
            ? (isDragging ? "#192515" : "#272727")
            : (isDragging ? "#70cd35" : "white");
          return (
            <div
              key={pt}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full pointer-events-none"
              style={{
                left: `${ptT * 100}%`,
                backgroundColor: dotColor,
                opacity: isCurrentValue ? 0 : 1,
                transition: "opacity 50ms ease 50ms, background-color 100ms ease 0ms",
              }}
            />
          );
        })}
      </div>
      {hint && <p>{interpolate(hint)}</p>}
    </div>
  );
}
