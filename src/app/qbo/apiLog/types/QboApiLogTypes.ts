import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type QboApiLogKind = "api" | "oauthToken" | "oauthRevoke";

/** `networkError` means no HTTP answer arrived (httpStatus 0), so the outcome at Intuit is unknown. */
export type QboApiLogOutcome = "success" | "httpError" | "networkError";

export type QboApiLogFaultError = {
  code: string;
  message: string;
  detail: string;
  element: string;
};

/**
 * One record per HTTP call to Intuit (accounting API, token and revoke), kept so a failure can
 * be quoted to Intuit support by `intuitTid`. Never holds tokens, Authorization headers, the
 * client secret, or request and response bodies. See "Logging" in planning/qboPlan.md.
 *
 * `expireAt` is a real Date, the one exception to the string-dates rule: Mongo's TTL index
 * only works on Date fields. It is set per outcome (see retentionExpiry).
 */
export type QboApiLogDoc = CreatedUpdated & {
  logId: string;
  loggedAt: string;
  /** The RPC op name, or the name of the bracket that made the call (such as oauthCallback). */
  operation: string;
  kind: QboApiLogKind;
  method: "GET" | "POST";
  pathTemplate: string;
  realmId: string | null;
  httpStatus: number;
  outcome: QboApiLogOutcome;
  intuitTid: string | null;
  durationMs: number;
  /** Intuit's Fault type, or the OAuth `error` code for token calls. */
  faultType: string | null;
  faultErrors: QboApiLogFaultError[];
  expireAt: Date;
};

/** A record before Mongo adds createdAt and updatedAt. */
export type NewQboApiLog = Omit<QboApiLogDoc, keyof CreatedUpdated>;
