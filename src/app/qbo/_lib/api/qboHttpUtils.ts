import { QboFaultError } from "@/app/qbo/_lib/types/QboCommonTypes";

// Pure helpers for qboHttp, kept free of fetch and the database so they can be tested.

type QboFaultBody = {
  Fault?: { Error?: QboFaultError[]; type?: string };
};

export function buildQboUrl({
  baseUrl,
  realmId,
  path,
  minorVersion,
}: {
  baseUrl: string;
  realmId: string;
  path: string;
  minorVersion: number;
}): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${baseUrl}/v3/company/${realmId}${path}${separator}minorversion=${minorVersion}`;
}

/** `where` is optional and must already be valid Intuit query syntax. */
export function buildSelectStatement({
  entity,
  where,
  startPosition,
  maxResults,
}: {
  entity: string;
  where?: string;
  startPosition: number;
  maxResults: number;
}): string {
  const whereClause = where ? ` where ${where}` : "";
  return `select * from ${entity}${whereClause} startposition ${startPosition} maxresults ${maxResults}`;
}

/** A page shorter than the page size is the last one. */
export function pageIsLast({
  receivedCount,
  maxResults,
}: {
  receivedCount: number;
  maxResults: number;
}): boolean {
  return receivedCount < maxResults;
}

/** The first error is the one worth showing a user; the rest stay in the error's data. */
export function readFault(body: unknown): { type: string | null; errors: QboFaultError[] } | null {
  const fault = (body as QboFaultBody | null)?.Fault;
  if (!fault) return null;
  return {
    type: typeof fault.type === "string" ? fault.type : null,
    errors: Array.isArray(fault.Error) ? fault.Error : [],
  };
}

export function describeFault(fault: { errors: QboFaultError[] }): string | null {
  const first = fault.errors[0];
  if (!first) return null;
  return first.Detail ? `${first.Message}: ${first.Detail}` : first.Message;
}
