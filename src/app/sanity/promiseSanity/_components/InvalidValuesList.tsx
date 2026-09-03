"use client";

import { useSelector } from "react-redux";
import { promiseSanitySelect } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { InvalidValuesRow } from "@/app/sanity/promiseSanity/_components/InvalidValuesRow";

export function InvalidValuesList() {
  const customers = useSelector(promiseSanitySelect.invalidValuesCustomers);

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No promise notes with parse errors found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {customers.map((customer) => (
        <InvalidValuesRow key={customer.customer.custId} invalidValuesCustomer={customer} />
      ))}
    </div>
  );
}
