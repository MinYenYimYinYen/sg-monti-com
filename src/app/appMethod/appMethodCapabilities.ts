import { createFeatureCapabilities } from "@/permission/PermissionTypes";

// Application methods: how a product is applied (ground speed, pattern width, flow rate, coverage).
// Equipment, mix charts and the loadout screens read them, but the data and its routes are owned
// here.
//
// appMethods.read   -> appMethod getAll
// appMethods.write  -> appMethod upsert
// appMethods.delete -> appMethod deleteOne, checkDependencies
//
// deleteOne with clearReferences also removes the method from product equipment packages and from
// equipment, and putting the method back does not restore those references. checkDependencies sits
// under delete (not read) because only the delete sheet calls it, and it returns equipment records
// that belong to another feature.
export const appMethodCapabilities = createFeatureCapabilities({
  key: "appMethod",
  resources: {
    appMethods: { shape: "collection", verbs: ["read", "write", "delete"] },
  },
});
