"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { cn } from "@/style/utils";
import { PickerOption } from "@/app/account/_lib/accountMappingView";

/**
 * A searchable single-choice list, used for QuickBooks accounts, customers and vendors. Suggested
 * options are listed first and also stay in their natural place in the full list, so the list
 * never reorders under the user.
 */
export function MappingPicker({
  options,
  suggestedIds,
  value,
  selectedLabel,
  placeholder,
  onSelectAction,
  disabled,
}: {
  options: PickerOption[];
  suggestedIds: Set<string>;
  /** The chosen option's id, or "" when nothing is chosen. */
  value: string;
  /** Shown when the chosen id is not among the options (inactive, or no longer in QuickBooks). */
  selectedLabel: string | null;
  placeholder: string;
  onSelectAction: (id: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const matchingOptions = needle
    ? options.filter((option) => option.label.toLowerCase().includes(needle))
    : options;
  const suggestedOptions = matchingOptions.filter((option) =>
    suggestedIds.has(option.id),
  );
  const chosenLabel =
    options.find((option) => option.id === value)?.label ?? selectedLabel;

  const handleOpenChange = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    if (!nextOpen) setQuery("");
  };

  const choose = (id: string) => {
    onSelectAction(id);
    handleOpenChange(false);
  };

  const renderOption = (option: PickerOption, section: string) => (
    <button
      key={`${section}:${option.id}`}
      type="button"
      onClick={() => choose(option.id)}
      className={cn(
        "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent/20",
        suggestedIds.has(option.id) && "bg-primary/10 font-medium",
        option.id === value && "ring-1 ring-primary",
      )}
    >
      {option.label}
    </button>
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          aria-label={placeholder}
          disabled={disabled}
        >
          <span
            className={cn("truncate", !chosenLabel && "text-muted-foreground")}
          >
            {chosenLabel ?? placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 space-y-2 p-2">
        <Input
          autoFocus
          placeholder="Search..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {suggestedOptions.length > 0 && (
            <>
              <div className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Suggested
              </div>
              {suggestedOptions.map((option) =>
                renderOption(option, "suggested"),
              )}
              <div className="px-2 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                All
              </div>
            </>
          )}
          {matchingOptions.map((option) => renderOption(option, "all"))}
          {matchingOptions.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              Nothing matches.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
