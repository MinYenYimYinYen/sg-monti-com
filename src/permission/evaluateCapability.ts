import type { User } from "@/app/auth/_types/User";
import {
  Capability,
  CapabilityRequirement,
  hasCapability,
} from "@/permission/PermissionTypes";

export type CapabilityDecision = "allowed" | "unauthenticated" | "forbidden";

/** Database reads, injected so the decision logic needs no database and can be tested. */
export type CapabilityLoaders = {
  confirmSuperUser: (userName: string) => Promise<boolean>;
  loadCapabilities: (userName: string) => Promise<readonly Capability[]>;
};

/**
 * The server-side capability decision. Reads from the database only when needed: a public op
 * reads nothing, the token's superuser hint triggers one confirmation read, and a confirmed
 * superuser skips loading capabilities.
 */
export async function evaluateCapability({
  required,
  identity,
  loaders,
}: {
  required: CapabilityRequirement;
  identity: Pick<User, "userName" | "isSuperUser"> | null;
  loaders: CapabilityLoaders;
}): Promise<CapabilityDecision> {
  if (required === "public") return "allowed";
  if (!identity) return "unauthenticated";

  const isSuperUserConfirmed = identity.isSuperUser
    ? await loaders.confirmSuperUser(identity.userName)
    : false;

  // A superuser-only op never looks at capabilities, so skip the read.
  const needsCapabilities = !isSuperUserConfirmed && required !== "superUser";
  const capabilities = needsCapabilities ? await loaders.loadCapabilities(identity.userName) : [];

  return hasCapability({ required, identity, isSuperUserConfirmed, capabilities }) ? "allowed" : "forbidden";
}
