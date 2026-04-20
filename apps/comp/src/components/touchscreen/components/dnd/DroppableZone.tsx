import { useDroppable } from "@dnd-kit/core";

export function DroppableZone({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={className}>
      {children}
    </div>
  );
}
