import { buildCan } from "@/permission/defineGroup";
import { permissionGroups } from "@/permission/groups";

// The typed capability constants, derived from the permission tree. A handler says which
// capability an op needs (`capability: can.customers.read`), and a component gates on the same
// constant. Renaming or removing a resource in the tree breaks every use at compile time.
export const can = buildCan(permissionGroups);
