export function SettingsField({
  label,
  id,
  value,
  onChange,
  placeholder,
  numeric,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold tracking-[0.2em] text-white">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={numeric ? "numeric" : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(event) =>
          onChange(numeric ? event.target.value.replace(/\D+/g, "") : event.target.value)
        }
        className="h-[72px] w-full border-2 border-white/20 bg-[#272727] px-5 text-2xl font-light text-white outline-none placeholder:text-zinc-600 focus:border-[#70cd35] focus:bg-[#1a2410]"
      />
    </div>
  );
}
