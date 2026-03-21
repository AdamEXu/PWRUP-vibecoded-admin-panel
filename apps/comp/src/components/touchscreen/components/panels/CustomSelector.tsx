"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SelectorOption {
  id: string;
  symbol: string; // SF Symbol character
}

interface CustomSelectorProps {
  options: SelectorOption[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
}

const ITEM_SIZE = 80; // px, square
const BORDER_W = 4;   // visual border width (inset box-shadow)
// Adjacent items overlap by BORDER_W so their shadows merge into a single border.
const STRIDE = ITEM_SIZE - BORDER_W; // 76

export function CustomSelector({ options, value, onChange, label }: CustomSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = options.findIndex((o) => o.id === value);
  const effectiveIndex = selectedIndex === -1 ? 0 : selectedIndex;

  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartIndexRef = useRef(0);
  const pendingIndexRef = useRef(effectiveIndex);
  const hasDraggedRef = useRef(false);

  const indexToX = (i: number) => i * STRIDE;
  const maxX = indexToX(options.length - 1);
  const naturalX = indexToX(effectiveIndex);
  const greenX = isDraggingRef.current
    ? Math.max(0, Math.min(maxX, naturalX + dragDelta))
    : naturalX;

  const xToIndex = (x: number) =>
    Math.max(0, Math.min(options.length - 1, Math.round(x / STRIDE)));

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      hasDraggedRef.current = false;
      setIsDragging(true);
      dragStartXRef.current = e.clientX;
      dragStartIndexRef.current = effectiveIndex;
      pendingIndexRef.current = effectiveIndex;
      setDragDelta(0);
    },
    [effectiveIndex],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - dragStartXRef.current;
      if (Math.abs(delta) > 4) hasDraggedRef.current = true;
      const startX = indexToX(dragStartIndexRef.current);
      const rawX = Math.max(0, Math.min(maxX, startX + delta));
      pendingIndexRef.current = xToIndex(rawX);
      setDragDelta(delta);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.length],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      if (!hasDraggedRef.current) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const localX = e.clientX - rect.left;
          const tappedIndex = Math.max(
            0,
            Math.min(options.length - 1, Math.floor(localX / STRIDE)),
          );
          onChange(options[tappedIndex]?.id ?? value);
        }
      } else {
        onChange(options[pendingIndexRef.current]?.id ?? value);
      }
      setDragDelta(0);
    },
    [onChange, options, value],
  );

  // Prevent swipe-dismiss
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let decided = false;
    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      decided = false;
      startX = e.touches[0]?.clientX ?? 0;
      startY = e.touches[0]?.clientY ?? 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      if (!decided) {
        const dx = Math.abs(touch.clientX - startX);
        const dy = Math.abs(touch.clientY - startY);
        if (dx < 8 && dy < 8) return;
        decided = true;
        if (dx <= dy) return;
      }
      e.stopPropagation();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // Total width: first item = ITEM_SIZE, each additional adds STRIDE
  const totalWidth = ITEM_SIZE + (options.length - 1) * STRIDE;
  const transition = isDragging ? "none" : "clip-path 200ms ease, left 200ms ease";

  // clip-path inset(top right bottom left) clips the green layer to the mask rect
  const clipRight = totalWidth - greenX - ITEM_SIZE;
  const clipPath = `inset(0px ${clipRight}px 0px ${greenX}px)`;

  return (
    <div className="flex flex-col gap-[8px]">
      {label && (
        <p className="font-['Inter',sans-serif] font-medium text-[24px] text-white leading-normal">
          {label}
        </p>
      )}
      <div
        ref={containerRef}
        className="relative select-none touch-none"
        style={{ width: totalWidth, height: ITEM_SIZE }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Base layer: white-bordered squares with white icons.
            Items overlap by BORDER_W so adjacent inset shadows merge. */}
        {options.map((option, i) => (
          <div
            key={option.id}
            className="absolute top-0 flex items-center justify-center"
            style={{
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              left: indexToX(i),
              backgroundColor: "#272727",
              boxShadow: `inset 0 0 0 ${BORDER_W}px white`,
              zIndex: 0,
            }}
          >
            <span
              className="sf-symbol leading-none"
              style={{ fontSize: 36, color: "white", pointerEvents: "none" }}
            >
              {option.symbol}
            </span>
          </div>
        ))}

        {/* Green layer — full width, clipped via clip-path to the mask rectangle.
            clip-path transitions with CSS so both click and drag animate. */}
        <div
          className="absolute top-0 left-0"
          style={{
            width: totalWidth,
            height: ITEM_SIZE,
            clipPath,
            transition,
            zIndex: 2,
            pointerEvents: "none",
          }}
        >
          {/* Green background + border for the mask area */}
          <div
            className="absolute top-0"
            style={{
              left: greenX,
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              backgroundColor: "#192515",
              boxShadow: `inset 0 0 0 ${BORDER_W}px #70cd35`,
              transition,
            }}
          />
          {/* Green icons at same positions as base layer */}
          {options.map((option, i) => (
            <div
              key={option.id}
              className="absolute top-0 flex items-center justify-center"
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                left: indexToX(i),
              }}
            >
              <span
                className="sf-symbol leading-none"
                style={{ fontSize: 36, color: "#70cd35", pointerEvents: "none" }}
              >
                {option.symbol}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
