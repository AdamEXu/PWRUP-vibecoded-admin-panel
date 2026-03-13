import { useEffect, useState } from "react";
import type { AutoPathEntry } from "../types";

export function PathDetailPane({
  viewingEntry,
  displayName,
  description,
  previewUrl,
  isLoading,
  isViewingActive,
  pendingPublish,
  onSelect,
}: {
  viewingEntry: AutoPathEntry | null;
  displayName?: string;
  description?: string;
  previewUrl: string | null;
  isLoading: boolean;
  isViewingActive: boolean;
  pendingPublish: string | null;
  onSelect: (pathName: string) => void;
}) {
  const [previewState, setPreviewState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    setPreviewState("loading");
  }, [previewUrl]);

  if (!viewingEntry) {
    return (
      <div className="flex flex-1 items-center justify-center text-[48px] text-zinc-500">
        <p>{isLoading ? "Loading..." : "Select a path"}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full w-1/2 shrink-0 flex-col justify-between p-[16px]">
        <div className="flex flex-col gap-[10px] text-white">
          <p className="text-[48px] leading-[1] font-semibold">{displayName ?? viewingEntry.name}</p>
          {description && (
            <p className="max-w-[660px] text-[32px] leading-[1.2] text-white">{description}</p>
          )}
          {!description && (
            <p className="text-[32px] leading-[1.2] text-zinc-300">{viewingEntry.fileName}</p>
          )}
        </div>

        <button
          type="button"
          disabled={pendingPublish !== null}
          onClick={() => onSelect(viewingEntry.name)}
          className={[
            "self-start px-[10px] py-[4px] text-[48px] leading-[1] text-white whitespace-nowrap",
            isViewingActive ? "bg-[#70cd35]" : "bg-black active:bg-zinc-800",
            pendingPublish ? "opacity-50" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {pendingPublish === viewingEntry.name
            ? "Selecting..."
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
                <div className="absolute inset-0 flex items-center justify-center text-center text-[48px] text-zinc-500">
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
                onLoad={() => setPreviewState("loaded")}
                onError={() => setPreviewState("error")}
              />
            </>
          ) : (
            <div className="flex items-center justify-center text-center text-[48px] text-zinc-500">
              <p>Error loading preview</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
