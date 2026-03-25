import * as React from "react";

export type MultiSelectMode = "single" | "multiple";
type MultiSelectContextValue<TValue = any> = {
  value: TValue[];
  onValueChange: (value: TValue[]) => void;
  mode: MultiSelectMode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  items: React.RefObject<Map<string, HTMLDivElement>>;
  itemLabels: React.RefObject<Map<string, string>>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  getValueKey: (value: TValue) => string;
  compareValues: (a: TValue, b: TValue) => boolean;
  getDisplayValue?: (value: TValue) => string;
  getMultiDisplayValue?: (values: TValue[]) => string;
};
// Use a less specific type for the context to allow generic usage
export const MultiSelectContext = React.createContext<
  MultiSelectContextValue<any> | undefined
>(undefined);

export function useMultiSelect<TValue = any>() {
  const context = React.useContext(MultiSelectContext);
  if (!context) {
    throw new Error("MultiSelect components must be used within MultiSelect");
  }
  return context as MultiSelectContextValue<TValue>;
}