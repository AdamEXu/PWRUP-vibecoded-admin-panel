import { useEffect, useRef, useState } from "react";

export function useScrollThumb(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [visible, setVisible] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      return;
    }

    function update() {
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = el;
      const trackH = track.clientHeight;

      if (scrollHeight <= clientHeight) {
        setVisible(false);
        return;
      }

      setVisible(true);
      const ratio = clientHeight / scrollHeight;
      const nextThumbHeight = Math.max(ratio * trackH, 20);
      const maxScroll = scrollHeight - clientHeight;
      const nextThumbTop = (scrollTop / maxScroll) * (trackH - nextThumbHeight);
      setThumbHeight(nextThumbHeight);
      setThumbTop(nextThumbTop);
    }

    update();
    scrollElement.addEventListener("scroll", update, { passive: true });
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [scrollRef]);

  return {
    thumbHeight,
    thumbTop,
    trackRef,
    visible,
  };
}
