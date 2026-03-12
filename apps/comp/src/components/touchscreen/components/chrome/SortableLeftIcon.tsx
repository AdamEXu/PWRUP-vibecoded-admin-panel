import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { railId } from "../../model";
import type { TabDef } from "../../model";
import { LeftIcon } from "./LeftIcon";

export function SortableLeftIcon({
  tab,
  active,
  onClick,
  editMode,
}: {
  tab: TabDef;
  active: boolean;
  onClick: () => void;
  editMode: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: railId(tab.id), disabled: !editMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(editMode ? listeners : {})}>
      <LeftIcon
        symbol={tab.symbol}
        activeSymbol={tab.activeSymbol}
        active={active}
        onClick={onClick}
      />
    </div>
  );
}
