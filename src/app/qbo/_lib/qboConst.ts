import { QboEnvironment } from "@/app/qbo/connection/types/QboConnectionTypes";

export const qboConst = {
  // Pinned so Intuit's response shapes cannot change under us. Taken from the reference page
  // the types were written against. Not yet confirmed as the version we want to stay on.
  minorVersion: 75,

  apiBaseUrl: {
    sandbox: "https://sandbox-quickbooks.api.intuit.com",
    production: "https://quickbooks.api.intuit.com",
  } satisfies Record<QboEnvironment, string>,

  // Intuit's maximum page size for query results.
  queryPageSize: 1000,
  // Guards against a runaway loop. 50 pages is 50,000 records, far beyond this one company.
  maxQueryPages: 50,

  // Client-side staleTime for session-loaded reference data (accounts, vendors).
  referenceCacheTime: 15 * 60 * 1000,

  accessTokenRefreshMarginMs: 5 * 60 * 1000,
  // Covers one refresh round trip. If a request dies mid-refresh, the lock lapses on its own.
  refreshLockMs: 30 * 1000,
  refreshWaitMaxMs: 10 * 1000,
  refreshWaitPollMs: 250,

  requestTimeoutMs: 20 * 1000,
  // One entry per retry, so the array length is the retry limit. Only 429s are retried
  // for every method; network failures are retried for GET only (see qboHttp).
  rateLimitRetryDelaysMs: [1000, 2000] as number[],
  networkRetryDelaysMs: [500] as number[],
};
