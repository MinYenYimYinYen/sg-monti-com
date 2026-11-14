import { buildRegistry } from "@/permission/buildRegistry";
import { permissionGroups } from "@/permission/groups";

// The registry of every capability the app can grant, read from the permission tree in
// src/permission/groups. Only the admin UI, the capability loaders and tests import this file. A
// handler or component imports `can` from "@/permission/can" instead.
export const capabilityRegistry = buildRegistry(permissionGroups);
