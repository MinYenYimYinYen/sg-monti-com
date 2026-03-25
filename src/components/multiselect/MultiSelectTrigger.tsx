import * as React from "react";
import { CollapsibleTrigger } from "@/style/components/collapsible";
import { useMultiSelect } from "@/components/multiselect/MultiSelectContext";
import { cn } from "@/lib/tailwindUtils";
import { cva, type VariantProps } from "class-variance-authority";

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
  },
);

interface MultiSelectTriggerProps
  extends React.ComponentPropsWithoutRef<typeof CollapsibleTrigger>,
    VariantProps<typeof multiSelectTriggerVariants> {}

export const MultiSelectTrigger = React.forwardRef<
  React.ElementRef<typeof CollapsibleTrigger>,
  MultiSelectTriggerProps
>(({ className, variant, size, children, onKeyDown, ...props }, ref) => {
  const { isOpen, setIsOpen, setFocusedIndex, itemLabels, triggerRef } =
    useMultiSelect();
  const typeaheadRef = React.useRef({
    buffer: "",
    timeout: null as NodeJS.Timeout | null,
  });
  const internalRef = React.useRef<HTMLButtonElement>(null);

  // Combine refs
  React.useEffect(() => {
    const element = internalRef.current;
    triggerRef.current = element;

    if (typeof ref === "function") {
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
        label.toLowerCase().startsWith(typeaheadRef.current.buffer),
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
