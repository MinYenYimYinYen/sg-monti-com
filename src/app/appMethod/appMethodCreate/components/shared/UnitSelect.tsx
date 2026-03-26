import {
  MultiSelect,

} from "@/components/multiselect/MultiSelect";
import { MultiSelectTrigger } from "@/components/multiselect/MultiSelectTrigger";
import { MultiSelectContent } from "@/components/multiselect/MultiSelectContent";
import { MultiSelectItem } from "@/components/multiselect/MultiSelectItem";
import { MultiSelectValue } from "@/components/multiselect/MultiSelectValue";

interface UnitSelectProps<T extends string> {
  units: readonly T[];
  placeholder: string;
  value?: T | undefined;
  onValueChange?: (value: T | undefined) => void;
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
      onValueChange={(values) => onValueChange?.(values[0] as T | undefined)}
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
