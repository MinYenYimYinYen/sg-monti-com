import { createSelector } from "@reduxjs/toolkit";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

// ---------------------------------------------------------------------------
// Ordered exclusive checks — each program gets at most one reason label.
// Checks are applied in priority order (most actionable first):
//   1. inconsistentSizes   — services disagree on size (root problem)
//   2. inconsistentPrices  — sizes agree but nextPrices differ
//   3. customerSizeMismatch — sizes and prices agree but differ from customer.size
//
// Only renewal-eligible services (status !== "N") are considered, consistent
// with the zero-revenue check.
// ---------------------------------------------------------------------------

export type SizeSanityReason =
  | "inconsistentSizes"
  | "inconsistentPrices"
  | "customerSizeMismatch";

export type FlaggedProgram = {
  program: Program;
  reason: SizeSanityReason;
};

export type SizeSanityCustomer = {
  customer: Customer;
  flaggedPrograms: FlaggedProgram[];
};

function classifyProgram(
  program: Program,
  customerSize: number,
): SizeSanityReason | null {
  const renewalServices = program.services.filter((s) => s.status !== "N");
  if (renewalServices.length === 0) return null;

  const nextSizes = renewalServices.map((s) => s.nextSize);
  const uniqueNextSizes = new Set(nextSizes);

  if (uniqueNextSizes.size > 1) return "inconsistentSizes";

  const nextPrices = renewalServices.map((s) => s.nextPrice);
  const uniquePrices = new Set(nextPrices);

  if (uniquePrices.size > 1) return "inconsistentPrices";

  // All services agree on nextSize — check against customer size
  const serviceNextSize = nextSizes[0];
  if (serviceNextSize !== customerSize) return "customerSizeMismatch";

  return null;
}

const selectSizeSanityCustomers = createSelector(
  [sanitySelect.customers],
  (customers): SizeSanityCustomer[] => {
    const result: SizeSanityCustomer[] = [];

    for (const customer of customers) {
      const activePrograms = customer.programs.filter((p) => p.status === "9");
      const flaggedPrograms: FlaggedProgram[] = [];

      for (const program of activePrograms) {
        const reason = classifyProgram(program, customer.size);
        if (reason !== null) {
          flaggedPrograms.push({ program, reason });
        }
      }

      if (flaggedPrograms.length > 0) {
        result.push({ customer, flaggedPrograms });
      }
    }

    return result.sort(
      (a, b) =>
        b.flaggedPrograms.length - a.flaggedPrograms.length ||
        a.customer.displayName.localeCompare(b.customer.displayName),
    );
  },
);

const selectSizeSanityCustomerCount = createSelector(
  [selectSizeSanityCustomers],
  (customers) => customers.length,
);

export const sizeSanitySelect = {
  sizeSanityCustomers: selectSizeSanityCustomers,
  customerCount: selectSizeSanityCustomerCount,
};
