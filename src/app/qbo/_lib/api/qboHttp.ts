import { AppError } from "@/lib/errors/AppError";
import { delay } from "@/lib/async/delay";
import { getQboAccess } from "@/app/qbo/_lib/auth/qboTokenServer";
import { buildQboUrl, describeFault, readFault } from "@/app/qbo/_lib/api/qboHttpUtils";
import { qboConst } from "@/app/qbo/_lib/qboConst";

export type QboRequest = {
  path: string;
  method: "GET" | "POST";
  body?: unknown;
  pathTemplate: string;
};

/**
 * The single fetch chokepoint for the QuickBooks accounting API, like rgHttp for RealGreen.
 *
 * Retry policy (never a loop): one token refresh after a 401, bounded backoff on 429, and a
 * bounded retry of network failures for GET only. A POST that dies after being sent has an
 * unknown outcome, so it is never resent here.
 *
 * Failures are always EXTERNAL_ERROR (or NETWORK_ERROR), never AUTH_ERROR: an AUTH_ERROR
 * would make the browser think the user's own session expired.
 */
export async function qboHttp<T>({ path, method, body, pathTemplate }: QboRequest): Promise<T> {
  let access = await getQboAccess();
  let refreshedAfter401 = false;
  let rateLimitRetries = 0;
  let networkRetries = 0;

  for (;;) {
    const url = buildQboUrl({
      baseUrl: qboConst.apiBaseUrl[access.environment],
      realmId: access.realmId,
      path,
      minorVersion: qboConst.minorVersion,
    });

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${access.accessToken}`,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(qboConst.requestTimeoutMs),
      });
    } catch {
      const waitMs = method === "GET" ? qboConst.networkRetryDelaysMs[networkRetries] : undefined;
      if (waitMs === undefined) {
        throw new AppError({
          message: "Failed to connect to QuickBooks",
          type: "NETWORK_ERROR",
          statusCode: 0,
          isOperational: true,
          data: { pathTemplate },
        });
      }
      networkRetries += 1;
      await delay(waitMs);
      continue;
    }

    const intuitTid = res.headers.get("intuit_tid");

    if (res.status === 401 && !refreshedAfter401) {
      refreshedAfter401 = true;
      access = await getQboAccess({ rejectedVersion: access.version });
      continue;
    }

    if (res.status === 429) {
      const waitMs = qboConst.rateLimitRetryDelaysMs[rateLimitRetries];
      if (waitMs !== undefined) {
        rateLimitRetries += 1;
        await delay(waitMs);
        continue;
      }
    }

    const json: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const fault = readFault(json);
      const detail = fault ? describeFault(fault) : null;
      throw new AppError({
        message: `QuickBooks error${detail ? `: ${detail}` : ` (HTTP ${res.status})`} (reference ${intuitTid ?? "none"}).`,
        type: "EXTERNAL_ERROR",
        statusCode: res.status,
        isOperational: true,
        // The request body is left out on purpose: it can hold real vendor and financial data.
        data: { pathTemplate, intuitTid, faultType: fault?.type ?? null, errors: fault?.errors ?? [] },
      });
    }

    return json as T;
  }
}
