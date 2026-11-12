import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import type { Capability } from "@/permission/PermissionTypes";

/**
 * What a user holds, in its own collection apart from the credentials document. `bundleKeys` are
 * references to capability bundles; `capabilities` are the user's own direct grants. Neither is
 * the resolved list: that is the union of both, computed by resolveEffective. A user with no
 * document has no capabilities (an "applied" user). Keyed by `userName`.
 */
export type UserCapabilitiesDoc = CreatedUpdated & {
  userName: string;
  bundleKeys: string[];
  capabilities: Capability[];
};
