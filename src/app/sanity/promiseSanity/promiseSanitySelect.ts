import { createSelector } from "@reduxjs/toolkit";
import { sanitySelect } from "@/app/sanity/sanitySelect";
import { parsePromiseString } from "@/app/schedPromise/parsePromise";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Promise Sanity — two directions of parity checking:
//
// Tab 1 (Missing Notes): service.isPromised === true but no valid promise
//   notation (p[...] or p{...}) found in service, program, or customer techNote.
//
// Tab 2 (Orphaned Notes): a valid promise notation exists in a techNote but
//   not all services at that scope are marked isPromised.
//   - Customer note: any active service not isPromised → flag customer
//   - Program note: any service in that program not isPromised → flag program
//   - Service note: service.isPromised === false → flag service
//
// Only renewal-eligible services (status !== "N") are evaluated.
// ---------------------------------------------------------------------------

function hasValidPromiseNote(techNote: string): boolean {
  if (!techNote) return false;
  return (
    parsePromiseString({ techNote, entityType: "customer", entityId: 0 }).promise !== null
  );
}

// ---------------------------------------------------------------------------
// Tab 1 — Missing Notes
// ---------------------------------------------------------------------------

export type MissingNotesCustomer = {
  customer: Customer;
  services: Service[];
};

const selectMissingNotesCustomers = createSelector(
  [sanitySelect.customers],
  (customers): MissingNotesCustomer[] => {
    const result: MissingNotesCustomer[] = [];

    for (const customer of customers) {
      const activePrograms = customer.programs.filter((p) => p.status === "9");
      const missingServices: Service[] = [];

      for (const program of activePrograms) {
        const renewalServices = program.services.filter((s) => s.status !== "N");
        for (const service of renewalServices) {
          if (!service.isPromised) continue;
          // isPromised but no promise note at any level
          const hasNote =
            hasValidPromiseNote(service.techNote) ||
            hasValidPromiseNote(program.techNote) ||
            hasValidPromiseNote(customer.techNote);
          if (!hasNote) {
            missingServices.push(service);
          }
        }
      }

      if (missingServices.length > 0) {
        result.push({ customer, services: missingServices });
      }
    }

    return result.sort((a, b) =>
      a.customer.displayName.localeCompare(b.customer.displayName),
    );
  },
);

const selectMissingNotesCount = createSelector(
  [selectMissingNotesCustomers],
  (customers) => customers.reduce((sum, c) => sum + c.services.length, 0),
);

// ---------------------------------------------------------------------------
// Tab 2 — Orphaned Notes
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

      // Customer-level: promise note on customer but any service not isPromised
      if (hasValidPromiseNote(customer.techNote)) {
        const anyNotPromised = allRenewalServices.some((s) => !s.isPromised);
        if (anyNotPromised) {
          result.push({
            level: "customer",
            customer,
            noteText: customer.techNote,
          });
        }
      }

      for (const program of activePrograms) {
        const renewalServices = program.services.filter((s) => s.status !== "N");

        // Program-level: promise note on program but any service in program not isPromised
        if (hasValidPromiseNote(program.techNote)) {
          const anyNotPromised = renewalServices.some((s) => !s.isPromised);
          if (anyNotPromised) {
            result.push({
              level: "program",
              customer,
              program,
              noteText: program.techNote,
            });
          }
        }

        // Service-level: promise note on service but service not isPromised
        for (const service of renewalServices) {
          if (hasValidPromiseNote(service.techNote) && !service.isPromised) {
            result.push({
              level: "service",
              customer,
              program,
              service,
              noteText: service.techNote,
            });
          }
        }
      }
    }

    // Sort: customer level first, then program, then service; within each level by customer name
    const levelOrder: Record<OrphanedNoteLevel, number> = {
      customer: 0,
      program: 1,
      service: 2,
    };

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
// Tab 3 — Valid Cases
// ---------------------------------------------------------------------------

const selectValidCasesCustomers = createSelector(
  [sanitySelect.customers],
  (customers): MissingNotesCustomer[] => {
    const result: MissingNotesCustomer[] = [];

    for (const customer of customers) {
      const activePrograms = customer.programs.filter((p) => p.status === "9");
      const validServices: Service[] = [];

      for (const program of activePrograms) {
        const renewalServices = program.services.filter((s) => s.status !== "N");
        for (const service of renewalServices) {
          if (!service.isPromised) continue;
          // isPromised AND a valid promise note exists at some level
          const hasNote =
            hasValidPromiseNote(service.techNote) ||
            hasValidPromiseNote(program.techNote) ||
            hasValidPromiseNote(customer.techNote);
          if (hasNote) {
            validServices.push(service);
          }
        }
      }

      if (validServices.length > 0) {
        result.push({ customer, services: validServices });
      }
    }

    return result.sort((a, b) =>
      a.customer.displayName.localeCompare(b.customer.displayName),
    );
  },
);

const selectValidCasesCount = createSelector(
  [selectValidCasesCustomers],
  (customers) => customers.reduce((sum, c) => sum + c.services.length, 0),
);

export const promiseSanitySelect = {
  missingNotesCustomers: selectMissingNotesCustomers,
  missingNotesCount: selectMissingNotesCount,
  orphanedNotes: selectOrphanedNotes,
  orphanedNotesCount: selectOrphanedNotesCount,
  validCasesCustomers: selectValidCasesCustomers,
  validCasesCount: selectValidCasesCount,
};
