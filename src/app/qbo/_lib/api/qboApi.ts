import { qboHttp } from "@/app/qbo/_lib/api/qboHttp";

// Typed registry of the QuickBooks endpoints we call, like rgApi for RealGreen. Paths are
// relative to /v3/company/<realmId>, which qboHttp adds. Only add an endpoint when a module
// needs it. The read-before-write agreement in planning/qboPlan.md means no write endpoints
// are registered until the write phase starts.
export type QboApiPath = {
  path: `/query?query=${string}`;
  method: "GET";
  body?: undefined;
  pathTemplate: "/query";
};

// This should only be used from within a local api route.
export async function qboApi<T>(config: QboApiPath) {
  return qboHttp<T>(config);
}

/** Intuit's query language needs the statement URL-encoded inside the path. */
export function qboQueryPath(select: string): QboApiPath["path"] {
  return `/query?query=${encodeURIComponent(select)}`;
}
