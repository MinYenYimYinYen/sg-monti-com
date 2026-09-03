"use client";

import { useSelector } from "react-redux";
import { promiseSanitySelect } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { InvalidPromiseNoteRow } from "@/app/sanity/promiseSanity/_components/InvalidPromiseNoteRow";

export function InvalidPromiseNoteList() {
  const customers = useSelector(promiseSanitySelect.invalidPromiseNoteCustomers);

  if (customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        All promised services have a promise note.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {customers.map((customer) => (
        <InvalidPromiseNoteRow key={customer.customer.custId} invalidNoteCustomer={customer} />
      ))}
    </div>
  );
}
