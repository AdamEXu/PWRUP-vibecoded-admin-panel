import { useScrollThumb } from "../hooks/useScrollThumb";

export function ScrollTrack({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const { trackRef, visible, thumbTop, thumbHeight } = useScrollThumb(scrollRef);

  return (
    <div ref={trackRef} className="relative h-full w-[4px] shrink-0 bg-[#3c3c3c]">
      {visible && (
        <div
          className="absolute left-0 w-[4px] bg-[#70cd35]"
          style={{ top: thumbTop, height: thumbHeight }}
        />
      )}
    </div>
  );
}
