import { CustomTextInput } from "../../components/panels/CustomTextInput";

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
    <CustomTextInput
      id={id}
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      numeric={numeric}
    />
  );
}
