import type { AutoPathEntry } from "../types";

export function PathDetailPane({
  viewingEntry,
  isLoading,
  isViewingActive,
  pendingPublish,
  onSelect,
}: {
  viewingEntry: AutoPathEntry | null;
  isLoading: boolean;
  isViewingActive: boolean;
  pendingPublish: string | null;
  onSelect: (pathName: string) => void;
}) {
  if (!viewingEntry) {
    return (
      <div className="flex flex-1 items-center justify-center text-2xl text-zinc-500">
        <p>{isLoading ? "Loading..." : "Select a path"}</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex flex-col gap-2 text-white">
          <p className="text-2xl font-semibold">{viewingEntry.name}</p>
          <p className="text-base text-zinc-300">{viewingEntry.fileName}</p>
        </div>

        <button
          type="button"
          disabled={pendingPublish !== null}
          onClick={() => onSelect(viewingEntry.name)}
          className={[
            "self-start px-3 py-1 text-2xl text-white whitespace-nowrap",
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

      <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center text-2xl text-white">
        <p>{viewingEntry.name} Preview</p>
      </div>
    </>
  );
}
