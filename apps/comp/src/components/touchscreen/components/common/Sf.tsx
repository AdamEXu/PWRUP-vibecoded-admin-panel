export function Sf({ s, className }: { s: string; className?: string }) {
  return (
    <span className={["sf-symbol leading-[0]", className].filter(Boolean).join(" ")}>
      {s}
    </span>
  );
}
