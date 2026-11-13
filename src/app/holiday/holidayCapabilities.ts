import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Company-wide holidays and weather days. The pace, productivity and time off screens read them to
// skip those dates, but the days and their routes are owned here.
//
// holidays.read   -> holiday getAll
// holidays.write  -> holiday upsert
// holidays.delete -> holiday deleteOne
//
// deleteOne was admin only while upsert was admin and office, so delete stays its own verb and is
// not folded into write.
export const holidayCapabilities = createFeatureCapabilities({
  key: "holiday",
  resources: {
    holidays: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
