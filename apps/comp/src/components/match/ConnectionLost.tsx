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
      className="absolute bottom-5 left-6 flex items-center gap-2 z-50"
      role="status"
      aria-label="NetworkTables disconnected"
    >
      <span className="animate-nt-pulse inline-block w-3 h-3 rounded-full bg-red-500" />
      <span className="text-sm font-medium text-red-400 tracking-wide select-none">
        NT Disconnected
      </span>
    </div>
  );
}
