import type { AutoPathEntry } from "../types";
import { PathCard } from "./PathCard";
import { ScrollTrack } from "./ScrollTrack";

export function PathListPane({
  paths,
  isLoading,
  error,
  reload,
  activePathName,
  viewingPathName,
  onViewPath,
  scrollRef,
}: {
  paths: AutoPathEntry[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  activePathName: string | null;
  viewingPathName: string | null;
  onViewPath: (pathName: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full w-[34%] shrink-0">
      <div
        ref={scrollRef}
        className={[
          "flex flex-1 flex-col gap-2 overflow-y-auto p-2",
          "[&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {paths.map((entry) => (
          <PathCard
            key={entry.fileName}
            name={entry.name}
            isActive={activePathName === entry.name}
            isViewing={viewingPathName === entry.name}
            onTap={() => onViewPath(entry.name)}
          />
        ))}

        {isLoading && (
          <div className="flex w-full shrink-0 items-center justify-center p-8 bg-[#3c3c3c]">
            <p className="text-base text-zinc-500">Loading paths...</p>
          </div>
        )}

        {!isLoading && paths.length === 0 && !error && (
          <div className="flex w-full shrink-0 items-center justify-center p-8 bg-[#3c3c3c]">
            <p className="text-base text-zinc-500">No paths found</p>
          </div>
        )}

        {error && (
          <button
            type="button"
            onClick={() => void reload()}
            className="flex w-full shrink-0 items-center justify-center p-8 bg-[#3c3c3c]"
          >
            <p className="text-base text-rose-400">Failed to load. Tap to retry.</p>
          </button>
        )}
      </div>
      <ScrollTrack scrollRef={scrollRef} />
    </div>
  );
}
