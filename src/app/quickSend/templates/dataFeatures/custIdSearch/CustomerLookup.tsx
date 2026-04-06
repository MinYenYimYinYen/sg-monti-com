"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useSingleCustomer } from "@/app/quickSend/useSingleCustomer";
import { quickSendSelect } from "@/app/quickSend/quickSendSelect";
import { Input } from "@/style/components/input";
import { Button } from "@/style/components/button";

/**
 * Customer lookup control for template sender.
 * Renders a custId input field and search button when custIdSearch data feature is enabled.
 * Shows currently loaded customer and allows clearing.
 */
export function CustomerLookup() {
  const [custId, setCustId] = useState<string>("");
  const { lookup } = useSingleCustomer();
  const customer = useSelector(quickSendSelect.customer);

  const handleSearch = () => {
    const id = parseInt(custId, 10);
    if (!isNaN(id) && id > 0) {
      lookup(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
        Customer Lookup
      </span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Enter Customer ID"
          value={custId}
          onChange={(e) => setCustId(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-40"
        />
        <Button
          size="default"
          variant="primary"
          intensity="solid"
          onClick={handleSearch}
          disabled={!custId || parseInt(custId, 10) <= 0}
        >
          Search
        </Button>
        {customer && (
          <>
            <span className="text-sm text-foreground/70">
              Loaded: <span className="font-medium">{customer.displayName}</span>
            </span>
            <Button
              size="default"
              variant="outline"
              intensity="ghost"
              onClick={() => setCustId("")}
            >
              Clear
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
