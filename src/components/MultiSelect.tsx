"use client";

import * as React from "react";
import { cn } from "@/lib/tailwindUtils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/style/components/collapsible";
import { Button } from "@/style/components/button";
import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";

// ============================================================================
// CONTEXT
// ============================================================================

type MultiSelectMode = "single" | "multiple";

type MultiSelectContextValue<TValue extends string | number = string> = {
  value: TValue[];
  onValueChange: (value: TValue[]) => void;
  mode: MultiSelectMode;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  items: React.RefObject<Map<TValue, HTMLDivElement>>;
};

// Use a less specific type for the context to allow generic usage
const MultiSelectContext = React.createContext<MultiSelectContextValue<any> | undefined>(undefined);

function useMultiSelect<TValue extends string | number = string>() {
  const context = React.useContext(MultiSelectContext) as MultiSelectContextValue<TValue> | undefined;
  if (!context) {
    throw new Error("MultiSelect components must be used within MultiSelect");
  }
  return context;
}

// ============================================================================
// ROOT COMPONENT
// ============================================================================

interface MultiSelectProps<TValue extends string | number = string> {
  value?: TValue[];
  onValueChange?: (value: TValue[]) => void;
  mode?: MultiSelectMode;
  children: React.ReactNode;
  defaultValue?: TValue[];
}

export function MultiSelect<TValue extends string | number = string>({
  value: controlledValue,
  onValueChange,
  mode = "multiple",
  children,
  defaultValue = [] as TValue[],
}: MultiSelectProps<TValue>) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState<TValue[]>(defaultValue);
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const items = React.useRef<Map<TValue, HTMLDivElement>>(new Map());

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
      }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="relative">
        {children}
      </Collapsible>
    </MultiSelectContext.Provider>
  );
}

// ============================================================================
// TRIGGER COMPONENT
// ============================================================================

interface MultiSelectTriggerProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, "variant"> {
  asChild?: boolean;
}

export const MultiSelectTrigger = React.forwardRef<HTMLButtonElement, MultiSelectTriggerProps>(
  ({ className, children, asChild, ...props }, ref) => {
    const { isOpen } = useMultiSelect();

    return (
      <CollapsibleTrigger asChild={asChild}>
        <Button
          asChild
          ref={ref}
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn("justify-between", className)}
          {...props}
        >
          {children}
        </Button>
      </CollapsibleTrigger>
    );
  }
);
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
    const { isOpen, setIsOpen, focusedIndex } = context;
    const setFocusedIndex = context.setFocusedIndex as React.Dispatch<React.SetStateAction<number>>;
    const containerRef = React.useRef<HTMLDivElement>(null);

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

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      const items = Array.from(containerRef.current?.querySelectorAll("[data-multiselect-item]") || []);

      if (items.length === 0) return;

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
        default: "hover:bg-accent/50 hover:text-accent-foreground data-[focused=true]:bg-accent/30",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface MultiSelectItemProps<TValue extends string | number = string>
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof multiSelectItemVariants> {
  value: TValue;
  disabled?: boolean;
}

type MultiSelectItemComponent = <TValue extends string | number = string>(
  props: MultiSelectItemProps<TValue> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

export const MultiSelectItem = React.forwardRef(<TValue extends string | number = string>(
  { className, variant, value, disabled, children, onClick, ...props }: MultiSelectItemProps<TValue>,
  ref: React.ForwardedRef<HTMLDivElement>
) => {
    const { value: selectedValues, onValueChange, mode, focusedIndex, setFocusedIndex, items } = useMultiSelect<TValue>();
    const itemRef = React.useRef<HTMLDivElement>(null);
    const [index, setIndex] = React.useState(-1);

    const isSelected = selectedValues.includes(value);

    // Register item in map
    React.useEffect(() => {
      if (itemRef.current) {
        items.current.set(value, itemRef.current);
        const allItems = Array.from(items.current.values());
        setIndex(allItems.indexOf(itemRef.current));
        return () => {
          items.current.delete(value);
        };
      }
    }, [items, value]);

    const isFocused = index === focusedIndex;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (mode === "single") {
        onValueChange([value]);
      } else {
        const newValues = isSelected
          ? selectedValues.filter((v) => v !== value)
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
        data-focused={isFocused}
        data-selected={isSelected}
        data-disabled={disabled}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
        className={cn(
          multiSelectItemVariants({ variant }),
          isSelected && "bg-primary/20 font-medium border-l-4 border-primary",
          !isSelected && "border-l-4 border-transparent",
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
  }) as MultiSelectItemComponent & { displayName?: string };

MultiSelectItem.displayName = "MultiSelectItem";

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

interface MultiSelectValueProps<TValue extends string | number = string> {
  placeholder?: string;
  children?: (values: TValue[]) => React.ReactNode;
}

export function MultiSelectValue<TValue extends string | number = string>({
  placeholder = "Select...",
  children,
}: MultiSelectValueProps<TValue>) {
  const { value } = useMultiSelect<TValue>();

  if (children) {
    return <>{children(value)}</>;
  }

  return <>{value.length > 0 ? value.join(", ") : placeholder}</>;
}
