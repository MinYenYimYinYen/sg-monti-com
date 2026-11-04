import { AppError } from "@/lib/errors/AppError";
import { delay } from "@/lib/async/delay";
import { QboConnectionModel } from "@/app/qbo/connection/models/QboConnectionModel";
import { loadConnectionDoc } from "@/app/qbo/connection/_lib/qboConnectionServer";
import {
  QboConnectionDoc,
  QboEnvironment,
} from "@/app/qbo/connection/types/QboConnectionTypes";
import { getEncryptionKey, getQboConfig } from "@/app/qbo/_lib/auth/qboConfig";
import { decryptSecret, encryptSecret } from "@/app/qbo/_lib/auth/qboCrypto";
import { refreshAccessToken } from "@/app/qbo/_lib/auth/qboOAuthServer";
import { addMsToIso } from "@/app/qbo/_lib/auth/qboOAuthUtils";
import { QboConfig } from "@/app/qbo/_lib/auth/qboOAuthTypes";
import { evaluateTokenAccess, TokenAccessFailure } from "@/app/qbo/_lib/auth/qboTokenUtils";
import { qboConst } from "@/app/qbo/_lib/qboConst";

// Server only. Hands out a usable access token and keeps the stored pair current.
//
// Refresh tokens rotate and the app runs on serverless, so two requests can notice an
// expired access token at the same moment. Exactly one may refresh: it claims a short lock
// with a conditional update on `version`, and the others poll until the winner's tokens are
// stored. If the lock holder dies, the lock lapses by itself after refreshLockMs.

export type QboAccess = {
  accessToken: string;
  realmId: string;
  /** The connection version these tokens came from. Pass it back as `rejectedVersion` after a 401. */
  version: number;
  environment: QboEnvironment;
};

const RECONNECT_MESSAGE =
  "QuickBooks needs to be reconnected. An admin can do this on the QuickBooks Connection page.";

function connectionError({ message, statusCode }: { message: string; statusCode: number }) {
  return new AppError({ message, type: "EXTERNAL_ERROR", statusCode, isOperational: true });
}

function failureError(reason: TokenAccessFailure): AppError {
  if (reason === "environmentMismatch") {
    return connectionError({
      message:
        "The stored QuickBooks connection was made for a different environment than this server is configured for. Reconnect on the QuickBooks Connection page.",
      statusCode: 409,
    });
  }
  return connectionError({ message: RECONNECT_MESSAGE, statusCode: 409 });
}

/** Writes are conditional on `version`, so a reconnect that happened meanwhile is never overwritten. */
async function markReconnectRequired(doc: QboConnectionDoc): Promise<void> {
  await QboConnectionModel.findOneAndUpdate(
    { realmId: doc.realmId, version: doc.version },
    {
      $set: {
        status: "reconnectRequired",
        accessTokenEnc: "",
        refreshTokenEnc: "",
        refreshLockUntil: "",
      },
      $inc: { version: 1 },
    },
  );
}

async function releaseLock(doc: QboConnectionDoc): Promise<void> {
  await QboConnectionModel.updateOne(
    { realmId: doc.realmId, version: doc.version },
    { $set: { refreshLockUntil: "" } },
  );
}

async function claimRefresh(doc: QboConnectionDoc): Promise<boolean> {
  const now = new Date();
  const claimed = await QboConnectionModel.findOneAndUpdate(
    {
      realmId: doc.realmId,
      version: doc.version,
      status: "connected",
      $or: [
        { refreshLockUntil: { $exists: false } },
        { refreshLockUntil: "" },
        { refreshLockUntil: { $lt: now.toISOString() } },
      ],
    },
    { $set: { refreshLockUntil: addMsToIso({ now, ms: qboConst.refreshLockMs }) } },
  ).lean();
  return claimed !== null;
}

function decryptOrFail(payload: string): string {
  try {
    return decryptSecret({ payload, key: getEncryptionKey() });
  } catch {
    // The underlying error is deliberately dropped: it could carry decrypted material.
    throw connectionError({
      message:
        "The stored QuickBooks tokens could not be decrypted. Check that QBO_TOKEN_ENCRYPTION_KEY matches the key used when the connection was made.",
      statusCode: 500,
    });
  }
}

async function performRefresh({
  doc,
  config,
}: {
  doc: QboConnectionDoc;
  config: QboConfig;
}): Promise<QboAccess> {
  const refreshToken = decryptOrFail(doc.refreshTokenEnc);
  const outcome = await refreshAccessToken({ refreshToken, config });

  if (outcome.outcome === "refreshed") {
    const key = getEncryptionKey();
    const { tokens } = outcome;
    const stored = await QboConnectionModel.findOneAndUpdate(
      { realmId: doc.realmId, version: doc.version },
      {
        $set: {
          accessTokenEnc: encryptSecret({ plaintext: tokens.accessToken, key }),
          refreshTokenEnc: encryptSecret({ plaintext: tokens.refreshToken, key }),
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
          refreshLockUntil: "",
        },
        $inc: { version: 1 },
      },
    ).lean();
    if (!stored) {
      // The connection changed while we were refreshing (a disconnect or a reconnect). The
      // current record is authoritative, so these tokens are dropped.
      throw connectionError({
        message: "The QuickBooks connection changed during a token refresh. Try again.",
        statusCode: 409,
      });
    }
    return {
      accessToken: tokens.accessToken,
      realmId: doc.realmId,
      version: doc.version + 1,
      environment: doc.environment,
    };
  }

  if (outcome.outcome === "revoked") {
    // Final. Only a reconnect fixes a revoked or already-rotated refresh token.
    await markReconnectRequired(doc);
    throw failureError("reconnectRequired");
  }

  await releaseLock(doc);
  if (outcome.outcome === "transient") {
    throw connectionError({
      message: "QuickBooks could not be reached to renew access. Try again in a moment.",
      statusCode: 503,
    });
  }
  throw connectionError({
    message: `Intuit declined to renew QuickBooks access (HTTP ${outcome.status}, reference ${outcome.intuitTid ?? "none"}).`,
    statusCode: 502,
  });
}

/**
 * Returns a valid access token, refreshing first when the stored one is close to expiry.
 * After a 401 pass `rejectedVersion`: a refresh is forced only if nobody has refreshed since
 * that version, otherwise the newer tokens are simply used.
 */
export async function getQboAccess({
  rejectedVersion,
}: { rejectedVersion?: number } = {}): Promise<QboAccess> {
  const config = getQboConfig();
  const deadline = Date.now() + qboConst.refreshWaitMaxMs;

  for (;;) {
    const doc = await loadConnectionDoc();
    if (!doc) throw failureError("reconnectRequired");

    const decision = evaluateTokenAccess({
      doc,
      now: new Date(),
      configuredEnvironment: config.environment,
      mustRefresh: rejectedVersion !== undefined && doc.version === rejectedVersion,
    });

    if (decision.action === "use") {
      return {
        accessToken: decryptOrFail(doc.accessTokenEnc),
        realmId: doc.realmId,
        version: doc.version,
        environment: doc.environment,
      };
    }

    if (decision.action === "fail") {
      if (decision.reason === "refreshTokenExpired") await markReconnectRequired(doc);
      throw failureError(decision.reason);
    }

    if (await claimRefresh(doc)) return performRefresh({ doc, config });

    if (Date.now() >= deadline) {
      throw connectionError({
        message: "Another request is renewing QuickBooks access. Try again in a moment.",
        statusCode: 503,
      });
    }
    await delay(qboConst.refreshWaitPollMs);
  }
}