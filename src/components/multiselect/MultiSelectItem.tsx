import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { useMultiSelect } from "@/components/multiselect/MultiSelectContext";
import { cn } from "@/lib/tailwindUtils";
import { Check } from "lucide-react";

const multiSelectItemVariants = cva(
  "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors",
  {
    variants: {
      variant: {
        default: "hover:bg-primary/5 hover:border hover:border-primary/10",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:border hover:border-primary/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface MultiSelectItemProps<TValue = string>
  extends React.ComponentPropsWithoutRef<"div">,
    VariantProps<typeof multiSelectItemVariants> {
  value: TValue;
  disabled?: boolean;
}

const MultiSelectItemInner = <TValue = string,>(
  {
    className,
    variant,
    value,
    disabled,
    children,
    onClick,
    ...props
  }: MultiSelectItemProps<TValue>,
  ref: React.ForwardedRef<HTMLDivElement>,
) => {
  const {
    value: selectedValues,
    onValueChange,
    mode,
    focusedIndex,
    setFocusedIndex,
    items,
    itemLabels,
    getValueKey,
    compareValues,
    setIsOpen,
  } = useMultiSelect<TValue>();
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
      // Toggle off if already selected, otherwise select
      onValueChange(isSelected ? [] : [value]);
      // Close dropdown after selection in single mode
      setIsOpen(false);
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
        isFocused && !disabled && "bg-primary/10 border border-primary/30",
        disabled && "opacity-50 cursor-not-allowed",
        className,
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
export const MultiSelectItem = React.forwardRef(MultiSelectItemInner) as <
  TValue = string,
>(
  props: MultiSelectItemProps<TValue> & {
    ref?: React.ForwardedRef<HTMLDivElement>;
  },
) => React.ReactElement;

(MultiSelectItem as any).displayName = "MultiSelectItem";
