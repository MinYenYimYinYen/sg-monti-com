/**
 * @deprecated This custom MultiSelect component is deprecated and should not be used in new code.
 * It does not follow the shadcn/ui component architecture and has inconsistent behavior.
 *
 * For new multi-select UIs, use a Popover + ScrollArea + Checkbox pattern instead.
 * See `FlagFilterSection.tsx` or `FlagRuleCRUD.tsx` for reference implementations.
 *
 * Existing usages are kept for backward compatibility but should be migrated over time.
 */
"use client";

import * as React from "react";
import { cn } from "@/lib/tailwindUtils";
import { Collapsible } from "@/style/components/collapsible";
import {
  MultiSelectContext as MultiSelectContext1,
  MultiSelectMode,
} from "@/components/multiselect/MultiSelectContext";

interface MultiSelectProps<TValue = string> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  mode?: MultiSelectMode;
  children: React.ReactNode;
  defaultValue?: TValue[];
  /**
   * Additional CSS classes to apply to the root container.
   * Merged with the required "relative" positioning class.
   */
  className?: string;
  /**
   * Function to extract a unique string key from a value.
   * Required for object values. Defaults to String(value) for primitives.
   */
  getValueKey?: (value: TValue) => string;
  /**
   * Function to compare two values for equality.
   * Defaults to === comparison.
   */
  compareValues?: (a: TValue, b: TValue) => boolean;
  /**
   * Function to get the display string for a single value.
   * Used in dropdown items. Defaults to getValueKey if not provided.
   */
  getDisplayValue?: (value: TValue) => string;
  /**
   * Function to get the display string for multiple selected values.
   * Takes precedence over getDisplayValue when displaying the trigger value.
   * Use this to show summaries like "3 items selected" instead of listing all items.
   */
  getMultiDisplayValue?: (values: TValue[]) => string;
}

export function MultiSelect<TValue = string>({
  value: controlledValue,
  onValueChange,
  mode = "multiple",
  children,
  defaultValue = [],
  className,
  getValueKey = (value) => String(value),
  compareValues = (a, b) => a === b,
  getDisplayValue,
  getMultiDisplayValue,
}: MultiSelectProps<TValue>) {
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState<TValue[]>(defaultValue);
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const items = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const itemLabels = React.useRef<Map<string, string>>(new Map());
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const value = controlledValue ?? uncontrolledValue;
  const handleValueChange = onValueChange ?? setUncontrolledValue;

  return (
    <MultiSelectContext1
      value={{
        value,
        onValueChange: handleValueChange,
        mode,
        isOpen,
        setIsOpen,
        focusedIndex,
        setFocusedIndex,
        items,
        itemLabels,
        triggerRef,
        getValueKey,
        compareValues,
        getDisplayValue,
        getMultiDisplayValue,
      }}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cn("relative", className)}
      >
        {children}
      </Collapsible>
    </MultiSelectContext1>
  );
}

// ============================================================================
// TRIGGER COMPONENT
// ============================================================================

// ============================================================================
// CONTENT COMPONENT
// ============================================================================

// ============================================================================
// ITEM COMPONENT
// ============================================================================

// ============================================================================
// SEPARATOR COMPONENT
// ============================================================================

// ============================================================================
// EMPTY COMPONENT
// ============================================================================

// ============================================================================
// VALUE DISPLAY HELPER
// ============================================================================
