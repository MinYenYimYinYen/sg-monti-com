import UserModel from "@/app/auth/_models/UserModel";
import { CapabilityBundleModel } from "@/app/permission/capabilityBundle/CapabilityBundleModel";
import { UserCapabilitiesModel } from "@/app/permission/userCapabilities/UserCapabilitiesModel";
import { UserCapabilitiesDoc } from "@/app/permission/userCapabilities/UserCapabilitiesTypes";
import { Actor, loadActor } from "@/app/permission/_lib/capabilityLoaders";
import { assertText } from "@/app/permission/_lib/assertText";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import { canManageCapabilitiesOf } from "@/permission/logic/assignmentGuards";
import type { BundleGrants } from "@/permission/logic/permissionLogicTypes";

export function refusal(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

export type AssignmentContext = {
  actor: Actor;
  userName: string;
  /** The target's stored holdings, or an empty default when they have no document yet. */
  holdings: { bundleKeys: string[]; capabilities: UserCapabilitiesDoc["capabilities"] };
  bundles: BundleGrants[];
};

/**
 * Everything an assignment op needs before it changes anything: who is asking (confirmed against
 * the database), that the target is a real user the actor may manage, and the target's current
 * holdings and the bundles. Throws an operational error when the request must be refused.
 */
export async function loadAssignmentContext({
  userName: rawUserName,
}: {
  userName: unknown;
}): Promise<AssignmentContext> {
  const userName = assertText({ value: rawUserName, label: "User name" });
  await connectToMongoDB();

  const actor = await loadActor();
  const target = await UserModel.findOne({ userName }).select("userName isSuperUser isKiosk").lean();
  if (!target) throw refusal("User not found.");

  if (!canManageCapabilitiesOf({ target, actorIsSuperUser: actor.isSuperUser })) {
    throw new AppError({
      message: "Only a superuser can change the capabilities of a kiosk or superuser.",
      type: "AUTH_ERROR",
      statusCode: 403,
    });
  }

  const stored = await UserCapabilitiesModel.findOne({ userName: target.userName }).lean();
  const bundles = await CapabilityBundleModel.find().lean();
  return {
    actor,
    userName: target.userName,
    holdings: { bundleKeys: stored?.bundleKeys ?? [], capabilities: stored?.capabilities ?? [] },
    bundles,
  };
}

/** Writes the target's new holdings (creating the document on first assignment) and returns it. */
export async function saveHoldings({
  userName,
  bundleKeys,
  capabilities,
}: {
  userName: string;
  bundleKeys: string[];
  capabilities: UserCapabilitiesDoc["capabilities"];
}): Promise<UserCapabilitiesDoc> {
  const saved = await UserCapabilitiesModel.findOneAndUpdate(
    { userName },
    { $set: { userName, bundleKeys, capabilities } },
    { upsert: true, new: true },
  ).lean();
  return cleanMongoObject(saved!) as UserCapabilitiesDoc;
}
