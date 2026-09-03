import { createSelector } from "@reduxjs/toolkit";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { parsePromiseString, stringifyPromise } from "@/app/schedPromise/parsePromise";
import { SchedPromise } from "@/app/schedPromise/SchedPromiseTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Valid Promises — Tab 4
//
// Finds all isPromised services that have a valid p[...] or p{...} note with
// zero parse issues, then groups them by the normalized (stringified) promise.
//
// Algorithm:
//   1. Prefilter to isPromised renewal services (small set — avoids full traversal)
//   2. For each, find the effective promise note (service → program → customer)
//   3. Parse it — skip if no pattern or if issues exist
//   4. Stringify the parsed promise → normalized key
//   5. Group by key into ValidPromiseGroup[]
//
// Sorted by count descending (most common promise first).
// ---------------------------------------------------------------------------

/** Returns true if the tech note contains a p[...] or p{...} pattern. */
function hasPromisePattern(techNote: string): boolean {
  if (!techNote) return false;
  return /p[\[{][^\]}]*[\]}]/.test(techNote);
}

/** Returns the first tech note in the hierarchy that contains a promise pattern. */
function effectivePromiseNote(
  serviceTechNote: string,
  programTechNote: string,
  customerTechNote: string,
): string | null {
  if (hasPromisePattern(serviceTechNote)) return serviceTechNote;
  if (hasPromisePattern(programTechNote)) return programTechNote;
  if (hasPromisePattern(customerTechNote)) return customerTechNote;
  return null;
}

export type ValidPromiseEntry = {
  customer: Customer;
  program: Program;
  service: Service;
};

export type ValidPromiseGroup = {
  /** Normalized promise string — used as the accordion trigger label. */
  normalizedNote: string;
  /** The parsed promise object — available for downstream logic. */
  promise: SchedPromise;
  entries: ValidPromiseEntry[];
  count: number;
};

const selectValidPromiseGroups = createSelector(
  [sanitySelect.customers],
  (customers): ValidPromiseGroup[] => {
    const groupMap = new Map<string, ValidPromiseGroup>();

    for (const customer of customers) {
      const activePrograms = customer.programs.filter((p) => p.status === "9");

      for (const program of activePrograms) {
        // Prefilter to isPromised renewal services only
        const promisedServices = program.services.filter(
          (s) => s.status !== "N" && s.isPromised,
        );

        for (const service of promisedServices) {
          const note = effectivePromiseNote(
            service.techNote,
            program.techNote,
            customer.techNote,
          );
          if (!note) continue; // No pattern — handled by Tab 2

          const { promise, issues } = parsePromiseString({ techNote: note });
          if (!promise || issues.length > 0) continue; // Parse issues — handled by Tab 3

          const normalizedNote = stringifyPromise(promise);

          const existing = groupMap.get(normalizedNote);
          if (existing) {
            existing.entries.push({ customer, program, service });
            existing.count++;
          } else {
            groupMap.set(normalizedNote, {
              normalizedNote,
              promise,
              entries: [{ customer, program, service }],
              count: 1,
            });
          }
        }
      }
    }

    return Array.from(groupMap.values()).sort(
      (a, b) => b.count - a.count || a.normalizedNote.localeCompare(b.normalizedNote),
    );
  },
);

const selectValidPromisesCount = createSelector(
  [selectValidPromiseGroups],
  (groups) => groups.reduce((sum, g) => sum + g.count, 0),
);

export const validPromisesSelect = {
  groups: selectValidPromiseGroups,
  count: selectValidPromisesCount,
};
