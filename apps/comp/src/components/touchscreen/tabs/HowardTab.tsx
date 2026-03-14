"use client";

import { useCallback, useEffect, useState } from "react";

interface HowardImage {
  image: string;
  "happy-text": string;
}

export function HowardTab() {
  const [images, setImages] = useState<HowardImage[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    fetch("/path-overview/meta/error-images.json")
      .then((r) => r.json())
      .then((data: HowardImage[]) => {
        setImages(data);
        setIndex(Math.floor(Math.random() * data.length));
      })
      .catch(() => {});
  }, []);

  const showNext = useCallback(() => {
    setIndex((prev) => {
      let next: number;
      do {
        next = Math.floor(Math.random() * images.length);
      } while (next === prev && images.length > 1);
      return next;
    });
  }, [images.length]);

  const entry = images[index];

  if (!entry) {
    return (
      <div className="flex h-full items-center justify-center bg-[#272727] text-[34px] text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#272727]">
      <div className="flex w-1/3 shrink-0 flex-col justify-between p-[16px]">
        <div className="flex flex-col gap-[10px]">
          <p className="text-[34px] leading-[1] font-semibold text-white">Pictures of Howard</p>
          <p className="text-[22px] leading-[1.2] text-zinc-300">{entry["happy-text"]}</p>
        </div>
        <button
          type="button"
          onClick={showNext}
          className="self-start bg-black px-[10px] py-[4px] text-[34px] leading-[1] text-white active:bg-zinc-800 whitespace-nowrap"
        >
          More Howard
        </button>
      </div>
      <div className="flex min-w-0 flex-1 p-[16px]">
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-zinc-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={entry.image}
            src={entry.image}
            alt={entry["happy-text"]}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
