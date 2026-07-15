import { createSelector } from "@reduxjs/toolkit";
import { centralSelect } from "@/app/realGreen/customer/selectors/centralSelectors";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";

export type TliMismatch = {
  customer: Customer;
  /** This year's active TLI program */
  tli26: Program;
  /** Last season's LIP program with at least one completed service */
  lip25: Program;
};

const selectTliMismatches = createSelector(
  [centralSelect.customers],
  (customers): TliMismatch[] => {
    const results: TliMismatch[] = [];

    for (const customer of customers) {
      // Last season's LIP program with at least one completed service
      const lip25 = customer.programs.find(
        (prog) =>
          prog.progCode.progCodeId === "LIP" &&
          prog.services.some((serv) => serv.status === "S"),
      );
      if (!lip25) continue;

      // This year's active TLI program
      const tli26 = customer.programs.find(
        (prog) => prog.progCode.progCodeId === "TLI",
      );
      if (!tli26) continue;

      // Compare soldBy arrays (sorted for order-independence)
      const lipSoldBy = [...lip25.soldBy].sort();
      const tliSoldBy = [...tli26.soldBy].sort();
      const isMismatch =
        JSON.stringify(lipSoldBy) !== JSON.stringify(tliSoldBy);

      const tliNotFixedYet = tli26.soldBy[0] !== "LH";
      if (isMismatch && tliNotFixedYet) {
        results.push({ customer, tli26, lip25 });
      }
    }

    return results;
  },
);

export const tliSelect = {
  mismatches: selectTliMismatches,
};
