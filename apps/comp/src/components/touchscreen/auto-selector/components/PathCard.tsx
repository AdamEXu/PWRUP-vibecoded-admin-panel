export function PathCard({
  displayName,
  fileName,
  description,
  isActive,
  isViewing,
  onTap,
}: {
  displayName: string;
  fileName?: string;
  description?: string;
  isActive: boolean;
  isViewing: boolean;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={[
        "flex h-48 w-full shrink-0 flex-col gap-2 overflow-clip p-[10px] text-left",
        "border-4 border-solid bg-[#3c3c3c]",
        isActive ? "border-[#70cd35]" : isViewing ? "border-white" : "border-transparent",
      ].join(" ")}
    >
      <div>
        <p className="w-full text-[28px] leading-[1] font-semibold text-white">{displayName}</p>
        {fileName && <p className="w-full text-sm text-zinc-500 mt-1">{fileName}</p>}
      </div>
      <p className="w-full text-[18px] text-white">
        {description ?? ""}
      </p>
      <p
        className={[
          "w-full text-[18px] leading-[1] font-bold",
          isActive ? "text-[#70cd35]" : "text-transparent",
        ].join(" ")}
      >
        Currently Selected
      </p>
    </button>
  );
}
