import { QboEnvironment } from "@/app/qbo/connection/types/QboConnectionTypes";

export const qboConst = {
  // Pinned so Intuit's response shapes cannot change under us. Decided: 75, the version the
  // reference pages were written against. Raise it only on purpose, then recheck the types.
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

  // How long an API log record is kept. Failures live longer because they are the ones
  // someone may need to quote to Intuit support. Proposed in qboPlan.md, confirmed by the user.
  apiLogRetentionDays: { success: 90, failure: 365 },
  // Fault text can name real vendors or amounts, so stored copies are cut short.
  apiLogMaxFaultErrors: 5,
  apiLogMaxFaultTextLength: 300,

  // The widest date range a purchase load may cover. Keeps the browser payload reasonable.
  purchaseMaxRangeDays: 366,

  requestTimeoutMs: 20 * 1000,
  // One entry per retry, so the array length is the retry limit. Only 429s are retried
  // for every method; network failures are retried for GET only (see qboHttp).
  rateLimitRetryDelaysMs: [1000, 2000] as number[],
  networkRetryDelaysMs: [500] as number[],
};
