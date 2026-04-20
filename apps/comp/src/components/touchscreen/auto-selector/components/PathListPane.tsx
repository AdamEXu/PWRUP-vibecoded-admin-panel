import type { AutoPathEntry, AutoPathMetadata } from "../types";
import { colScroll } from "../../settings/constants";
import { PathCard } from "./PathCard";

export const NO_AUTO_SENTINEL = "NONE";

export function PathListPane({
  paths,
  metadataByPathName,
  isLoading,
  error,
  reload,
  activePathName,
  viewingPathName,
  onViewPath,
}: {
  paths: AutoPathEntry[];
  metadataByPathName: Record<string, AutoPathMetadata>;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  activePathName: string | null;
  viewingPathName: string | null;
  onViewPath: (pathName: string) => void;
}) {
  return (
    <div
      className={[
        "flex h-full w-1/3 shrink-0 flex-col gap-[10px] p-[10px]",
        colScroll,
      ].join(" ")}
    >
      <PathCard
        displayName="No Auto"
        description="Do not run an autonomous routine"
        isActive={activePathName === NO_AUTO_SENTINEL}
        isViewing={viewingPathName === NO_AUTO_SENTINEL}
        onTap={() => onViewPath(NO_AUTO_SENTINEL)}
      />

      {paths.map((entry) => (
        <PathCard
          key={entry.fileName}
          displayName={metadataByPathName[entry.name]?.name ?? entry.name}
          fileName={entry.fileName}
          description={metadataByPathName[entry.name]?.description}
          isActive={activePathName === entry.name}
          isViewing={viewingPathName === entry.name}
          onTap={() => onViewPath(entry.name)}
        />
      ))}

      {isLoading && (
        <div className="flex h-[180px] w-full shrink-0 items-center justify-center bg-[#3c3c3c] p-[10px]">
          <p className="text-[18px] text-zinc-500">Loading paths...</p>
        </div>
      )}

      {!isLoading && paths.length === 0 && !error && (
        <div className="flex h-[180px] w-full shrink-0 items-center justify-center bg-[#3c3c3c] p-[10px]">
          <p className="text-[18px] text-zinc-500">No paths found</p>
        </div>
      )}

      {error && (
        <button
          type="button"
          onClick={() => void reload()}
          className="flex h-[180px] w-full shrink-0 items-center justify-center bg-[#3c3c3c] p-[10px]"
        >
          <p className="text-[18px] text-rose-400">Failed to load. Tap to retry.</p>
        </button>
      )}
    </div>
  );
}
