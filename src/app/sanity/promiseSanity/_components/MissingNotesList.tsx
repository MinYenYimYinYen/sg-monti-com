"use client";

import { useSelector } from "react-redux";
import { promiseSanitySelect } from "@/app/sanity/promiseSanity/promiseSanitySelect";
import { MissingNotesRow } from "@/app/sanity/promiseSanity/_components/MissingNotesRow";

export function MissingNotesList() {
  const missingNotesCustomers = useSelector(promiseSanitySelect.missingNotesCustomers);

  if (missingNotesCustomers.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        All promised services have a promise note.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {missingNotesCustomers.map((missingNotesCustomer) => (
        <MissingNotesRow
          key={missingNotesCustomer.customer.custId}
          missingNotesCustomer={missingNotesCustomer}
        />
      ))}
    </div>
  );
}
