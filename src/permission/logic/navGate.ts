import type { User } from "@/app/auth/_types/User";
import type { OpGate } from "@/lib/api/types/rpcUtils";
import { Capability, hasCapability } from "@/permission/PermissionTypes";

// Decides whether a nav entry or a screen is shown. It uses the same gate shape as an RPC op.
// This only hides a link: the server enforces access whatever the UI shows.

export type NavUser = Pick<User, "userName" | "isSuperUser">;

/** The signed-in user's resolved capabilities (userCapabilities.mine), once loaded. */
export type NavCapabilities = { capabilities: readonly Capability[]; isSuperUser: boolean };

export function isGateOpen({
  gate,
  user,
  mine,
}: {
  gate: OpGate;
  user: NavUser | null;
  mine: NavCapabilities | null;
}): boolean {
  // Until the capabilities load, nothing that needs one is shown.
  return hasCapability({
    required: gate.capability,
    identity: user,
    isSuperUserConfirmed: mine?.isSuperUser ?? false,
    capabilities: mine?.capabilities ?? [],
  });
}
