export function SettingsHeader({
  onReset,
  onSave,
  canSave,
}: {
  onReset: () => void;
  onSave: () => void;
  canSave: boolean;
}) {
  return (
    <div className="shrink-0 border-b-2 border-white/10 px-8 py-5 flex items-center justify-between gap-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-[28px] font-semibold text-white leading-none">Connection Settings</h1>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onReset}
          className="h-12 border-2 border-white/20 bg-transparent px-6 text-sm font-semibold text-zinc-400 transition-colors hover:bg-white/5 active:bg-white/10"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="h-12 bg-[#70cd35] px-8 text-sm font-semibold text-black transition-opacity disabled:opacity-30 active:opacity-70"
        >
          Save
        </button>
      </div>
    </div>
  );
}
