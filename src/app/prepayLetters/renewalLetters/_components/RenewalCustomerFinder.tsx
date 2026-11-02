"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { renewalLettersSelect } from "../renewalLettersSelect";
import { renewalLettersActions } from "../renewalLettersSlice";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/style/components/popover";

const MAX_SUGGESTIONS = 10;

/**
 * Numeric custId search over the loaded customers. The typed text is local on purpose: only the
 * picked custId is shared state, and nothing here narrows the customers that can be found.
 * The suggestions open to the right so they land in the right panel, which has room for them.
 */
export function RenewalCustomerFinder() {
  const dispatch = useAppDispatch();
  const hasLoadedCustomers = useSelector(renewalLettersSelect.hasLoadedCustomers);
  const lookupCustomers = useSelector(renewalLettersSelect.lookupCustomers);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);

  if (!hasLoadedCustomers) return null;

  const suggestions = text
    ? lookupCustomers
        .filter((option) => String(option.custId).startsWith(text))
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const exactMatch = text ? lookupCustomers.find((option) => String(option.custId) === text) : undefined;
  const isOpen = suggestions.length > 0 && !isDismissed;

  const pick = (custId: number) => {
    dispatch(renewalLettersActions.setSelectedCustId(custId));
    setText("");
    setIsDismissed(false);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value.replace(/\D/g, ""));
    setIsDismissed(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsDismissed(true);
      return;
    }
    if (event.key !== "Enter" && event.key !== "Tab") return;
    if (!exactMatch) return;
    // Tab keeps its default so focus still moves on; Enter would otherwise submit a form.
    if (event.key === "Enter") event.preventDefault();
    pick(exactMatch.custId);
  };

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor="renewal-find-customer"
        className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        Find Customer
      </Label>
      <Popover open={isOpen} onOpenChange={(open) => !open && setIsDismissed(true)}>
        <PopoverAnchor asChild>
          <Input
            id="renewal-find-customer"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Customer ID"
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </PopoverAnchor>
        <PopoverContent
          side="right"
          align="start"
          className="w-80 p-1"
          // Focus must stay in the input or typing the rest of the id would stop.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (event.target === inputRef.current) event.preventDefault();
          }}
        >
          <ul>
            {suggestions.map((option) => (
              <li key={option.custId}>
                <button
                  type="button"
                  className="w-full truncate rounded px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent/20"
                  onClick={() => pick(option.custId)}
                >
                  {option.custId}-{option.displayName}
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      {text && suggestions.length === 0 && (
        <p className="text-xs text-muted-foreground">Not in the loaded customers</p>
      )}
    </div>
  );
}
