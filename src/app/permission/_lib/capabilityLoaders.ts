import { cookies } from "next/headers";
import UserModel from "@/app/auth/_models/UserModel";
import { verifyAccessToken } from "@/app/auth/_lib/tokenUtils";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";
import { CapabilityBundleModel } from "@/app/permission/capabilityBundle/CapabilityBundleModel";
import { UserCapabilitiesModel } from "@/app/permission/userCapabilities/UserCapabilitiesModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { Capability, isSuperUserEffective } from "@/permission/PermissionTypes";
import type { CapabilityLoaders } from "@/permission/evaluateCapability";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { resolveEffective } from "@/permission/logic/resolveEffective";

// Server-only database reads behind the capability check. The decision logic lives in
// evaluateCapability and resolveEffective (pure, tested); this file only fetches.

/** The superuser flag on the document decides, never the token claim. A kiosk is refused. */
export async function confirmSuperUser(userName: string): Promise<boolean> {
  await connectToMongoDB();
  const user = await UserModel.findOne({ userName }).select("isSuperUser isKiosk").lean();
  return !!user && isSuperUserEffective(user);
}

/** The user's bundles plus direct grants, resolved to one flat list. No document means none. */
export async function loadEffectiveCapabilities(userName: string): Promise<Capability[]> {
  await connectToMongoDB();
  const userDoc = await UserCapabilitiesModel.findOne({ userName }).lean();
  if (!userDoc) return [];

  const bundles = userDoc.bundleKeys.length
    ? await CapabilityBundleModel.find({ bundleKey: { $in: userDoc.bundleKeys } }).lean()
    : [];

  return resolveEffective({
    bundleKeys: userDoc.bundleKeys,
    directCapabilities: userDoc.capabilities,
    bundles,
    registry: capabilityRegistry,
  });
}

export const capabilityLoaders: CapabilityLoaders = {
  confirmSuperUser,
  loadCapabilities: loadEffectiveCapabilities,
};

export type Actor = {
  userName: string;
  /** Confirmed against the user document, not the token claim. */
  isSuperUser: boolean;
  /** Empty for a superuser, who bypasses the list. */
  capabilities: readonly Capability[];
};

/**
 * Who is calling, verified from the access cookie (never from identity headers), with superuser
 * status confirmed against the user document. For handlers that must know whether the caller is
 * a superuser but not what they hold.
 */
export async function loadVerifiedCaller(): Promise<Pick<Actor, "userName" | "isSuperUser">> {
  const token = (await cookies()).get(AUTH_CONST.COOKIE.ACCESS_TOKEN)?.value;
  if (!token) throw new AppError({ message: "Authentication required", type: "AUTH_ERROR", statusCode: 401 });

  const payload = verifyAccessToken(token);
  const isSuperUser = payload.isSuperUser ? await confirmSuperUser(payload.userName) : false;
  return { userName: payload.userName, isSuperUser };
}

/** The caller plus what they hold, for handlers that need more than a yes or no (assignment rules). */
export async function loadActor(): Promise<Actor> {
  const caller = await loadVerifiedCaller();
  const capabilities = caller.isSuperUser ? [] : await loadEffectiveCapabilities(caller.userName);
  return { ...caller, capabilities };
}
