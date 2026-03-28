"use client";

import { useState } from "react";
import { getMediaForTab } from "@/lib/media";
import { MediaLightbox } from "./MediaLightbox";
import type { TabId } from "@/lib/tabs";
import type { MediaItem } from "@/lib/media";

const FLOAT_CLASSES = ["float-a", "float-b", "float-c"] as const;

const FLOAT_POSITIONS = [
  { top: "12%", right: "4%" },
  { top: "32%", right: "3%" },
  { top: "18%", left:  "3%" },
] as const;

interface MediaFloatProps {
  tab: TabId;
}

export function MediaFloat({ tab }: MediaFloatProps) {
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const items = getMediaForTab(tab).slice(0, 3);

  if (items.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 z-10 pointer-events-none">
        {items.map((item, i) => (
          <button
            key={item.src}
            className={`absolute pointer-events-auto rounded-2xl overflow-hidden ${FLOAT_CLASSES[i % 3]}`}
            style={{
              ...FLOAT_POSITIONS[i % 3],
              width: 100,
              height: 100,
              border: "1px solid rgba(112,205,53,0.3)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
              background: "var(--surface-1)",
            }}
            onPointerDown={() => setLightboxItem(item)}
          >
            {item.type === "video" ? (
              <video
                src={item.src}
                className="w-full h-full object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.src}
                alt={item.caption}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )}
          </button>
        ))}
      </div>

      {lightboxItem && (
        <MediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />
      )}
    </>
  );
}
