import { useState } from "react";
import type { AutoPathEntry } from "../types";

export function PathDetailPane({
  viewingEntry,
  displayName,
  description,
  previewUrl,
  isLoading,
  isViewingActive,
  pendingPublish,
  selectionLocked,
  onSelect,
}: {
  viewingEntry: AutoPathEntry | null;
  displayName?: string;
  description?: string;
  previewUrl: string | null;
  isLoading: boolean;
  isViewingActive: boolean;
  pendingPublish: string | null;
  selectionLocked: boolean;
  onSelect: (pathName: string) => void;
}) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [errorUrl, setErrorUrl] = useState<string | null>(null);

  const previewState =
    errorUrl === previewUrl ? "error" : loadedUrl === previewUrl ? "loaded" : "loading";

  if (!viewingEntry) {
    return (
      <div className="flex flex-1 items-center justify-center text-[34px] text-zinc-500">
        <p>{isLoading ? "Loading..." : "Select a path"}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full w-1/2 shrink-0 flex-col justify-between p-[16px]">
        <div className="flex flex-col gap-[10px] text-white">
          <p className="text-[34px] leading-[1] font-semibold">{displayName ?? viewingEntry.name}</p>
          {description && (
            <p className="max-w-[660px] text-[22px] leading-[1.2] text-white">{description}</p>
          )}
          {!description && (
            <p className="text-[22px] leading-[1.2] text-zinc-300">{viewingEntry.fileName}</p>
          )}
        </div>

        <button
          type="button"
          disabled={pendingPublish !== null || selectionLocked}
          onClick={() => onSelect(viewingEntry.name)}
          className={[
            "self-start px-[10px] py-[4px] text-[34px] leading-[1] text-white whitespace-nowrap",
            isViewingActive ? "bg-[#70cd35]" : "bg-black active:bg-zinc-800",
            pendingPublish || selectionLocked ? "opacity-50" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {pendingPublish === viewingEntry.name
            ? "Selecting..."
            : selectionLocked
              ? "Locked During Match"
            : isViewingActive
              ? "Selected"
              : "Select"}
        </button>
      </div>

      <div className="flex min-w-0 flex-1 p-[16px]">
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-zinc-950">
          {previewState !== "error" && previewUrl ? (
            <>
              {previewState === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center text-center text-[34px] text-zinc-500">
                  <p>Loading preview...</p>
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={`${displayName ?? viewingEntry.name} preview`}
                className={[
                  "absolute inset-0 h-full w-full object-contain transition-opacity",
                  previewState === "loaded" ? "opacity-100" : "opacity-0",
                ].join(" ")}
                onLoad={() => setLoadedUrl(previewUrl)}
                onError={() => setErrorUrl(previewUrl)}
              />
            </>
          ) : (
            <div className="flex items-center justify-center text-center text-[34px] text-zinc-500">
              <p>Error loading preview</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
