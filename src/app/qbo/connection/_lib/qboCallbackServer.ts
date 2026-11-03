import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { AppError } from "@/lib/errors/AppError";
import UserModel from "@/app/auth/_models/UserModel";
import { QboConnectionModel } from "@/app/qbo/connection/models/QboConnectionModel";
import { QboOAuthStateModel } from "@/app/qbo/connection/models/QboOAuthStateModel";
import {
  QboCallbackResult,
  QboConnectionDoc,
} from "@/app/qbo/connection/types/QboConnectionTypes";
import { getEncryptionKey, getQboConfig } from "@/app/qbo/_lib/auth/qboConfig";
import { encryptSecret } from "@/app/qbo/_lib/auth/qboCrypto";
import { exchangeCodeForTokens } from "@/app/qbo/_lib/auth/qboOAuthServer";
import { evaluateOAuthState, isValidRealmId } from "@/app/qbo/_lib/auth/qboOAuthUtils";

type CallbackParams = {
  code: string | null;
  realmId: string | null;
  state: string | null;
  error: string | null;
};

export function readCallbackParams(searchParams: URLSearchParams): CallbackParams {
  return {
    code: searchParams.get("code"),
    realmId: searchParams.get("realmId"),
    state: searchParams.get("state"),
    error: searchParams.get("error"),
  };
}

async function discardState(state: string | null): Promise<void> {
  if (state) await QboOAuthStateModel.deleteOne({ state });
}

/**
 * Completes the OAuth round trip. Intuit redirects the browser here from another site, so
 * no login cookie is available (they are SameSite=strict). Authority comes from the
 * one-time `state` created by an authenticated admin in startConnect: it is deleted on
 * first use, expires after about 10 minutes, and names the admin who started it. The admin
 * role is checked again here in case it was removed since.
 *
 * Returns a result for the redirect page. Never throws, and never logs tokens or the code.
 */
export async function handleOAuthCallback(params: CallbackParams): Promise<QboCallbackResult> {
  try {
    await connectToMongoDB();
    const { code, realmId, state, error } = params;

    if (error) {
      await discardState(state);
      return { result: "error", reason: "denied" };
    }
    if (!code || !realmId || !state) {
      await discardState(state);
      return { result: "error", reason: "missing_params" };
    }

    // findOneAndDelete is atomic, so a replayed callback finds nothing the second time.
    const stateDoc = await QboOAuthStateModel.findOneAndDelete({ state }).lean();
    const evaluation = evaluateOAuthState({ stateDoc, now: new Date() });
    if (!evaluation.ok) return { result: "error", reason: evaluation.reason };

    const user = await UserModel.findOne({ userName: evaluation.userName }).lean();
    if (!user || user.role !== "admin") {
      return { result: "error", reason: "invalid_state" };
    }
    if (!isValidRealmId(realmId)) {
      return { result: "error", reason: "missing_params" };
    }

    // Resolve config and key before spending the one-time code.
    const config = getQboConfig();
    const key = getEncryptionKey();

    const existing = await QboConnectionModel.findOne().lean();
    if (existing && existing.status === "connected" && existing.realmId !== realmId) {
      return { result: "error", reason: "other_company_connected" };
    }

    // An AppError here means Intuit refused or was unreachable. Anything else is a bug and
    // falls through to the outer catch as server_error.
    const tokens = await exchangeCodeForTokens({ code, config }).catch((e: unknown) => {
      if (e instanceof AppError) return null;
      throw e;
    });
    if (!tokens) return { result: "error", reason: "exchange_failed" };

    const now = new Date().toISOString();
    const connection: Omit<QboConnectionDoc, "createdAt" | "updatedAt" | "version"> = {
      realmId,
      environment: config.environment,
      status: "connected",
      accessTokenEnc: encryptSecret({ plaintext: tokens.accessToken, key }),
      refreshTokenEnc: encryptSecret({ plaintext: tokens.refreshToken, key }),
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      connectedByUserName: evaluation.userName,
      connectedAt: now,
    };

    // A stale reconnectRequired record for another company is replaced, not kept.
    if (existing && existing.realmId !== realmId) {
      await QboConnectionModel.deleteOne({ realmId: existing.realmId });
    }
    await QboConnectionModel.findOneAndUpdate(
      { realmId },
      { $set: connection, $inc: { version: 1 } },
      { upsert: true },
    );

    return { result: "connected" };
  } catch {
    // Deliberately not logged with detail: the failing step may have held tokens.
    console.error("[QBO] OAuth callback failed unexpectedly.");
    return { result: "error", reason: "server_error" };
  }
}
