import type { Capability } from "@/permission/PermissionTypes";
import type { CapabilityRegistry } from "@/permission/buildRegistry";

// Structural types for the capability logic. The data modules' Doc types satisfy them, so this
// folder never imports from src/app and stays usable on the client and in tests.

/** A named list of capabilities that users reference by key. */
export type BundleGrants = {
  bundleKey: string;
  capabilities: readonly Capability[];
};

/**
 * What a user holds: bundle keys (references) plus direct grants. `capabilities` is the user's
 * own list, never the resolved one.
 */
export type UserGrants = {
  userName: string;
  bundleKeys: readonly string[];
  capabilities: readonly Capability[];
};

/** Just the unknown-string filter, so tests can pass a tiny stand-in. */
export type KnownCapabilities = Pick<CapabilityRegistry, "has">;

/** The filter plus what each capability needs, for the assignment-time requirement logic. */
export type RequirementRegistry = Pick<CapabilityRegistry, "has" | "requirementsOf">;

/** The filter plus the full list, for "what could still be added". */
export type GrantableCapabilities = Pick<CapabilityRegistry, "has" | "allCapabilities">;
