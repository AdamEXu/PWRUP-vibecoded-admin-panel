import { Sf } from "../common/Sf";

export function LeftIcon({
  symbol,
  activeSymbol,
  active,
  onClick,
}: {
  symbol: string;
  activeSymbol: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-[27px] w-[44px] items-center justify-center font-['SF_Pro',sans-serif] text-[48px]",
        active ? "text-[#70cd35]" : "text-white",
      ].join(" ")}
    >
      <Sf s={active ? activeSymbol : symbol} className="leading-[normal]" />
    </button>
  );
}
