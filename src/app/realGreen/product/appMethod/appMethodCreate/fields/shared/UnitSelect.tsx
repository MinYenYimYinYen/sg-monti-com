import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectValue,
} from "@/components/MultiSelect";

interface UnitSelectProps<T extends string> {
  units: readonly T[];
  placeholder: string;
  value?: T | "";
  onValueChange?: (value: T) => void;
}

export function UnitSelect<T extends string>({
  units,
  placeholder,
  value,
  onValueChange,
}: UnitSelectProps<T>) {
  return (
    <MultiSelect
      mode="single"
      value={value ? [value] : []}
      onValueChange={(values) => onValueChange?.(values[0] as T)}
    >
      <MultiSelectTrigger>
        <MultiSelectValue placeholder={placeholder} className="capitalize" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        {units.map((unit) => (
          <MultiSelectItem key={unit} value={unit}>
            {unit}
          </MultiSelectItem>
        ))}
      </MultiSelectContent>
    </MultiSelect>
  );
}
