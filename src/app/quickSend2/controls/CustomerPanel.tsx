"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { useSingleCustomer } from "@/app/realGreen/customer/hooks/useSingleCustomer";
import { singleCustSelect } from "@/app/realGreen/customer/selectors/singleCustSelect";
import { zipCodeSelect } from "@/app/realGreen/zipCode/zipCodeSelectors";
import { qs2Select } from "../quickSendSelect";
import { quickSend2Actions } from "../quickSendSlice";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";
import { Button } from "@/style/components/button";
import { Number } from "@/components/Number";
import { Search, X, ChevronDown, ChevronRight } from "lucide-react";
import { PrepaySelector } from "./PrepaySelector";

/**
 * Left-panel section for customer lookup and all customer-derived overrides:
 * name, size, and tax rate.
 *
 * Always visible — unlike v1 where controls were conditionally rendered based
 * on which @variables were present in the template.
 */
export function CustomerPanel() {
  const dispatch = useAppDispatch();
  const { lookup, clearCustomer } = useSingleCustomer();

  const customerState = useSelector(qs2Select.customerState);
  const loadedCustomer = useSelector(singleCustSelect.customer);
  const effectiveTaxRate = useSelector(qs2Select.effectiveTaxRate);
  const effectiveGlobalPrepayId = useSelector(qs2Select.effectiveGlobalPrepayId);
  const auxIds = useSelector(qs2Select.activeAuxIds);
  const auxValues = useSelector(qs2Select.auxValues);
  const zipCodes = useSelector(zipCodeSelect.zipCodes);

  const [inputValue, setInputValue] = useState<string>(
    customerState.custId !== null ? String(customerState.custId) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  // When Redux delivers the customer from the single-customer slice, push it into quickSend2 state.
  useEffect(() => {
    if (loadedCustomer && loadedCustomer !== customerState.customer) {
      dispatch(quickSend2Actions.setCustomer(loadedCustomer));
    }
  }, [dispatch, loadedCustomer, customerState.customer]);

  const handleSearch = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid Customer ID.");
      return;
    }
    setError(null);
    dispatch(quickSend2Actions.setCustId(parsed));
    lookup(parsed);
  };

  const handleClear = () => {
    if (customerState.custId !== null) {
      clearCustomer(customerState.custId);
    }
    setInputValue("");
    setError(null);
    dispatch(quickSend2Actions.clearCustomer());
  };

  const sortedZipCodes = [...zipCodes].sort((a, b) => a.zip.localeCompare(b.zip));
  const customerTaxRate = customerState.customer?.taxRate ?? null;
  const zipOverride = customerState.taxRateZipOverride;

  return (
    <div className="border-b border-border">
      {/* Header */}
      <button
        className="flex w-full items-center justify-between px-4 py-1.5 text-left bg-primary/30 hover:bg-primary/40 transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
          Customer
        </span>
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-0">
          {/* Customer ID lookup */}
          <div className="flex flex-col gap-0.5 px-4 py-1">
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

          {/* Name override */}
          <div className="flex flex-col gap-0.5 px-4 py-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              className="h-7 text-sm"
              placeholder="Customer name…"
              value={customerState.nameOverride}
              onChange={(e) => dispatch(quickSend2Actions.setNameOverride(e.target.value))}
            />
          </div>

          {/* Size override */}
          <div className="flex flex-col gap-0.5 px-4 py-1">
            <Label className="text-xs text-muted-foreground">Size</Label>
            <Input
              className="h-7 text-sm"
              placeholder="Lawn size…"
              value={customerState.sizeOverride}
              onChange={(e) => dispatch(quickSend2Actions.setSizeOverride(e.target.value))}
            />
          </div>

          {/* Prepay */}
          <div className="flex flex-col gap-0.5 px-4 py-1">
            <PrepaySelector
              value={effectiveGlobalPrepayId}
              onChange={(prepayId) => dispatch(quickSend2Actions.setGlobalPrepayId(prepayId))}
              label="Prepay"
            />
          </div>

          {/* Tax rate override */}
          <div className="flex flex-col gap-0.5 px-4 py-1">
            <Label className="text-xs text-muted-foreground">Tax rate</Label>
            {customerTaxRate != null && (
              <p className="text-xs text-muted-foreground">
                Customer rate:{" "}
                <span className="font-medium text-foreground">
                  {customerTaxRate.toFixed(3)}%
                </span>
              </p>
            )}
            <select
              value={zipOverride ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                dispatch(quickSend2Actions.setTaxRateZipOverride(value === "" ? null : value));
              }}
              className="text-xs rounded border border-border bg-card text-foreground px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">
                {customerTaxRate != null
                  ? `Use customer rate (${customerTaxRate.toFixed(3)}%)`
                  : "Use customer rate"}
              </option>
              {sortedZipCodes.map((zipCode) => (
                <option key={zipCode.zip} value={zipCode.zip}>
                  {zipCode.zip} — {zipCode.city} ({zipCode.taxRate.toFixed(3)}%)
                </option>
              ))}
            </select>
            {effectiveTaxRate != null && (
              <p className="text-xs text-muted-foreground">
                Effective:{" "}
                <span className="font-medium text-foreground">
                  <Number decimals={3}>{effectiveTaxRate}</Number>%
                </span>
              </p>
            )}
          </div>

          {/* Aux mention values */}
          {auxIds.map((auxId) => {
            const label = auxId === "aux" ? "Aux" : `Aux ${auxId.slice(4).replace("_", "")}`;
            return (
              <div key={auxId} className="flex flex-col gap-0.5 px-4 py-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Value…"
                  value={auxValues[auxId] ?? ""}
                  onChange={(e) =>
                    dispatch(quickSend2Actions.setAuxValue({ id: auxId, value: e.target.value }))
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
