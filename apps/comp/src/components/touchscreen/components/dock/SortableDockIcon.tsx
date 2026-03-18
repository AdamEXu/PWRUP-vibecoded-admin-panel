import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { dockId } from "../../model";
import { Sf } from "../common/Sf";

export function SortableDockIcon({
  id,
  symbol,
  activeSymbol,
  isActive,
  onTap,
}: {
  id: string;
  symbol: string;
  activeSymbol: string;
  isActive: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dockId(id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    touchAction: "none" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        "flex flex-col justify-center shrink-0 cursor-pointer",
        isActive ? "text-[#70cd35]" : "text-white",
      ].join(" ")}
      onClick={onTap}
    >
      <Sf s={isActive ? activeSymbol : symbol} className="leading-[normal]" />
    </div>
  );
}
