"use client";

import { useSelector } from "react-redux";
import { sizeSanitySelect } from "@/app/sanity/sizeSanity/sizeSanitySelect";
import { SizeSanityCustomerRow } from "@/app/sanity/sizeSanity/_components/SizeSanityCustomerRow";

export function SizeSanityCustomerList() {
  const sizeSanityCustomers = useSelector(sizeSanitySelect.sizeSanityCustomers);

  if (sizeSanityCustomers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No size or price discrepancies found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sizeSanityCustomers.map((sizeSanityCustomer) => (
        <SizeSanityCustomerRow
          key={sizeSanityCustomer.customer.custId}
          sizeSanityCustomer={sizeSanityCustomer}
        />
      ))}
    </div>
  );
}
