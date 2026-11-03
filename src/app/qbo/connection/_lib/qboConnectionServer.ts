import { randomBytes } from "crypto";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { QboConnectionModel } from "@/app/qbo/connection/models/QboConnectionModel";
import { QboOAuthStateModel } from "@/app/qbo/connection/models/QboOAuthStateModel";
import {
  QboConnectionDoc,
  QboConnectionStatus,
  QboDisconnectResult,
} from "@/app/qbo/connection/types/QboConnectionTypes";
import { getEncryptionKey, getQboConfig } from "@/app/qbo/_lib/auth/qboConfig";
import { decryptSecret } from "@/app/qbo/_lib/auth/qboCrypto";
import { revokeToken } from "@/app/qbo/_lib/auth/qboOAuthServer";
import {
  OAUTH_STATE_TTL_MS,
  addMsToIso,
  buildAuthorizeUrl,
  buildConnectionStatus,
  parseQboEnvironment,
} from "@/app/qbo/_lib/auth/qboOAuthUtils";

// Server only. There is exactly one connection document (one company), so these read it
// with findOne() rather than by key.

function describeConfigProblem(): string | null {
  try {
    getQboConfig();
    getEncryptionKey();
    return null;
  } catch (e) {
    return e instanceof AppError ? e.message : "QuickBooks configuration could not be read.";
  }
}

export async function loadConnectionDoc(): Promise<QboConnectionDoc | null> {
  await connectToMongoDB();
  const doc = await QboConnectionModel.findOne().lean();
  return doc ? (cleanMongoObject(doc) as QboConnectionDoc) : null;
}

export async function getConnectionStatus(): Promise<QboConnectionStatus> {
  const doc = await loadConnectionDoc();
  return buildConnectionStatus({
    doc,
    configuredEnvironment: parseQboEnvironment(process.env.QBO_ENVIRONMENT),
    configProblem: describeConfigProblem(),
  });
}

/**
 * Records a one-time state for the signed-in admin and returns the Intuit consent URL. The
 * userName is stored with the state because the callback cannot see the login cookies.
 */
export async function startConnect({ userName }: { userName: string }): Promise<string> {
  const config = getQboConfig();
  // Fail now rather than after the user has already approved the app at Intuit.
  getEncryptionKey();

  await connectToMongoDB();
  const now = new Date();
  // Housekeeping: abandoned attempts are swept here instead of by a TTL index.
  await QboOAuthStateModel.deleteMany({ expiresAt: { $lt: now.toISOString() } });

  const state = randomBytes(32).toString("base64url");
  await QboOAuthStateModel.create({
    state,
    userName,
    expiresAt: addMsToIso({ now, ms: OAUTH_STATE_TTL_MS }),
  });

  return buildAuthorizeUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
  });
}

/**
 * Revokes the grant at Intuit (best effort), then deletes the stored tokens. The local
 * delete always happens, so a failed revocation never leaves usable tokens behind.
 */
export async function disconnectConnection(): Promise<QboDisconnectResult> {
  const doc = await loadConnectionDoc();
  const configuredEnvironment = parseQboEnvironment(process.env.QBO_ENVIRONMENT);
  const emptyStatus = buildConnectionStatus({
    doc: null,
    configuredEnvironment,
    configProblem: describeConfigProblem(),
  });
  if (!doc) return { revocationConfirmed: true, status: emptyStatus };

  let revocationConfirmed: boolean;
  if (doc.status === "reconnectRequired" || !doc.refreshTokenEnc) {
    // Intuit already ended the grant, so there is nothing left to revoke.
    revocationConfirmed = true;
  } else {
    try {
      const refreshToken = decryptSecret({
        payload: doc.refreshTokenEnc,
        key: getEncryptionKey(),
      });
      revocationConfirmed = await revokeToken({ token: refreshToken, config: getQboConfig() });
    } catch {
      // Config or key problems end up here. The error is deliberately not logged: it could
      // contain decrypted material.
      revocationConfirmed = false;
    }
  }

  await QboConnectionModel.deleteOne({ realmId: doc.realmId });
  return { revocationConfirmed, status: emptyStatus };
}
