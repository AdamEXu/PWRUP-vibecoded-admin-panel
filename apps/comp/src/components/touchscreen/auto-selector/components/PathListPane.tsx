import type { AutoPathEntry, AutoPathMetadata } from "../types";
import { PathCard } from "./PathCard";
import { ScrollTrack } from "./ScrollTrack";

export function PathListPane({
  paths,
  metadataByPathName,
  isLoading,
  error,
  reload,
  activePathName,
  viewingPathName,
  onViewPath,
  scrollRef,
}: {
  paths: AutoPathEntry[];
  metadataByPathName: Record<string, AutoPathMetadata>;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  activePathName: string | null;
  viewingPathName: string | null;
  onViewPath: (pathName: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex h-full w-1/3 shrink-0">
      <div
        ref={scrollRef}
        className={[
          "flex flex-1 flex-col gap-[10px] overflow-y-auto p-[10px]",
          "[&::-webkit-scrollbar]:hidden",
        ].join(" ")}
      >
        {paths.map((entry) => (
          <PathCard
            key={entry.fileName}
            displayName={metadataByPathName[entry.name]?.name ?? entry.name}
            description={metadataByPathName[entry.name]?.description}
            isActive={activePathName === entry.name}
            isViewing={viewingPathName === entry.name}
            onTap={() => onViewPath(entry.name)}
          />
        ))}

        {isLoading && (
          <div className="flex h-[180px] w-full shrink-0 items-center justify-center bg-[#3c3c3c] p-[10px]">
            <p className="text-[24px] text-zinc-500">Loading paths...</p>
          </div>
        )}

        {!isLoading && paths.length === 0 && !error && (
          <div className="flex h-[180px] w-full shrink-0 items-center justify-center bg-[#3c3c3c] p-[10px]">
            <p className="text-[24px] text-zinc-500">No paths found</p>
          </div>
        )}

        {error && (
          <button
            type="button"
            onClick={() => void reload()}
            className="flex h-[180px] w-full shrink-0 items-center justify-center bg-[#3c3c3c] p-[10px]"
          >
            <p className="text-[24px] text-rose-400">Failed to load. Tap to retry.</p>
          </button>
        )}
      </div>
      <ScrollTrack scrollRef={scrollRef} />
    </div>
  );
}
