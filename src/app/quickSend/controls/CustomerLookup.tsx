"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useSingleCustomer } from "@/app/realGreen/customer/hooks/useSingleCustomer";
import { singleCustSelect } from "@/app/realGreen/customer/selectors/singleCustSelect";
import { quickSendActions } from "../quickSendSlice";
import { quickSendSelect } from "../quickSendSelect";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { Search, X } from "lucide-react";

export function CustomerLookup() {
  const dispatch = useAppDispatch();
  const { lookup } = useSingleCustomer();

  const customerState = useSelector(quickSendSelect.customerState);
  const loadedCustomer = useSelector(singleCustSelect.customer);

  const [inputValue, setInputValue] = useState<string>(
    customerState.custId !== null ? String(customerState.custId) : "",
  );
  const [error, setError] = useState<string | null>(null);

  // When Redux delivers the customer from the single-customer slice, push it into quickSend state.
  useEffect(() => {
    if (loadedCustomer && loadedCustomer !== customerState.customer) {
      dispatch(quickSendActions.setCustomer(loadedCustomer));
    }
  }, [dispatch, loadedCustomer, customerState.customer]);

  const handleSearch = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid Customer ID.");
      return;
    }
    setError(null);
    dispatch(quickSendActions.setCustId(parsed));
    lookup(parsed);
  };

  const handleClear = () => {
    setInputValue("");
    setError(null);
    dispatch(quickSendActions.clearCustomer());
  };

  return (
    <div className="flex flex-col gap-1 px-4 py-3 border-b border-border">
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
        {customerState.custId !== null && (
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
      {customerState.customer && (
        <p className="text-xs text-muted-foreground">
          Loaded:{" "}
          <span className="font-medium text-foreground">
            {customerState.customer.displayName}
          </span>
        </p>
      )}
    </div>
  );
}
