"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { MediaItem } from "@/lib/media";

interface MediaLightboxProps {
  item: MediaItem;
  onClose: () => void;
}

export function MediaLightbox({ item, onClose }: MediaLightboxProps) {
  const [visible, setVisible] = useState(false);
  const dragStartYRef = useRef(0);
  const dragDeltaRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  function handlePointerDown(e: React.PointerEvent) {
    dragStartYRef.current = e.clientY;
    dragDeltaRef.current = 0;
  }

  function handlePointerMove(e: React.PointerEvent) {
    dragDeltaRef.current = e.clientY - dragStartYRef.current;
    if (containerRef.current) {
      const opacity = Math.max(0.2, 1 - Math.abs(dragDeltaRef.current) / 300);
      containerRef.current.style.opacity = String(opacity);
      containerRef.current.style.transform = `translateY(${dragDeltaRef.current}px)`;
    }
  }

  function handlePointerUp() {
    if (Math.abs(dragDeltaRef.current) > 80) {
      dismiss();
    } else {
      if (containerRef.current) {
        containerRef.current.style.transform = "";
        containerRef.current.style.opacity = "1";
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.92)",
        opacity: visible ? 1 : 0,
        transition: "opacity 250ms ease",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Close button */}
      <button
        className="absolute top-6 right-6 z-10 p-2 rounded-full"
        style={{ color: "var(--text-2)", background: "rgba(255,255,255,0.08)" }}
        onPointerDown={(e) => { e.stopPropagation(); dismiss(); }}
      >
        <X size={22} />
      </button>

      {/* Media */}
      <div
        ref={containerRef}
        className="max-w-[90vw] max-h-[80vh] flex flex-col items-center gap-3"
        style={{ transition: "opacity 150ms ease, transform 150ms ease" }}
      >
        {item.type === "video" ? (
          <video
            src={item.src}
            className="max-w-full max-h-[70vh] rounded-xl object-contain"
            controls
            autoPlay
            playsInline
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.src}
            alt={item.caption}
            className="max-w-full max-h-[70vh] rounded-xl object-contain"
          />
        )}
        {item.caption && (
          <p
            className="text-sm text-center"
            style={{
              fontFamily: "var(--font-inter), Inter, sans-serif",
              color: "var(--text-2)",
            }}
          >
            {item.caption}
          </p>
        )}
      </div>
    </div>
  );
}
