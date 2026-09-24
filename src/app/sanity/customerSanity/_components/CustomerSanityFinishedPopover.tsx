"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/hooks/redux";
import { customerSanitySelect } from "@/app/sanity/customerSanity/customerSanitySelect";
import { sanityActions } from "@/app/sanity/sanitySlice";
import { CustomerRow } from "@/app/sanity/customerSanity/_components/CustomerRow";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/style/components/popover";
import { Button } from "@/style/components/button";
import { CheckCircle } from "lucide-react";

export function CustomerSanityFinishedPopover() {
  const dispatch = useAppDispatch();
  const finishedCustomers = useSelector(customerSanitySelect.finishedCustomers);
  const finishedCount = useSelector(customerSanitySelect.finishedCount);
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (finishedCount === 0) return null;

  const handleClearAll = () => {
    dispatch(sanityActions.clearCustomerSanityFinished());
    setConfirmingClear(false);
  };

  return (
    <Popover onOpenChange={() => setConfirmingClear(false)}>
      <PopoverTrigger asChild>
        <Button
          variant="accent"
          intensity="ghost"
          size="sm"
          className="h-7 gap-1.5 shrink-0"
          title="View finished customers"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="text-xs">{finishedCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[480px] p-0 overflow-hidden"
        align="end"
        sideOffset={6}
      >
        {/* Popover header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <span className="text-sm font-semibold text-foreground">
            Finished Customers ({finishedCount})
          </span>
          {!confirmingClear ? (
            <Button
              variant="destructive"
              intensity="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setConfirmingClear(true)}
            >
              Clear All
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Confirm?</span>
              <Button
                variant="destructive"
                intensity="solid"
                size="sm"
                className="h-6 text-xs"
                onClick={handleClearAll}
              >
                Yes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setConfirmingClear(false)}
              >
                No
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable list of finished customers */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1">
          {finishedCustomers.map((customer) => (
            <CustomerRow
              key={customer.custId}
              customer={customer}
              mode="finished"
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
