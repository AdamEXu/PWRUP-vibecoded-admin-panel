import { RIGHT_PANELS } from "../../model";
import type { RightPanelId } from "../../model";
import { Sf } from "../common/Sf";

export function RightIconColumn({
  openPanel,
  onToggle,
}: {
  openPanel: RightPanelId | null;
  onToggle: (id: RightPanelId) => void;
}) {
  return (
    <div className="flex flex-col h-full items-center justify-between shrink-0 w-[44px]">
      <div className="flex flex-col gap-[48px] items-center w-[44px] pt-[10px]">
        {RIGHT_PANELS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => onToggle(panel.id)}
            className={[
              "flex h-[27px] w-full items-center justify-center font-['SF_Pro',sans-serif] text-[48px]",
              openPanel === panel.id ? "text-[#70cd35]" : "text-white",
            ].join(" ")}
          >
            <Sf
              s={openPanel === panel.id ? panel.activeSymbol : panel.symbol}
              className="leading-[normal]"
            />
          </button>
        ))}
      </div>
      <div className="flex w-[44px] items-center justify-center pb-[10px]" />
    </div>
  );
}
