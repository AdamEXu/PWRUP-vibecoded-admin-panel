import { colScroll } from "../constants";

export function SettingsColumn({
  title,
  bordered,
  children,
}: {
  title: string;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "w-[420px] shrink-0 flex flex-col",
        bordered ? "border-r-2 border-white/10" : "",
        colScroll,
      ].join(" ")}
    >
      <div className="flex flex-col gap-7 px-8 py-8">
        <p className="text-[24px] font-semibold text-white">{title}</p>
        {children}
      </div>
    </div>
  );
}
