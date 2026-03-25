import * as React from "react";
import { useMultiSelect } from "@/components/multiselect/MultiSelectContext";
import { cn } from "@/lib/tailwindUtils";

interface MultiSelectValueProps<TValue = string> {
  placeholder?: string;
  children?: (values: TValue[]) => React.ReactNode;
  className?: string;
}

export function MultiSelectValue<TValue = string>({
  placeholder = "Select...",
  children,
  className,
}: MultiSelectValueProps<TValue>) {
  const { value, getValueKey, getDisplayValue, getMultiDisplayValue } =
    useMultiSelect<TValue>();

  if (children) {
    return <>{children(value)}</>;
  }

  const hasValue = value.length > 0;

  // Use getMultiDisplayValue if provided, otherwise fall back to mapping individual values
  const displayText = hasValue
    ? getMultiDisplayValue
      ? getMultiDisplayValue(value)
      : value.map(getDisplayValue || getValueKey).join(", ")
    : placeholder;

  return (
    <span
      className={cn(
        "flex-1 text-left truncate",
        !hasValue && "text-muted-foreground",
        className,
      )}
      data-placeholder={!hasValue}
    >
      {displayText}
    </span>
  );
}