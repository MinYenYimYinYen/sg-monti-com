import * as React from "react";
import { useMultiSelect } from "@/components/multiselect/MultiSelectContext";
import { CollapsibleContent } from "@/style/components/collapsible";
import { cn } from "@/lib/tailwindUtils";

export interface MultiSelectContentProps
  extends React.ComponentPropsWithoutRef<"div"> {
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}
export const MultiSelectContent = React.forwardRef<
  HTMLDivElement,
  MultiSelectContentProps
>(({ className, align = "end", side = "bottom", children, ...props }, ref) => {
  const context = useMultiSelect();
  const {
    isOpen,
    setIsOpen,
    focusedIndex,
    mode,
    onValueChange,
    value,
    items: itemsMap,
    itemLabels,
    triggerRef,
  } = context;
  const setFocusedIndex = context.setFocusedIndex as React.Dispatch<
    React.SetStateAction<number>
  >;
  const containerRef = React.useRef<HTMLDivElement>(null);
  const typeaheadRef = React.useRef({
    buffer: "",
    timeout: null as NodeJS.Timeout | null,
  });

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
      const focusableDiv = containerRef.current.querySelector(
        '[tabindex="0"]',
      ) as HTMLElement;
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
    const items = Array.from(
      containerRef.current?.querySelectorAll("[data-multiselect-item]") || [],
    );

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
        label.toLowerCase().startsWith(typeaheadRef.current.buffer),
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
          const isSelected =
            focusedItem?.getAttribute("data-selected") === "true";

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
      const items = Array.from(
        containerRef.current.querySelectorAll("[data-multiselect-item]"),
      );
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
        side === "bottom" && "top-full mt-2",
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
});
MultiSelectContent.displayName = "MultiSelectContent";