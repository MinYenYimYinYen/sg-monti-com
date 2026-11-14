import { vi } from "vitest";
import type { CapabilityLoaders } from "@/permission/evaluateCapability";
import type { Capability } from "@/permission/PermissionTypes";

type MakeLoadersParams = {
  /** What the database says about the user's superuser flag. */
  isSuperUserConfirmed?: boolean;
  /** The user's stored capabilities. */
  capabilities?: readonly Capability[];
};

/**
 * Stand-ins for the two database reads, so a test can assert which reads happened. They
 * resolve to "not a superuser, no capabilities" unless told otherwise.
 */
export function makeLoaders({
  isSuperUserConfirmed = false,
  capabilities = [],
}: MakeLoadersParams = {}) {
  const confirmSuperUser = vi
    .fn<CapabilityLoaders["confirmSuperUser"]>()
    .mockResolvedValue(isSuperUserConfirmed);
  const loadCapabilities = vi
    .fn<CapabilityLoaders["loadCapabilities"]>()
    .mockResolvedValue(capabilities);
  return { confirmSuperUser, loadCapabilities };
}
