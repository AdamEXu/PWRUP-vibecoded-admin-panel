export function PathCard({
  name,
  isActive,
  isViewing,
  onTap,
}: {
  name: string;
  isActive: boolean;
  isViewing: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={[
        "flex w-full shrink-0 flex-col gap-1 overflow-clip p-2.5 text-left",
        "bg-[#3c3c3c]",
        isActive ? "border-4 border-solid border-[#70cd35]" : "",
        isViewing && !isActive ? "border-4 border-solid border-white/30" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <p className="w-full truncate text-xl font-semibold text-white">{name}</p>
      <p
        className={[
          "w-full text-sm font-bold",
          isActive ? "text-[#70cd35]" : "text-transparent",
        ].join(" ")}
      >
        Currently Selected
      </p>
    </button>
  );
}
