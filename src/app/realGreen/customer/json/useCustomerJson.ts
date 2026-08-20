"use client";

import { useSelector } from "react-redux";
import { AppState, AppDispatch } from "@/store";
import { useAppDispatch } from "@/lib/hooks/redux";
import { CustomerContextMode } from "@/app/realGreen/customer/slices/customerSlices";
import { centralCustomerActions } from "@/app/realGreen/customer/slices/centralCustomerSlice";
import { CustomerDoc } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ProgramDoc } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomerSnapshotEntry = {
  context: CustomerContextMode;
  customerDocs: CustomerDoc[];
  programDocs: ProgramDoc[];
  serviceDocs: ServiceDoc[];
};

export type CustomerMultiSnapshot = {
  savedAt: string;
  season: number | null;
  entries: CustomerSnapshotEntry[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function selectSliceState(state: AppState, context: CustomerContextMode) {
  const sliceKey = context as keyof typeof state.customer;
  const slice = state.customer[sliceKey] as
    | { customerDocs: CustomerDoc[]; programDocs: ProgramDoc[]; serviceDocs: ServiceDoc[] }
    | undefined;
  return slice ?? { customerDocs: [], programDocs: [], serviceDocs: [] };
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function loadJsonFromFile(): Promise<CustomerMultiSnapshot> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        reject(new Error("No file selected"));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string) as CustomerMultiSnapshot;
          resolve(parsed);
        } catch {
          reject(new Error("Invalid JSON file"));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

function injectEntry(dispatch: AppDispatch, entry: CustomerSnapshotEntry) {
  if (entry.customerDocs.length > 0) {
    dispatch(
      centralCustomerActions.mergeData({
        stepName: "customers",
        data: { customerDocs: entry.customerDocs },
      }),
    );
  }
  if (entry.programDocs.length > 0) {
    dispatch(
      centralCustomerActions.mergeData({
        stepName: "programs",
        data: { programDocs: entry.programDocs },
      }),
    );
  }
  if (entry.serviceDocs.length > 0) {
    dispatch(
      centralCustomerActions.mergeData({
        stepName: "services",
        data: { serviceDocs: entry.serviceDocs },
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// Hook
//
// Accepts an array of contexts. Saves all of them into one file; on load,
// injects all entries found in the file into the central maps.
// Any module can call entries.find(e => e.context === "active") to get its data.
//
// IMPORTANT: Pass a stable (module-level) array reference for `contexts` to
// avoid creating new selector functions on every render.
// ---------------------------------------------------------------------------

export function useCustomerJson(contexts: CustomerContextMode[]) {
  const dispatch = useAppDispatch();
  const season = useSelector((state: AppState) => state.globalSettings.settings?.season ?? null);

  // Select each context's slice state individually to avoid creating a new
  // object reference on every render (which would cause the "Selector returned
  // a different result" warning from react-redux).
  const activeState = useSelector((state: AppState) =>
    contexts.includes("active") ? selectSliceState(state, "active") : null,
  );
  const multiSeasonState = useSelector((state: AppState) =>
    contexts.includes("multiSeasonProduction")
      ? selectSliceState(state, "multiSeasonProduction")
      : null,
  );
  const lastSeasonState = useSelector((state: AppState) =>
    contexts.includes("lastSeasonProduction")
      ? selectSliceState(state, "lastSeasonProduction")
      : null,
  );
  const recentProductionState = useSelector((state: AppState) =>
    contexts.includes("recentProduction")
      ? selectSliceState(state, "recentProduction")
      : null,
  );
  const printedState = useSelector((state: AppState) =>
    contexts.includes("printed") ? selectSliceState(state, "printed") : null,
  );
  const singleState = useSelector((state: AppState) =>
    contexts.includes("single") ? selectSliceState(state, "single") : null,
  );
  const byAssignmentState = useSelector((state: AppState) =>
    contexts.includes("byAssignment") ? selectSliceState(state, "byAssignment") : null,
  );
  const priorityServiceState = useSelector((state: AppState) =>
    contexts.includes("priorityService")
      ? selectSliceState(state, "priorityService")
      : null,
  );

  // Build a lookup map from the individual selectors
  const stateByContext: Partial<Record<CustomerContextMode, ReturnType<typeof selectSliceState>>> =
    {
      active: activeState ?? undefined,
      multiSeasonProduction: multiSeasonState ?? undefined,
      lastSeasonProduction: lastSeasonState ?? undefined,
      recentProduction: recentProductionState ?? undefined,
      printed: printedState ?? undefined,
      single: singleState ?? undefined,
      byAssignment: byAssignmentState ?? undefined,
      priorityService: priorityServiceState ?? undefined,
    };

  const getState = (context: CustomerContextMode) =>
    stateByContext[context] ?? { customerDocs: [], programDocs: [], serviceDocs: [] };

  const save = () => {
    const entries: CustomerSnapshotEntry[] = contexts.map((context) => ({
      context,
      customerDocs: getState(context).customerDocs,
      programDocs: getState(context).programDocs,
      serviceDocs: getState(context).serviceDocs,
    }));

    const snapshot: CustomerMultiSnapshot = {
      savedAt: new Date().toISOString(),
      season,
      entries,
    };

    const filename = `customer_${contexts.join("_")}_${season ?? "unknown"}.json`;
    downloadJson(snapshot, filename);
  };

  const load = async () => {
    try {
      const snapshot = await loadJsonFromFile();
      for (const entry of snapshot.entries) {
        injectEntry(dispatch, entry);
      }
    } catch {
      // User cancelled or file was invalid — silently ignore
    }
  };

  const hasData = contexts.some((context) => getState(context).customerDocs.length > 0);

  const totalCounts = contexts.reduce(
    (acc, context) => ({
      customers: acc.customers + getState(context).customerDocs.length,
      programs: acc.programs + getState(context).programDocs.length,
      services: acc.services + getState(context).serviceDocs.length,
    }),
    { customers: 0, programs: 0, services: 0 },
  );

  const recordCountsByContext = Object.fromEntries(
    contexts.map((context) => [
      context,
      {
        customers: getState(context).customerDocs.length,
        programs: getState(context).programDocs.length,
        services: getState(context).serviceDocs.length,
      },
    ]),
  ) as Record<CustomerContextMode, { customers: number; programs: number; services: number }>;

  return { save, load, hasData, recordCountsByContext, totalCounts };
}
