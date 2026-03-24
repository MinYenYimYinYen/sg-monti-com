"use client";

import * as React from "react";
import { cn } from "@/lib/tailwindUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/style/components/collapsible";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";

// ============================================================================
// CONTEXT
// ============================================================================

type MultiSelectMode = "single" | "multiple";

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
const MultiSelectContext = React.createContext<MultiSelectContextValue<any> | undefined>(undefined);

function useMultiSelect<TValue = any>() {
  const context = React.useContext(MultiSelectContext);
  if (!context) {
    throw new Error("MultiSelect components must be used within MultiSelect");
  }
  return context as MultiSelectContextValue<TValue>;
}

// ============================================================================
// ROOT COMPONENT
// ============================================================================

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
  const [uncontrolledValue, setUncontrolledValue] = React.useState<TValue[]>(defaultValue);
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const items = React.useRef<Map<string, HTMLDivElement>>(new Map());
  const itemLabels = React.useRef<Map<string, string>>(new Map());
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const value = controlledValue ?? uncontrolledValue;
  const handleValueChange = onValueChange ?? setUncontrolledValue;

  return (
    <MultiSelectContext.Provider
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("relative", className)}>
        {children}
      </Collapsible>
    </MultiSelectContext.Provider>
  );
}

// ============================================================================
// TRIGGER COMPONENT
// ============================================================================

const multiSelectTriggerVariants = cva(
  "flex w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground",
  {
    variants: {
      variant: {
        default: "hover:bg-primary/10",
        outline: "border-primary/50",
      },
      size: {
        default: "h-9",
        sm: "h-8 text-xs px-2",
        lg: "h-10 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface MultiSelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof CollapsibleTrigger>,
    VariantProps<typeof multiSelectTriggerVariants> {}

export const MultiSelectTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  MultiSelectTriggerProps
>(({ className, variant, size, children, onKeyDown, ...props }, ref) => {
  const { isOpen, setIsOpen, setFocusedIndex, itemLabels, triggerRef } = useMultiSelect();
  const typeaheadRef = React.useRef({ buffer: "", timeout: null as NodeJS.Timeout | null });
  const internalRef = React.useRef<HTMLButtonElement>(null);

  // Combine refs
  React.useEffect(() => {
    const element = internalRef.current;
    triggerRef.current = element;

    if (typeof ref === 'function') {
      ref(element);
    } else if (ref) {
      ref.current = element;
    }
  }, [ref, triggerRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Call original onKeyDown if provided
    onKeyDown?.(e);

    // Don't intercept if dropdown is already open
    if (isOpen) return;

    // Handle alphanumeric keys for type-ahead
    if (e.key.length === 1 && /^[a-z0-9]$/i.test(e.key)) {
      e.preventDefault();

      // Clear existing timeout
      if (typeaheadRef.current.timeout) {
        clearTimeout(typeaheadRef.current.timeout);
      }

      // Add to buffer
      typeaheadRef.current.buffer += e.key.toLowerCase();

      // Set timeout to clear buffer
      typeaheadRef.current.timeout = setTimeout(() => {
        typeaheadRef.current.buffer = "";
      }, 500);

      // Search for matching item
      const labels = Array.from(itemLabels.current.entries());
      const matchIndex = labels.findIndex(([_, label]) =>
        label.toLowerCase().startsWith(typeaheadRef.current.buffer)
      );

      // Open dropdown and set focus to matching item
      setIsOpen(true);
      if (matchIndex >= 0) {
        setFocusedIndex(matchIndex);
      } else {
        setFocusedIndex(0);
      }
    }
  };

  return (
    <CollapsibleTrigger
      ref={internalRef}
      role="combobox"
      aria-expanded={isOpen}
      className={cn(multiSelectTriggerVariants({ variant, size }), className)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </CollapsibleTrigger>
  );
});
MultiSelectTrigger.displayName = "MultiSelectTrigger";

// ============================================================================
// CONTENT COMPONENT
// ============================================================================

interface MultiSelectContentProps extends React.ComponentPropsWithoutRef<"div"> {
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}

export const MultiSelectContent = React.forwardRef<HTMLDivElement, MultiSelectContentProps>(
  ({ className, align = "end", side = "bottom", children, ...props }, ref) => {
    const context = useMultiSelect();
    const { isOpen, setIsOpen, focusedIndex, mode, onValueChange, value, items: itemsMap, itemLabels, triggerRef } = context;
    const setFocusedIndex = context.setFocusedIndex as React.Dispatch<React.SetStateAction<number>>;
    const containerRef = React.useRef<HTMLDivElement>(null);
    const typeaheadRef = React.useRef({ buffer: "", timeout: null as NodeJS.Timeout | null });

    // Click outside to close
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          isOpen &&
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }
    }, [isOpen, setIsOpen]);

    // Auto-focus content when opened
    React.useEffect(() => {
      if (isOpen && containerRef.current) {
        const focusableDiv = containerRef.current.querySelector('[tabindex="0"]') as HTMLElement;
        focusableDiv?.focus();
      }
    }, [isOpen]);

    // Get focused item value
    const getFocusedItemValue = () => {
      const itemsArray = Array.from(itemsMap.current.entries());
      if (focusedIndex >= 0 && focusedIndex < itemsArray.length) {
        return itemsArray[focusedIndex];
      }
      return null;
    };

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      const items = Array.from(containerRef.current?.querySelectorAll("[data-multiselect-item]") || []);

      if (items.length === 0) return;

      // Handle letter keys for type-ahead when dropdown is open
      if (e.key.length === 1 && /^[a-z0-9]$/i.test(e.key)) {
        e.preventDefault();

        // Clear existing timeout
        if (typeaheadRef.current.timeout) {
          clearTimeout(typeaheadRef.current.timeout);
        }

        // Add to buffer
        typeaheadRef.current.buffer += e.key.toLowerCase();

        // Set timeout to clear buffer
        typeaheadRef.current.timeout = setTimeout(() => {
          typeaheadRef.current.buffer = "";
        }, 500);

        // Search for matching item
        const labels = Array.from(itemLabels.current.entries());
        const matchIndex = labels.findIndex(([_, label]) =>
          label.toLowerCase().startsWith(typeaheadRef.current.buffer)
        );

        if (matchIndex >= 0) {
          setFocusedIndex(matchIndex);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(items.length - 1);
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0) {
            // Trigger click on focused item
            const focusedItem = items[focusedIndex] as HTMLElement;
            focusedItem?.click();

            // In single mode, close dropdown and return focus
            if (mode === "single") {
              setIsOpen(false);
              triggerRef.current?.focus();
            }
          }
          break;
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0) {
            // Toggle selection of focused item
            const focusedItem = items[focusedIndex] as HTMLElement;
            focusedItem?.click();
          }
          break;
        case "Tab":
          // Don't prevent default - allow natural tab behavior
          if (focusedIndex >= 0) {
            // Select focused item (don't toggle, ensure it's selected)
            const focusedItem = items[focusedIndex] as HTMLElement;
            const isSelected = focusedItem?.getAttribute("data-selected") === "true";

            if (!isSelected) {
              focusedItem?.click();
            }
          }
          // Close dropdown
          setIsOpen(false);
          // Tab will naturally move focus
          break;
      }
    };

    // Auto-scroll focused item into view
    React.useEffect(() => {
      if (focusedIndex >= 0 && containerRef.current) {
        const items = Array.from(containerRef.current.querySelectorAll("[data-multiselect-item]"));
        const item = items[focusedIndex] as HTMLElement;
        item?.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }, [focusedIndex]);

    return (
      <CollapsibleContent
        ref={containerRef}
        className={cn(
          "absolute z-50 mt-2 rounded-md border bg-popover shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
          side === "top" && "bottom-full mb-2",
          side === "bottom" && "top-full mt-2"
        )}
        {...props}
      >
        <div
          ref={ref}
          className={cn("overflow-y-auto p-1", className)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {children}
        </div>
      </CollapsibleContent>
    );
  }
);
MultiSelectContent.displayName = "MultiSelectContent";

// ============================================================================
// ITEM COMPONENT
// ============================================================================

const multiSelectItemVariants = cva(
  "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors",
  {
    variants: {
      variant: {
        default: "hover:bg-primary/10",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface MultiSelectItemProps<TValue = string>
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof multiSelectItemVariants> {
  value: TValue;
  disabled?: boolean;
}

const MultiSelectItemInner = <TValue = string,>(
  { className, variant, value, disabled, children, onClick, ...props }: MultiSelectItemProps<TValue>,
  ref: React.ForwardedRef<HTMLDivElement>
) => {
    const { value: selectedValues, onValueChange, mode, focusedIndex, setFocusedIndex, items, itemLabels, getValueKey, compareValues } = useMultiSelect<TValue>();
    const itemRef = React.useRef<HTMLDivElement>(null);
    const [index, setIndex] = React.useState(-1);

    const valueKey = getValueKey(value);
    const isSelected = selectedValues.some((v) => compareValues(v, value));

    // Register item in map for keyboard navigation
    React.useEffect(() => {
      if (itemRef.current) {
        items.current.set(valueKey, itemRef.current);
        // Extract text content for type-ahead search
        const textContent = itemRef.current.textContent || "";
        itemLabels.current.set(valueKey, textContent);
        const allItems = Array.from(items.current.values());
        setIndex(allItems.indexOf(itemRef.current));
        return () => {
          items.current.delete(valueKey);
          itemLabels.current.delete(valueKey);
        };
      }
    }, [items, itemLabels, valueKey, children]);

    const isFocused = index === focusedIndex;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (mode === "single") {
        onValueChange([value]);
      } else {
        const newValues = isSelected
          ? selectedValues.filter((v) => !compareValues(v, value))
          : [...selectedValues, value];
        onValueChange(newValues);
      }

      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick(e as any);
      }
    };

    return (
      <div
        ref={React.useMemo(() => {
          return (node: HTMLDivElement) => {
            itemRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          };
        }, [ref])}
        data-multiselect-item
        data-selected={isSelected}
        data-disabled={disabled}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        className={cn(
          multiSelectItemVariants({ variant }),
          isSelected && "bg-primary/20 font-medium border-l-4 border-primary",
          !isSelected && "border-l-4 border-transparent",
          isFocused && !disabled && "bg-accent",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => !disabled && setFocusedIndex(index)}
        tabIndex={-1}
        {...props}
      >
        {children}
        {isSelected && (
          <span className="ml-auto flex h-4 w-4 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
      </div>
    );
  };

export const MultiSelectItem = React.forwardRef(MultiSelectItemInner) as <TValue = string>(
  props: MultiSelectItemProps<TValue> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

(MultiSelectItem as any).displayName = "MultiSelectItem";

// ============================================================================
// SEPARATOR COMPONENT
// ============================================================================

interface MultiSelectSeparatorProps extends React.ComponentPropsWithoutRef<"div"> {}

export const MultiSelectSeparator = React.forwardRef<HTMLDivElement, MultiSelectSeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        className={cn("-mx-1 my-1 h-px bg-muted", className)}
        {...props}
      />
    );
  }
);
MultiSelectSeparator.displayName = "MultiSelectSeparator";

// ============================================================================
// EMPTY COMPONENT
// ============================================================================

interface MultiSelectEmptyProps extends React.ComponentPropsWithoutRef<"div"> {}

export const MultiSelectEmpty = React.forwardRef<HTMLDivElement, MultiSelectEmptyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-4 text-center text-sm text-muted-foreground", className)}
        {...props}
      >
        {children || "No items found"}
      </div>
    );
  }
);
MultiSelectEmpty.displayName = "MultiSelectEmpty";

// ============================================================================
// VALUE DISPLAY HELPER
// ============================================================================

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
        className
      )}
      data-placeholder={!hasValue}
    >
      {displayText}
    </span>
  );
}
