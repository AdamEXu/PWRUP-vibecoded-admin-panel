"use client";

interface Props {
  visible: boolean;
}

/**
 * Subtle bottom-left indicator when NetworkTables-backed MatchHUD data is unavailable.
 * Components keep showing last-known values — this just flags the issue.
 */
export function ConnectionLost({ visible }: Props) {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[9999] bg-black/85 border border-red-500/40 rounded px-3 py-1.5"
      role="status"
      aria-label="NetworkTables disconnected"
    >
      <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
      <span className="text-sm font-medium text-red-400 tracking-wide select-none">
        NT Disconnected
      </span>
    </div>
  );
}
