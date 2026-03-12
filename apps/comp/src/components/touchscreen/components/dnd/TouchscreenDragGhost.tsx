import { Sf } from "../common/Sf";

export function TouchscreenDragGhost({ symbol }: { symbol?: string }) {
  if (!symbol) {
    return null;
  }

  return (
    <div className="flex items-center justify-center font-['SF_Pro',sans-serif] text-[48px] text-white opacity-80">
      <Sf s={symbol} className="leading-[normal]" />
    </div>
  );
}
