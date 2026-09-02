"use client";

import { useSelector } from "react-redux";
import { promiseSanitySelect } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { ValidCasesRow } from "@/app/sanity/promiseSanity/_components/ValidCasesRow";

export function ValidCasesList() {
  const validCasesCustomers = useSelector(promiseSanitySelect.validCasesCustomers);

  if (validCasesCustomers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No services with a valid promise note found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {validCasesCustomers.map((validCasesCustomer) => (
        <ValidCasesRow
          key={validCasesCustomer.customer.custId}
          validCasesCustomer={validCasesCustomer}
        />
      ))}
    </div>
  );
}
