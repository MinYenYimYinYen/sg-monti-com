"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useGlobalSettings } from "@/app/globalSettings/_lib/useGlobalSettings";
import { globalSettingsSelect } from "@/app/globalSettings/_lib/globalSettingsSelect";
import { singleCustomerActions } from "@/app/realGreen/customer/slices/customerSlices";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { Search, X } from "lucide-react";
import type { QSCustomerState } from "./QuickSendTypes";
import { useSingleCustomer } from "@/app/realGreen/customer/hooks/useSingleCustomer";
import { singleCustSelect } from "@/app/realGreen/customer/selectors/singleCustSelect";

type Props = {
  state: QSCustomerState;
  onChange: (state: QSCustomerState) => void;
  showSize: boolean;
};

export function CustomerLookup({ state, onChange, showSize }: Props) {
  useGlobalSettings({ autoLoad: true });
  const { lookup } = useSingleCustomer();
  const season = useSelector(globalSettingsSelect.season);
  const loadedCustomer = useSelector(singleCustSelect.customer)

  const [inputValue, setInputValue] = useState<string>(
    state.custId !== null ? String(state.custId) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSearch = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid Customer ID.");
      return;
    }
    if (!season) {
      setError("Season not loaded yet.");
      return;
    }
    setError(null);
    lookup(parseInt(inputValue));
    // Optimistically store the custId; customer will arrive via Redux
    onChange({
      ...state,
      custId: parsed,
      customer: null,
      nameOverride: "",
      sizeOverride: "",
    });
  };

  const handleClear = () => {
    setInputValue("");
    setError(null);
    onChange({
      custId: null,
      customer: null,
      nameOverride: "",
      sizeOverride: "",
    });
  };


  if (loadedCustomer && loadedCustomer !== state.customer) {
    onChange({
      ...state,
      customer: loadedCustomer,
      nameOverride: state.nameOverride || loadedCustomer.displayName,
      sizeOverride: state.sizeOverride || String(loadedCustomer.size),
    });
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Customer ID lookup */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Customer ID</Label>
        <div className="flex gap-1.5">
          <Input
            className="h-8 text-sm"
            placeholder="Enter ID…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
          />
          <Button
            size="sm"
            variant="primary"
            intensity="soft"
            className="h-8 px-2 shrink-0"
            onClick={handleSearch}
            disabled={!inputValue}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          {state.custId !== null && (
            <Button
              size="sm"
              variant="destructive"
              intensity="ghost"
              className="h-8 px-2 shrink-0"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {state.customer && (
          <p className="text-xs text-muted-foreground">
            Loaded:{" "}
            <span className="font-medium text-foreground">
              {state.customer.displayName}
            </span>
          </p>
        )}
      </div>

      {/* Name override */}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Name override</Label>
        <Input
          className="h-8 text-sm"
          placeholder="Customer name…"
          value={state.nameOverride}
          onChange={(e) => onChange({ ...state, nameOverride: e.target.value })}
        />
      </div>

      {/* Size override — only shown when @size is active */}
      {showSize && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Size override</Label>
          <Input
            className="h-8 text-sm"
            placeholder="Lawn size…"
            value={state.sizeOverride}
            onChange={(e) =>
              onChange({ ...state, sizeOverride: e.target.value })
            }
          />
        </div>
      )}
    </div>
  );
}
