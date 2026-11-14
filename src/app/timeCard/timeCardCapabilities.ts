import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Time cards: the punches imported from the RealGreen time card CSV, and the payroll screen that
// totals them.
//
// punches.read  -> timeCard getPunches, getLastImportedDate (was admin, office and tech)
// punches.write -> timeCard importPunches (was admin and office)
//
// There is no delete: a punch is only replaced by importing it again. importPunches upserts each
// punch by `punchId` and replaces its segments, so a re-import overwrites an earlier correction.
// That is the normal way to fix a punch, so it stays under `write`.
export const timeCardCapabilities = createFeatureCapabilities({
  key: "timeCard",
  resources: {
    punches: { shape: "collection", verbs: ["read", "write"] },
  },
});
