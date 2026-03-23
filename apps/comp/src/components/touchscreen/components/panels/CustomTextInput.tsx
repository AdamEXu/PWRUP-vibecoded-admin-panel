"use client";

import { useState } from "react";

interface CustomTextInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  numeric?: boolean;
  invalid?: boolean;
  id?: string;
}

export function CustomTextInput({
  value,
  onChange,
  label,
  placeholder,
  numeric,
  invalid,
  id,
}: CustomTextInputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = focused
    ? "#70cd35"
    : invalid
      ? "#ef4444"
      : "white";

  const bgColor = focused ? "#1a2410" : "#272727";

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold tracking-[0.2em] text-white"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode={numeric ? "numeric" : undefined}
        placeholder={placeholder}
        value={value}
        onChange={(e) =>
          onChange(numeric ? e.target.value.replace(/\D+/g, "") : e.target.value)
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="h-[72px] w-full px-5 text-2xl font-light text-white outline-none placeholder:text-zinc-600"
        style={{
          border: `4px solid ${borderColor}`,
          backgroundColor: bgColor,
          transition: "border-color 0.1s, background-color 0.1s",
        }}
      />
    </div>
  );
}
