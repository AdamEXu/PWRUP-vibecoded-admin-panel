interface GurtTitleProps {
  size?: "hero" | "large" | "normal";
}

const SIZES = {
  hero:   "clamp(3.6rem, 13vw, 8rem)",
  large:  "clamp(2rem,   7vw,  4.2rem)",
  normal: "clamp(1.5rem, 4vw,  2.6rem)",
};

export function GurtTitle({ size = "normal" }: GurtTitleProps) {
  return (
    <span style={{
      display: "block",
      fontFamily: "var(--f-gurt)",
      fontSize: SIZES[size],
      fontWeight: 700,
      lineHeight: 1.05,
      letterSpacing: "-0.01em",
      color: "var(--pink)",
      WebkitTextStroke: size === "hero" ? "3px var(--cyan)" : size === "large" ? "2px var(--cyan)" : "1.5px var(--cyan)",
      textShadow: "0 0 32px rgba(255,76,148,0.35)",
    }}>
      Yo, Gurt!
    </span>
  );
}
