import { QboFaultError } from "@/app/qbo/_lib/types/QboCommonTypes";
import { qboConst } from "@/app/qbo/_lib/qboConst";
import {
  NewQboApiLog,
  QboApiLogFaultError,
  QboApiLogKind,
  QboApiLogOutcome,
} from "@/app/qbo/apiLog/types/QboApiLogTypes";

// Pure helpers for the QBO API log, free of the database so they can be tested.

const REDACTED = "[redacted]";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Defense in depth: fault text is stored, and although Intuit does not echo credentials,
 * nothing shaped like one may reach the database. The main protection is that bodies and
 * headers are never stored at all.
 */
export function redact(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(/Basic\s+[A-Za-z0-9+/=]{8,}/gi, `Basic ${REDACTED}`)
    .replace(
      /(access_token|refresh_token|client_secret|client_id|authorization|token)(["']?\s*[:=]\s*["']?)[^\s"'&,}]+/gi,
      `$1$2${REDACTED}`,
    )
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, REDACTED)
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, REDACTED);
}

export function truncate({ text, maxLength }: { text: string; maxLength: number }): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
}

function cleanFaultText(text: string | undefined): string {
  return truncate({ text: redact(text ?? ""), maxLength: qboConst.apiLogMaxFaultTextLength });
}

/** Status 0 is how qboHttp and the OAuth calls report that no answer arrived. */
export function classifyOutcome(httpStatus: number): QboApiLogOutcome {
  if (httpStatus === 0) return "networkError";
  return httpStatus >= 200 && httpStatus < 300 ? "success" : "httpError";
}

/** Anything that is not a success is kept the longer failure period. */
export function retentionExpiry({
  outcome,
  now,
}: {
  outcome: QboApiLogOutcome;
  now: Date;
}): Date {
  const days =
    outcome === "success"
      ? qboConst.apiLogRetentionDays.success
      : qboConst.apiLogRetentionDays.failure;
  return new Date(now.getTime() + days * MS_PER_DAY);
}

export function cleanFaultErrors(faultErrors: QboFaultError[]): QboApiLogFaultError[] {
  return faultErrors.slice(0, qboConst.apiLogMaxFaultErrors).map((faultError) => ({
    code: cleanFaultText(String(faultError.code ?? "")),
    message: cleanFaultText(faultError.Message),
    detail: cleanFaultText(faultError.Detail),
    element: cleanFaultText(faultError.element),
  }));
}

export type QboApiLogInput = {
  logId: string;
  operation: string;
  kind: QboApiLogKind;
  method: "GET" | "POST";
  pathTemplate: string;
  realmId: string | null;
  httpStatus: number;
  intuitTid: string | null;
  durationMs: number;
  faultType: string | null;
  faultErrors: QboFaultError[];
  now: Date;
};

export function buildLogRecord({
  logId,
  operation,
  kind,
  method,
  pathTemplate,
  realmId,
  httpStatus,
  intuitTid,
  durationMs,
  faultType,
  faultErrors,
  now,
}: QboApiLogInput): NewQboApiLog {
  const outcome = classifyOutcome(httpStatus);
  return {
    logId,
    loggedAt: now.toISOString(),
    operation,
    kind,
    method,
    pathTemplate,
    realmId,
    httpStatus,
    outcome,
    intuitTid,
    durationMs: Math.max(0, Math.round(durationMs)),
    faultType: faultType === null ? null : cleanFaultText(faultType),
    faultErrors: cleanFaultErrors(faultErrors),
    expireAt: retentionExpiry({ outcome, now }),
  };
}
