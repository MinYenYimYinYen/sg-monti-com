import { createSelector } from "@reduxjs/toolkit";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { parsePromiseString } from "@/app/schedPromise/parsePromise";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Promise Sanity — four tabs:
//
// Tab 1 (Orphaned Notes): a p[...] or p{...} pattern exists in a techNote but
//   not all services at that scope are marked isPromised.
//
// Tab 2 (Invalid Promise Note): service.isPromised === true but no p[...] or
//   p{...} pattern found in service, program, or customer techNote.
//
// Tab 3 (Invalid Values): service.isPromised === true, a p[...] pattern exists,
//   but the parser returned issues on strict fields (date, time, days).
//
// Tab 4 (Valid Promises): see validPromisesSelect.ts
//
// Only renewal-eligible services (status !== "N") are evaluated.
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

// ---------------------------------------------------------------------------
// Tab 1 — Orphaned Notes
// ---------------------------------------------------------------------------

export type OrphanedNoteLevel = "customer" | "program" | "service";

export type OrphanedNote = {
  level: OrphanedNoteLevel;
  customer: Customer;
  program?: Program;
  service?: Service;
  noteText: string;
};

const selectOrphanedNotes = createSelector(
  [sanitySelect.customers],
  (customers): OrphanedNote[] => {
    const result: OrphanedNote[] = [];

    for (const customer of customers) {
      const activePrograms = customer.programs.filter((p) => p.status === "9");
      const allRenewalServices = activePrograms.flatMap((p) =>
        p.services.filter((s) => s.status !== "N"),
      );

      // Customer-level: promise note on customer but any renewal service not isPromised
      if (hasPromisePattern(customer.techNote)) {
        const anyNotPromised = allRenewalServices.some((s) => !s.isPromised);
        if (anyNotPromised) {
          result.push({ level: "customer", customer, noteText: customer.techNote });
        }
      }

      for (const program of activePrograms) {
        const renewalServices = program.services.filter((s) => s.status !== "N");

        // Program-level: promise note on program but any service in program not isPromised
        if (hasPromisePattern(program.techNote)) {
          const anyNotPromised = renewalServices.some((s) => !s.isPromised);
          if (anyNotPromised) {
            result.push({ level: "program", customer, program, noteText: program.techNote });
          }
        }

        // Service-level: promise note on service but service not isPromised
        for (const service of renewalServices) {
          if (hasPromisePattern(service.techNote) && !service.isPromised) {
            result.push({ level: "service", customer, program, service, noteText: service.techNote });
          }
        }
      }
    }

    const levelOrder: Record<OrphanedNoteLevel, number> = { customer: 0, program: 1, service: 2 };
    return result.sort(
      (a, b) =>
        levelOrder[a.level] - levelOrder[b.level] ||
        a.customer.displayName.localeCompare(b.customer.displayName),
    );
  },
);

const selectOrphanedNotesCount = createSelector(
  [selectOrphanedNotes],
  (notes) => notes.length,
);

// ---------------------------------------------------------------------------
// Tab 2 — Invalid Promise Note
// (isPromised === true but no p[...] pattern found at any level)
// ---------------------------------------------------------------------------

export type InvalidPromiseNoteCustomer = {
  customer: Customer;
  services: Service[];
};

const selectInvalidPromiseNoteCustomers = createSelector(
  [sanitySelect.customers],
  (customers): InvalidPromiseNoteCustomer[] => {
    const result: InvalidPromiseNoteCustomer[] = [];

    for (const customer of customers) {
      const activePrograms = customer.programs.filter((p) => p.status === "9");
      const invalidServices: Service[] = [];

      for (const program of activePrograms) {
        const renewalServices = program.services.filter((s) => s.status !== "N");
        for (const service of renewalServices) {
          if (!service.isPromised) continue;
          const note = effectivePromiseNote(service.techNote, program.techNote, customer.techNote);
          if (!note) {
            invalidServices.push(service);
          }
        }
      }

      if (invalidServices.length > 0) {
        result.push({ customer, services: invalidServices });
      }
    }

    return result.sort((a, b) =>
      a.customer.displayName.localeCompare(b.customer.displayName),
    );
  },
);

const selectInvalidPromiseNoteCount = createSelector(
  [selectInvalidPromiseNoteCustomers],
  (customers) => customers.reduce((sum, c) => sum + c.services.length, 0),
);

// ---------------------------------------------------------------------------
// Tab 3 — Invalid Values
// (isPromised === true, p[...] found, but strict fields have parse issues)
// ---------------------------------------------------------------------------

export type InvalidValuesService = {
  service: Service;
  program: Program;
  noteText: string;
  issues: string[];
};

export type InvalidValuesCustomer = {
  customer: Customer;
  invalidServices: InvalidValuesService[];
};

const selectInvalidValuesCustomers = createSelector(
  [sanitySelect.customers],
  (customers): InvalidValuesCustomer[] => {
    const result: InvalidValuesCustomer[] = [];

    for (const customer of customers) {
      const activePrograms = customer.programs.filter((p) => p.status === "9");
      const invalidServices: InvalidValuesService[] = [];

      for (const program of activePrograms) {
        const renewalServices = program.services.filter((s) => s.status !== "N");
        for (const service of renewalServices) {
          if (!service.isPromised) continue;
          const note = effectivePromiseNote(service.techNote, program.techNote, customer.techNote);
          if (!note) continue; // No pattern — handled by Tab 2

          const { issues } = parsePromiseString({ techNote: note });
          if (issues.length > 0) {
            invalidServices.push({ service, program, noteText: note, issues });
          }
        }
      }

      if (invalidServices.length > 0) {
        result.push({ customer, invalidServices });
      }
    }

    return result.sort((a, b) =>
      a.customer.displayName.localeCompare(b.customer.displayName),
    );
  },
);

const selectInvalidValuesCount = createSelector(
  [selectInvalidValuesCustomers],
  (customers) => customers.reduce((sum, c) => sum + c.invalidServices.length, 0),
);

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const promiseSanitySelect = {
  orphanedNotes: selectOrphanedNotes,
  orphanedNotesCount: selectOrphanedNotesCount,
  invalidPromiseNoteCustomers: selectInvalidPromiseNoteCustomers,
  invalidPromiseNoteCount: selectInvalidPromiseNoteCount,
  invalidValuesCustomers: selectInvalidValuesCustomers,
  invalidValuesCount: selectInvalidValuesCount,
};
