import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Manager notes on a route day: one for a single employee on a date, or one for the whole day
// (the crew lead summary). They print on cover sheets and are copied into the crew lead summary.
//
// routeNotes.read   -> routeNotes getByDateRange
// routeNotes.write  -> routeNotes upsert
// routeNotes.delete -> routeNotes deleteOne
//
// All three routes were admin and office. Delete stays its own verb because a deleted note cannot
// be brought back from this app, and an office user who may add a note should not have to be
// allowed to remove everyone else's.
export const routeNoteCapabilities = createFeatureCapabilities({
  key: "routeNotes",
  resources: {
    routeNotes: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
